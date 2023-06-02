import cloneDeep from 'lodash.clonedeep';
import isEqual from 'lodash.isequal';
import Delta, { AttributeMap } from 'quill-delta';
import { BlockBlot, EmbedBlot, Scope, TextBlot } from 'parchment';
import Quill from '../core/quill';
import logger from '../core/logger';
import Module from '../core/module';
import { BlockEmbed } from '../blots/block';
import { Range } from '../modules/selection';

const debug = logger('quill:keyboard');

const SHORTKEY = /Mac/i.test(navigator.platform) ? 'metaKey' : 'ctrlKey';

interface Context {
  collapsed: boolean;
  empty: boolean;
  offset: number;
  prefix: string;
  suffix: string;
  format: Record<string, unknown>;
  event: KeyboardEvent;
  line: BlockEmbed | BlockBlot;
}

interface BindingObject
  extends Partial<Omit<Context, 'prefix' | 'suffix' | 'format'>> {
  key: number | string | string[];
  shortKey?: boolean | null;
  shiftKey?: boolean | null;
  altKey?: boolean | null;
  metaKey?: boolean | null;
  ctrlKey?: boolean | null;
  prefix?: RegExp;
  suffix?: RegExp;
  format?: Record<string, unknown> | string[];
  handler?: (
    this: { quill: Quill },
    range: Range,
    curContext: Context,
    // eslint-disable-next-line no-use-before-define
    binding: NormalizedBinding,
  ) => boolean | void;
}

type Binding = BindingObject | string | number;

interface NormalizedBinding extends Omit<BindingObject, 'key' | 'shortKey'> {
  key: string | number;
}

interface KeyboardOptions {
  bindings: Record<string, Binding>;
}

interface KeyboardOptions {
  bindings: Record<string, Binding>;
}

class Keyboard extends Module<KeyboardOptions> {
  static match(evt: KeyboardEvent, binding) {
    if (
      ['altKey', 'ctrlKey', 'metaKey', 'shiftKey'].some(key => {
        return !!binding[key] !== evt[key] && binding[key] !== null;
      })
    ) {
      return false;
    }
    return binding.key === evt.key || binding.key === evt.which;
  }

  bindings: Record<string, NormalizedBinding[]>;

  constructor(quill: Quill, options: Partial<KeyboardOptions>) {
    super(quill, options);
    this.bindings = {};
    Object.keys(this.options.bindings).forEach(name => {
      if (this.options.bindings[name]) {
        this.addBinding(this.options.bindings[name]);
      }
    });
    this.addBinding({ key: 'Enter', shiftKey: null }, this.handleEnter);
    this.addBinding(
      { key: 'Enter', metaKey: null, ctrlKey: null, altKey: null },
      () => {},
    );
    if (/Firefox/i.test(navigator.userAgent)) {
      // Need to handle delete and backspace for Firefox in the general case #1171
      this.addBinding(
        { key: 'Backspace' },
        { collapsed: true },
        this.handleBackspace,
      );
      this.addBinding(
        { key: 'Delete' },
        { collapsed: true },
        this.handleDelete,
      );
    } else {
      this.addBinding(
        { key: 'Backspace' },
        { collapsed: true, prefix: /^.?$/ },
        this.handleBackspace,
      );
      this.addBinding(
        { key: 'Delete' },
        { collapsed: true, suffix: /^.?$/ },
        this.handleDelete,
      );
    }
    this.addBinding(
      { key: 'Backspace' },
      { collapsed: false },
      this.handleDeleteRange,
    );
    this.addBinding(
      { key: 'Delete' },
      { collapsed: false },
      this.handleDeleteRange,
    );
    this.addBinding(
      {
        key: 'Backspace',
        altKey: null,
        ctrlKey: null,
        metaKey: null,
        shiftKey: null,
      },
      { collapsed: true, offset: 0 },
      this.handleBackspace,
    );
    this.listen();
  }

  addBinding(
    keyBinding: Binding,
    context:
      | Required<BindingObject['handler']>
      | Partial<Omit<BindingObject, 'key' | 'handler'>> = {},
    handler:
      | Required<BindingObject['handler']>
      | Partial<Omit<BindingObject, 'key' | 'handler'>> = {},
  ) {
    const binding = normalize(keyBinding);
    if (binding == null) {
      debug.warn('Attempted to add invalid keyboard binding', binding);
      return;
    }
    if (typeof context === 'function') {
      context = { handler: context };
    }
    if (typeof handler === 'function') {
      handler = { handler };
    }
    const keys = Array.isArray(binding.key) ? binding.key : [binding.key];
    keys.forEach(key => {
      const singleBinding = {
        ...binding,
        key,
        ...context,
        ...handler,
      };
      this.bindings[singleBinding.key] = this.bindings[singleBinding.key] || [];
      this.bindings[singleBinding.key].push(singleBinding);
    });
  }

  listen() {
    this.quill.root.addEventListener('keydown', evt => {
      if (evt.defaultPrevented || evt.isComposing) return;
      const bindings = (this.bindings[evt.key] || []).concat(
        this.bindings[evt.which] || [],
      );
      const matches = bindings.filter(binding => Keyboard.match(evt, binding));
      if (matches.length === 0) return;
      // @ts-expect-error
      const blot = Quill.find(evt.target, true);
      if (blot && blot.scroll !== this.quill.scroll) return;
      const range = this.quill.getSelection();
      if (range == null || !this.quill.hasFocus()) return;
      const [line, offset] = this.quill.getLine(range.index);
      const [leafStart, offsetStart] = this.quill.getLeaf(range.index);
      const [leafEnd, offsetEnd] =
        range.length === 0
          ? [leafStart, offsetStart]
          : this.quill.getLeaf(range.index + range.length);
      const prefixText =
        leafStart instanceof TextBlot
          ? leafStart.value().slice(0, offsetStart)
          : '';
      const suffixText =
        leafEnd instanceof TextBlot ? leafEnd.value().slice(offsetEnd) : '';
      const curContext = {
        collapsed: range.length === 0,
        empty: range.length === 0 && line.length() <= 1,
        format: this.quill.getFormat(range),
        line,
        offset,
        prefix: prefixText,
        suffix: suffixText,
        event: evt,
      };
      const prevented = matches.some(binding => {
        if (
          binding.collapsed != null &&
          binding.collapsed !== curContext.collapsed
        ) {
          return false;
        }
        if (binding.empty != null && binding.empty !== curContext.empty) {
          return false;
        }
        if (binding.offset != null && binding.offset !== curContext.offset) {
          return false;
        }
        if (Array.isArray(binding.format)) {
          // any format is present
          if (binding.format.every(name => curContext.format[name] == null)) {
            return false;
          }
        } else if (typeof binding.format === 'object') {
          // all formats must match
          if (
            !Object.keys(binding.format).every(name => {
              if (binding.format[name] === true)
                return curContext.format[name] != null;
              if (binding.format[name] === false)
                return curContext.format[name] == null;
              return isEqual(binding.format[name], curContext.format[name]);
            })
          ) {
            return false;
          }
        }
        if (binding.prefix != null && !binding.prefix.test(curContext.prefix)) {
          return false;
        }
        if (binding.suffix != null && !binding.suffix.test(curContext.suffix)) {
          return false;
        }
        return binding.handler.call(this, range, curContext, binding) !== true;
      });
      if (prevented) {
        evt.preventDefault();
      }
    });
  }

  handleBackspace(range: Range, context: Context) {
    // Check for astral symbols
    const length = /[\uD800-\uDBFF][\uDC00-\uDFFF]$/.test(context.prefix)
      ? 2
      : 1;
    if (range.index === 0 || this.quill.getLength() <= 1) return;
    let formats = {};
    const [line] = this.quill.getLine(range.index);
    let delta = new Delta().retain(range.index - length).delete(length);
    if (context.offset === 0) {
      // Always deleting newline here, length always 1
      const [prev] = this.quill.getLine(range.index - 1);
      if (prev) {
        const isPrevLineEmpty =
          prev.statics.blotName === 'block' && prev.length() <= 1;
        if (!isPrevLineEmpty) {
          const curFormats = line.formats();
          const prevFormats = this.quill.getFormat(range.index - 1, 1);
          formats = AttributeMap.diff(curFormats, prevFormats) || {};
          if (Object.keys(formats).length > 0) {
            // line.length() - 1 targets \n in line, another -1 for newline being deleted
            const formatDelta = new Delta()
              .retain(range.index + line.length() - 2)
              .retain(1, formats);
            delta = delta.compose(formatDelta);
          }
        }
      }
    }
    this.quill.updateContents(delta, Quill.sources.USER);
    this.quill.focus();
  }

  handleDelete(range: Range, context: Context) {
    // Check for astral symbols
    const length = /^[\uD800-\uDBFF][\uDC00-\uDFFF]/.test(context.suffix)
      ? 2
      : 1;
    if (range.index >= this.quill.getLength() - length) return;
    let formats = {};
    const [line] = this.quill.getLine(range.index);
    let delta = new Delta().retain(range.index).delete(length);
    if (context.offset >= line.length() - 1) {
      const [next] = this.quill.getLine(range.index + 1);
      if (next) {
        const curFormats = line.formats();
        const nextFormats = this.quill.getFormat(range.index, 1);
        formats = AttributeMap.diff(curFormats, nextFormats) || {};
        if (Object.keys(formats).length > 0) {
          delta = delta.retain(next.length() - 1).retain(1, formats);
        }
      }
    }
    this.quill.updateContents(delta, Quill.sources.USER);
    this.quill.focus();
  }

  handleDeleteRange(range: Range) {
    deleteRange({ range, quill: this.quill });
    this.quill.focus();
  }

  handleEnter(range: Range, context: Context) {
    const lineFormats = Object.keys(context.format).reduce(
      (formats, format) => {
        if (
          this.quill.scroll.query(format, Scope.BLOCK) &&
          !Array.isArray(context.format[format])
        ) {
          formats[format] = context.format[format];
        }
        return formats;
      },
      {},
    );
    const delta = new Delta()
      .retain(range.index)
      .delete(range.length)
      .insert('\n', lineFormats);
    this.quill.updateContents(delta, Quill.sources.USER);
    this.quill.setSelection(range.index + 1, Quill.sources.SILENT);
    this.quill.focus();
  }
}

const defaultOptions: KeyboardOptions = {
  bindings: {
    bold: makeFormatHandler('bold'),
    italic: makeFormatHandler('italic'),
    underline: makeFormatHandler('underline'),
    indent: {
      // highlight tab or tab at beginning of list, indent or blockquote
      key: 'Tab',
      format: ['blockquote', 'indent', 'list'],
      handler(range, context) {
        if (context.collapsed && context.offset !== 0) return true;
        this.quill.format('indent', '+1', Quill.sources.USER);
        return false;
      },
    },
    outdent: {
      key: 'Tab',
      shiftKey: true,
      format: ['blockquote', 'indent', 'list'],
      // highlight tab or tab at beginning of list, indent or blockquote
      handler(range, context) {
        if (context.collapsed && context.offset !== 0) return true;
        this.quill.format('indent', '-1', Quill.sources.USER);
        return false;
      },
    },
    'outdent backspace': {
      key: 'Backspace',
      collapsed: true,
      shiftKey: null,
      metaKey: null,
      ctrlKey: null,
      altKey: null,
      format: ['indent', 'list'],
      offset: 0,
      handler(range, context) {
        if (context.format.indent != null) {
          this.quill.format('indent', '-1', Quill.sources.USER);
        } else if (context.format.list != null) {
          this.quill.format('list', false, Quill.sources.USER);
        }
      },
    },
    'indent code-block': makeCodeBlockHandler(true),
    'outdent code-block': makeCodeBlockHandler(false),
    'remove tab': {
      key: 'Tab',
      shiftKey: true,
      collapsed: true,
      prefix: /\t$/,
      handler(range) {
        this.quill.deleteText(range.index - 1, 1, Quill.sources.USER);
      },
    },
    tab: {
      key: 'Tab',
      handler(range, context) {
        if (context.format.table) return true;
        this.quill.history.cutoff();
        const delta = new Delta()
          .retain(range.index)
          .delete(range.length)
          .insert('\t');
        this.quill.updateContents(delta, Quill.sources.USER);
        this.quill.history.cutoff();
        this.quill.setSelection(range.index + 1, Quill.sources.SILENT);
        return false;
      },
    },
    'blockquote empty enter': {
      key: 'Enter',
      collapsed: true,
      format: ['blockquote'],
      empty: true,
      handler() {
        this.quill.format('blockquote', false, Quill.sources.USER);
      },
    },
    'list empty enter': {
      key: 'Enter',
      collapsed: true,
      format: ['list'],
      empty: true,
      handler(range, context) {
        const formats: Record<string, unknown> = { list: false };
        if (context.format.indent) {
          formats.indent = false;
        }
        this.quill.formatLine(
          range.index,
          range.length,
          formats,
          Quill.sources.USER,
        );
      },
    },
    'checklist enter': {
      key: 'Enter',
      collapsed: true,
      format: { list: 'checked' },
      handler(range) {
        const [line, offset] = this.quill.getLine(range.index);
        const formats = {
          ...line.formats(),
          list: 'checked',
        };
        const delta = new Delta()
          .retain(range.index)
          .insert('\n', formats)
          .retain(line.length() - offset - 1)
          .retain(1, { list: 'unchecked' });
        this.quill.updateContents(delta, Quill.sources.USER);
        this.quill.setSelection(range.index + 1, Quill.sources.SILENT);
        this.quill.scrollIntoView();
      },
    },
    'header enter': {
      key: 'Enter',
      collapsed: true,
      format: ['header'],
      suffix: /^$/,
      handler(range, context) {
        const [line, offset] = this.quill.getLine(range.index);
        const delta = new Delta()
          .retain(range.index)
          .insert('\n', context.format)
          .retain(line.length() - offset - 1)
          .retain(1, { header: null });
        this.quill.updateContents(delta, Quill.sources.USER);
        this.quill.setSelection(range.index + 1, Quill.sources.SILENT);
        this.quill.scrollIntoView();
      },
    },
    'table backspace': {
      key: 'Backspace',
      format: ['table'],
      collapsed: true,
      offset: 0,
      handler() {},
    },
    'table delete': {
      key: 'Delete',
      format: ['table'],
      collapsed: true,
      suffix: /^$/,
      handler() {},
    },
    'table enter': {
      key: 'Enter',
      shiftKey: null,
      format: ['table'],
      handler(range) {
        const module = this.quill.getModule('table');
        if (module) {
          // @ts-expect-error
          const [table, row, cell, offset] = module.getTable(range);
          const shift = tableSide(table, row, cell, offset);
          if (shift == null) return;
          let index = table.offset();
          if (shift < 0) {
            const delta = new Delta().retain(index).insert('\n');
            this.quill.updateContents(delta, Quill.sources.USER);
            this.quill.setSelection(
              range.index + 1,
              range.length,
              Quill.sources.SILENT,
            );
          } else if (shift > 0) {
            index += table.length();
            const delta = new Delta().retain(index).insert('\n');
            this.quill.updateContents(delta, Quill.sources.USER);
            this.quill.setSelection(index, Quill.sources.USER);
          }
        }
      },
    },
    'table tab': {
      key: 'Tab',
      shiftKey: null,
      format: ['table'],
      handler(range, context) {
        const { event, line: cell } = context;
        const offset = cell.offset(this.quill.scroll);
        if (event.shiftKey) {
          this.quill.setSelection(offset - 1, Quill.sources.USER);
        } else {
          this.quill.setSelection(offset + cell.length(), Quill.sources.USER);
        }
      },
    },
    'list autofill': {
      key: ' ',
      shiftKey: null,
      collapsed: true,
      format: {
        'code-block': false,
        blockquote: false,
        table: false,
      },
      prefix: /^\s*?(\d+\.|-|\*|\[ ?\]|\[x\])$/,
      handler(range, context) {
        if (this.quill.scroll.query('list') == null) return true;
        const { length } = context.prefix;
        const [line, offset] = this.quill.getLine(range.index);
        if (offset > length) return true;
        let value;
        switch (context.prefix.trim()) {
          case '[]':
          case '[ ]':
            value = 'unchecked';
            break;
          case '[x]':
            value = 'checked';
            break;
          case '-':
          case '*':
            value = 'bullet';
            break;
          default:
            value = 'ordered';
        }
        this.quill.insertText(range.index, ' ', Quill.sources.USER);
        this.quill.history.cutoff();
        const delta = new Delta()
          .retain(range.index - offset)
          .delete(length + 1)
          .retain(line.length() - 2 - offset)
          .retain(1, { list: value });
        this.quill.updateContents(delta, Quill.sources.USER);
        this.quill.history.cutoff();
        this.quill.setSelection(range.index - length, Quill.sources.SILENT);
        return false;
      },
    },
    'code exit': {
      key: 'Enter',
      collapsed: true,
      format: ['code-block'],
      prefix: /^$/,
      suffix: /^\s*$/,
      handler(range) {
        const [line, offset] = this.quill.getLine(range.index);
        let numLines = 2;
        let cur = line;
        while (
          cur != null &&
          cur.length() <= 1 &&
          cur.formats()['code-block']
        ) {
          // @ts-expect-error
          cur = cur.prev;
          numLines -= 1;
          // Requisite prev lines are empty
          if (numLines <= 0) {
            const delta = new Delta()
              .retain(range.index + line.length() - offset - 2)
              .retain(1, { 'code-block': null })
              .delete(1);
            this.quill.updateContents(delta, Quill.sources.USER);
            this.quill.setSelection(range.index - 1, Quill.sources.SILENT);
            return false;
          }
        }
        return true;
      },
    },
    'embed left': makeEmbedArrowHandler('ArrowLeft', false),
    'embed left shift': makeEmbedArrowHandler('ArrowLeft', true),
    'embed right': makeEmbedArrowHandler('ArrowRight', false),
    'embed right shift': makeEmbedArrowHandler('ArrowRight', true),
    'table down': makeTableArrowHandler(false),
    'table up': makeTableArrowHandler(true),
  },
};

Keyboard.DEFAULTS = defaultOptions;

function makeCodeBlockHandler(indent: boolean): BindingObject {
  return {
    key: 'Tab',
    shiftKey: !indent,
    format: { 'code-block': true },
    handler(range, { event }) {
      const CodeBlock = this.quill.scroll.query('code-block');
      // @ts-expect-error
      const { TAB } = CodeBlock;
      if (range.length === 0 && !event.shiftKey) {
        this.quill.insertText(range.index, TAB, Quill.sources.USER);
        this.quill.setSelection(range.index + TAB.length, Quill.sources.SILENT);
        return;
      }

      const lines =
        range.length === 0
          ? this.quill.getLines(range.index, 1)
          : this.quill.getLines(range);
      let { index, length } = range;
      lines.forEach((line, i) => {
        if (indent) {
          line.insertAt(0, TAB);
          if (i === 0) {
            index += TAB.length;
          } else {
            length += TAB.length;
          }
        } else if (line.domNode.textContent.startsWith(TAB)) {
          line.deleteAt(0, TAB.length);
          if (i === 0) {
            index -= TAB.length;
          } else {
            length -= TAB.length;
          }
        }
      });
      this.quill.update(Quill.sources.USER);
      this.quill.setSelection(index, length, Quill.sources.SILENT);
    },
  };
}

function makeEmbedArrowHandler(
  key: string,
  shiftKey: boolean | null,
): BindingObject {
  const where = key === 'ArrowLeft' ? 'prefix' : 'suffix';
  return {
    key,
    shiftKey,
    altKey: null,
    [where]: /^$/,
    handler(range) {
      let { index } = range;
      if (key === 'ArrowRight') {
        index += range.length + 1;
      }
      const [leaf] = this.quill.getLeaf(index);
      if (!(leaf instanceof EmbedBlot)) return true;
      if (key === 'ArrowLeft') {
        if (shiftKey) {
          this.quill.setSelection(
            range.index - 1,
            range.length + 1,
            Quill.sources.USER,
          );
        } else {
          this.quill.setSelection(range.index - 1, Quill.sources.USER);
        }
      } else if (shiftKey) {
        this.quill.setSelection(
          range.index,
          range.length + 1,
          Quill.sources.USER,
        );
      } else {
        this.quill.setSelection(
          range.index + range.length + 1,
          Quill.sources.USER,
        );
      }
      return false;
    },
  };
}

function makeFormatHandler(format: string): BindingObject {
  return {
    key: format[0],
    shortKey: true,
    handler(range, context) {
      this.quill.format(format, !context.format[format], Quill.sources.USER);
    },
  };
}

function makeTableArrowHandler(up: boolean): BindingObject {
  return {
    key: up ? 'ArrowUp' : 'ArrowDown',
    collapsed: true,
    format: ['table'],
    handler(range, context) {
      // TODO move to table module
      const key = up ? 'prev' : 'next';
      const cell = context.line;
      const targetRow = cell.parent[key];
      if (targetRow != null) {
        if (targetRow.statics.blotName === 'table-row') {
          // @ts-expect-error
          let targetCell = targetRow.children.head;
          let cur = cell;
          while (cur.prev != null) {
            // @ts-expect-error
            cur = cur.prev;
            targetCell = targetCell.next;
          }
          const index =
            targetCell.offset(this.quill.scroll) +
            Math.min(context.offset, targetCell.length() - 1);
          this.quill.setSelection(index, 0, Quill.sources.USER);
        }
      } else {
        // @ts-expect-error
        const targetLine = cell.table()[key];
        if (targetLine != null) {
          if (up) {
            this.quill.setSelection(
              targetLine.offset(this.quill.scroll) + targetLine.length() - 1,
              0,
              Quill.sources.USER,
            );
          } else {
            this.quill.setSelection(
              targetLine.offset(this.quill.scroll),
              0,
              Quill.sources.USER,
            );
          }
        }
      }
      return false;
    },
  };
}

function normalize(binding: Binding): BindingObject {
  if (typeof binding === 'string' || typeof binding === 'number') {
    binding = { key: binding };
  } else if (typeof binding === 'object') {
    binding = cloneDeep(binding);
  } else {
    return null;
  }
  if (binding.shortKey) {
    binding[SHORTKEY] = binding.shortKey;
    delete binding.shortKey;
  }
  return binding;
}

// TODO: Move into quill.ts or editor.ts
function deleteRange({ quill, range }: { quill: Quill; range: Range }) {
  const lines = quill.getLines(range);
  let formats = {};
  if (lines.length > 1) {
    const firstFormats = lines[0].formats();
    const lastFormats = lines[lines.length - 1].formats();
    formats = AttributeMap.diff(lastFormats, firstFormats) || {};
  }
  quill.deleteText(range, Quill.sources.USER);
  if (Object.keys(formats).length > 0) {
    quill.formatLine(range.index, 1, formats, Quill.sources.USER);
  }
  quill.setSelection(range.index, Quill.sources.SILENT);
}

function tableSide(table, row, cell, offset) {
  if (row.prev == null && row.next == null) {
    if (cell.prev == null && cell.next == null) {
      return offset === 0 ? -1 : 1;
    }
    return cell.prev == null ? -1 : 1;
  }
  if (row.prev == null) {
    return -1;
  }
  if (row.next == null) {
    return 1;
  }
  return null;
}

export { Keyboard as default, SHORTKEY, normalize, deleteRange };
