import type { ScrollBlot } from 'parchment';
import {
  Attributor,
  BlockBlot,
  ClassAttributor,
  EmbedBlot,
  Scope,
  StyleAttributor,
} from 'parchment';
import Delta from 'quill-delta';
import { BlockEmbed } from '../blots/block.js';
import type { EmitterSource } from '../core/emitter.js';
import logger from '../core/logger.js';
import Module from '../core/module.js';
import Quill from '../core/quill.js';
import type { Range } from '../core/selection.js';
import { AlignAttribute, AlignStyle } from '../formats/align.js';
import { BackgroundStyle } from '../formats/background.js';
import CodeBlock from '../formats/code.js';
import { ColorStyle } from '../formats/color.js';
import { DirectionAttribute, DirectionStyle } from '../formats/direction.js';
import { FontStyle } from '../formats/font.js';
import { SizeStyle } from '../formats/size.js';
import { deleteRange } from './keyboard.js';
import normalizeExternalHTML from './normalizeExternalHTML/index.js';

const debug = logger('quill:clipboard');

type TextSelector = Node['TEXT_NODE'];
type ElementSelector = string | Node['ELEMENT_NODE'];
type Selector = TextSelector | ElementSelector;

type TextMatcher = (node: Text, delta: Delta, scroll: ScrollBlot) => Delta;
type ElementMatcher = (
  node: Element,
  delta: Delta,
  scroll: ScrollBlot,
) => Delta;
type Matcher = TextMatcher | ElementMatcher;

type MatcherConfig =
  | [TextSelector, TextMatcher]
  | [ElementSelector, ElementMatcher];

const CLIPBOARD_CONFIG: MatcherConfig[] = [
  [Node.TEXT_NODE, matchText],
  [Node.TEXT_NODE, matchNewline],
  ['br', matchBreak],
  [Node.ELEMENT_NODE, matchNewline],
  [Node.ELEMENT_NODE, matchBlot],
  [Node.ELEMENT_NODE, matchAttributor],
  [Node.ELEMENT_NODE, matchStyles],
  ['li', matchIndent],
  ['ol, ul', matchList],
  ['pre', matchCodeBlock],
  ['tr', matchTable],
  ['b', createMatchAlias('bold')],
  ['i', createMatchAlias('italic')],
  ['strike', createMatchAlias('strike')],
  ['style', matchIgnore],
];

const ATTRIBUTE_ATTRIBUTORS = [AlignAttribute, DirectionAttribute].reduce(
  (memo: Record<string, Attributor>, attr) => {
    memo[attr.keyName] = attr;
    return memo;
  },
  {},
);

const STYLE_ATTRIBUTORS = [
  AlignStyle,
  BackgroundStyle,
  ColorStyle,
  DirectionStyle,
  FontStyle,
  SizeStyle,
].reduce((memo: Record<string, Attributor>, attr) => {
  memo[attr.keyName] = attr;
  return memo;
}, {});

interface ClipboardOptions {
  matchers: MatcherConfig[];
}

class Clipboard extends Module<ClipboardOptions> {
  static DEFAULTS: ClipboardOptions = {
    matchers: [],
  };

  matchers: MatcherConfig[];

  constructor(quill: Quill, options: Partial<ClipboardOptions>) {
    super(quill, options);
    this.quill.root.addEventListener('copy', (e) =>
      this.onCaptureCopy(e, false),
    );
    this.quill.root.addEventListener('cut', (e) => this.onCaptureCopy(e, true));
    this.quill.root.addEventListener('paste', this.onCapturePaste.bind(this));
    this.matchers = [];
    CLIPBOARD_CONFIG.concat(this.options.matchers ?? []).forEach((config) => {
      this.matchers.push(config);
    });
  }

  addMatcher(selector: TextSelector, matcher: TextMatcher): void;
  addMatcher(selector: ElementSelector, matcher: ElementMatcher): void;
  addMatcher(selector: Selector, matcher: Matcher): void {
    this.matchers.push([selector, matcher] as MatcherConfig);
  }

  convert(
    { html, text }: { html?: string; text?: string },
    formats: Record<string, unknown> = {},
  ) {
    if (formats[CodeBlock.blotName]) {
      return new Delta().insert(text || '', {
        [CodeBlock.blotName]: formats[CodeBlock.blotName],
      });
    }
    if (!html) {
      return new Delta().insert(text || '', formats);
    }
    const delta = this.convertHTML(html);
    // Remove trailing newline
    if (
      deltaEndsWith(delta, '\n') &&
      (delta.ops[delta.ops.length - 1].attributes == null || formats.table)
    ) {
      return delta.compose(new Delta().retain(delta.length() - 1).delete(1));
    }
    return delta;
  }

  protected normalizeHTML(doc: Document) {
    normalizeExternalHTML(doc);
  }

  protected convertHTML(html: string) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    this.normalizeHTML(doc);
    const container = doc.body;
    const queryMatches = new WeakMap<Element, ElementMatcher[]>();
    const [elementMatchers, textMatchers] = this.prepareMatching(
      container,
      queryMatches,
    );
    return traverse(
      this.quill.scroll,
      container,
      elementMatchers,
      textMatchers,
      queryMatches,
    );
  }

  dangerouslyPasteHTML(html: string, source?: EmitterSource): void;
  dangerouslyPasteHTML(
    index: number,
    html: string,
    source?: EmitterSource,
  ): void;
  dangerouslyPasteHTML(
    index: number | string,
    html?: string,
    source: EmitterSource = Quill.sources.API,
  ) {
    if (typeof index === 'string') {
      const delta = this.convert({ html: index, text: '' });
      // @ts-expect-error
      this.quill.setContents(delta, html);
      this.quill.setSelection(0, Quill.sources.SILENT);
    } else {
      const paste = this.convert({ html, text: '' });
      this.quill.updateContents(
        new Delta().retain(index).concat(paste),
        source,
      );
      this.quill.setSelection(index + paste.length(), Quill.sources.SILENT);
    }
  }

  onCaptureCopy(e: ClipboardEvent, isCut = false) {
    if (e.defaultPrevented) return;
    e.preventDefault();
    const [range] = this.quill.selection.getRange();
    if (range == null) return;
    const { html, text } = this.onCopy(range, isCut);
    e.clipboardData?.setData('text/plain', text);
    e.clipboardData?.setData('text/html', html);
    if (isCut) {
      deleteRange({ range, quill: this.quill });
    }
  }

  /*
   * https://www.iana.org/assignments/media-types/text/uri-list
   */
  private normalizeURIList(urlList: string) {
    return (
      urlList
        .split(/\r?\n/)
        // Ignore all comments
        .filter((url) => url[0] !== '#')
        .join('\n')
    );
  }

  onCapturePaste(e: ClipboardEvent) {
    if (e.defaultPrevented || !this.quill.isEnabled()) return;
    e.preventDefault();
    const range = this.quill.getSelection(true);
    if (range == null) return;
    const html = e.clipboardData?.getData('text/html');
    let text = e.clipboardData?.getData('text/plain');
    if (!html && !text) {
      const urlList = e.clipboardData?.getData('text/uri-list');
      if (urlList) {
        text = this.normalizeURIList(urlList);
      }
    }
    const files = Array.from(e.clipboardData?.files || []);
    if (!html && files.length > 0) {
      this.quill.uploader.upload(range, files);
      return;
    }
    if (html && files.length > 0) {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      if (
        doc.body.childElementCount === 1 &&
        doc.body.firstElementChild?.tagName === 'IMG'
      ) {
        this.quill.uploader.upload(range, files);
        return;
      }
    }
    this.onPaste(range, { html, text });
  }

  onCopy(range: Range, isCut: boolean): { html: string; text: string };
  onCopy(range: Range) {
    const text = this.quill.getText(range);
    const html = this.quill.getSemanticHTML(range);
    return { html, text };
  }

  onPaste(range: Range, { text, html }: { text?: string; html?: string }) {
    const formats = this.quill.getFormat(range.index);
    const pastedDelta = this.convert({ text, html }, formats);
    debug.log('onPaste', pastedDelta, { text, html });
    const delta = new Delta()
      .retain(range.index)
      .delete(range.length)
      .concat(pastedDelta);
    this.quill.updateContents(delta, Quill.sources.USER);
    // range.length contributes to delta.length()
    this.quill.setSelection(
      delta.length() - range.length,
      Quill.sources.SILENT,
    );
    this.quill.scrollSelectionIntoView();
  }

  prepareMatching(
    container: Element,
    queryMatches: WeakMap<Element, ElementMatcher[]>,
  ): [elementMatchers: ElementMatcher[], textMatchers: TextMatcher[]] {
    const elementMatchers: ElementMatcher[] = [];
    const textMatchers: TextMatcher[] = [];
    this.matchers.forEach((pair) => {
      const [selector, matcher] = pair;
      switch (selector) {
        case Node.TEXT_NODE:
          textMatchers.push(matcher);
          break;
        case Node.ELEMENT_NODE:
          elementMatchers.push(matcher);
          break;
        default:
          Array.from(container.querySelectorAll(selector)).forEach((node) => {
            if (queryMatches.has(node)) {
              const matches = queryMatches.get(node);
              matches?.push(matcher);
            } else {
              queryMatches.set(node, [matcher]);
            }
          });
          break;
      }
    });
    return [elementMatchers, textMatchers];
  }
}

function applyFormat(
  delta: Delta,
  format: string,
  value: unknown,
  scroll: ScrollBlot,
): Delta {
  if (!scroll.query(format)) {
    return delta;
  }

  return delta.reduce((newDelta, op) => {
    if (!op.insert) return newDelta;
    if (op.attributes && op.attributes[format]) {
      return newDelta.push(op);
    }
    const formats = value ? { [format]: value } : {};
    return newDelta.insert(op.insert, { ...formats, ...op.attributes });
  }, new Delta());
}

function deltaEndsWith(delta: Delta, text: string) {
  let endText = '';
  for (
    let i = delta.ops.length - 1;
    i >= 0 && endText.length < text.length;
    --i // eslint-disable-line no-plusplus
  ) {
    const op = delta.ops[i];
    if (typeof op.insert !== 'string') break;
    endText = op.insert + endText;
  }
  return endText.slice(-1 * text.length) === text;
}

function isLine(node: Node, scroll: ScrollBlot) {
  if (!(node instanceof Element)) return false;
  const match = scroll.query(node);
  // @ts-expect-error
  if (match && match.prototype instanceof EmbedBlot) return false;

  return [
    'address',
    'article',
    'blockquote',
    'canvas',
    'dd',
    'div',
    'dl',
    'dt',
    'fieldset',
    'figcaption',
    'figure',
    'footer',
    'form',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'header',
    'iframe',
    'li',
    'main',
    'nav',
    'ol',
    'output',
    'p',
    'pre',
    'section',
    'table',
    'td',
    'tr',
    'ul',
    'video',
  ].includes(node.tagName.toLowerCase());
}

function isBetweenInlineElements(node: Text | Element, scroll: ScrollBlot) {
  return (
    node.previousElementSibling &&
    node.nextElementSibling &&
    !isLine(node.previousElementSibling, scroll) &&
    !isLine(node.nextElementSibling, scroll)
  );
}

const preNodes = new WeakMap<Node, boolean>();
function isPre(node: Node | null): node is HTMLPreElement {
  if (node == null) return false;
  if (!preNodes.has(node)) {
    if (isElement(node) && node.tagName === 'PRE') {
      preNodes.set(node, true);
    } else {
      preNodes.set(node, isPre(node.parentNode));
    }
  }
  return !!preNodes.get(node);
}

function isText(node: Node): node is Text {
  return node.nodeType === node.TEXT_NODE;
}

function isElement(node: Node): node is Element {
  return node.nodeType === node.ELEMENT_NODE;
}

function traverse(
  scroll: ScrollBlot,
  node: ChildNode,
  elementMatchers: ElementMatcher[],
  textMatchers: TextMatcher[],
  queryMatches: WeakMap<Element, ElementMatcher[]>,
): Delta {
  // Post-order
  if (isText(node)) {
    return textMatchers.reduce((delta: Delta, matcher) => {
      return matcher(node, delta, scroll);
    }, new Delta());
  }
  if (isElement(node)) {
    return Array.from(node.childNodes || []).reduce((delta, childNode) => {
      let childrenDelta = traverse(
        scroll,
        childNode,
        elementMatchers,
        textMatchers,
        queryMatches,
      );
      if (isElement(childNode)) {
        childrenDelta = elementMatchers.reduce((reducedDelta, matcher) => {
          return matcher(childNode, reducedDelta, scroll);
        }, childrenDelta);
        childrenDelta = (queryMatches.get(childNode) || []).reduce(
          (reducedDelta, matcher) => {
            return matcher(childNode, reducedDelta, scroll);
          },
          childrenDelta,
        );
      }
      return delta.concat(childrenDelta);
    }, new Delta());
  }
  return new Delta();
}

function createMatchAlias(format: string) {
  return (_node: Element, delta: Delta, scroll: ScrollBlot) => {
    return applyFormat(delta, format, true, scroll);
  };
}

function matchAttributor(node: HTMLElement, delta: Delta, scroll: ScrollBlot) {
  const attributes = Attributor.keys(node);
  const classes = ClassAttributor.keys(node);
  const styles = StyleAttributor.keys(node);
  const formats: Record<string, string | undefined> = {};
  attributes
    .concat(classes)
    .concat(styles)
    .forEach((name) => {
      let attr = scroll.query(name, Scope.ATTRIBUTE) as Attributor;
      if (attr != null) {
        formats[attr.attrName] = attr.value(node);
        if (formats[attr.attrName]) return;
      }
      attr = ATTRIBUTE_ATTRIBUTORS[name];
      if (attr != null && (attr.attrName === name || attr.keyName === name)) {
        formats[attr.attrName] = attr.value(node) || undefined;
      }
      attr = STYLE_ATTRIBUTORS[name];
      if (attr != null && (attr.attrName === name || attr.keyName === name)) {
        attr = STYLE_ATTRIBUTORS[name];
        formats[attr.attrName] = attr.value(node) || undefined;
      }
    });

  return Object.entries(formats).reduce(
    (newDelta, [name, value]) => applyFormat(newDelta, name, value, scroll),
    delta,
  );
}

function matchBlot(node: Element, delta: Delta, scroll: ScrollBlot) {
  const match = scroll.query(node);
  if (match == null) return delta;
  // @ts-expect-error
  if (match.prototype instanceof EmbedBlot) {
    const embed = {};
    // @ts-expect-error
    const value = match.value(node);
    if (value != null) {
      // @ts-expect-error
      embed[match.blotName] = value;
      // @ts-expect-error
      return new Delta().insert(embed, match.formats(node, scroll));
    }
  } else {
    // @ts-expect-error
    if (match.prototype instanceof BlockBlot && !deltaEndsWith(delta, '\n')) {
      delta.insert('\n');
    }
    if (
      'blotName' in match &&
      'formats' in match &&
      typeof match.formats === 'function'
    ) {
      return applyFormat(
        delta,
        match.blotName,
        match.formats(node, scroll),
        scroll,
      );
    }
  }
  return delta;
}

function matchBreak(node: Node, delta: Delta) {
  if (!deltaEndsWith(delta, '\n')) {
    delta.insert('\n');
  }
  return delta;
}

function matchCodeBlock(node: Node, delta: Delta, scroll: ScrollBlot) {
  const match = scroll.query('code-block');
  const language =
    match && 'formats' in match && typeof match.formats === 'function'
      ? match.formats(node, scroll)
      : true;
  return applyFormat(delta, 'code-block', language, scroll);
}

function matchIgnore() {
  return new Delta();
}

function matchIndent(node: Node, delta: Delta, scroll: ScrollBlot) {
  const match = scroll.query(node);
  if (
    match == null ||
    // @ts-expect-error
    match.blotName !== 'list' ||
    !deltaEndsWith(delta, '\n')
  ) {
    return delta;
  }
  let indent = -1;
  let parent = node.parentNode;
  while (parent != null) {
    if (isElement(parent) && ['OL', 'UL'].includes(parent.tagName)) {
      indent += 1;
    }
    parent = parent.parentNode;
  }
  if (indent <= 0) return delta;
  return delta.reduce((composed, op) => {
    if (!op.insert) return composed;
    if (op.attributes && typeof op.attributes.indent === 'number') {
      return composed.push(op);
    }
    return composed.insert(op.insert, { indent, ...(op.attributes || {}) });
  }, new Delta());
}

function matchList(node: Element, delta: Delta, scroll: ScrollBlot) {
  let list = node.tagName === 'OL' ? 'ordered' : 'bullet';

  const checkedAttr = node.getAttribute('data-checked');
  if (checkedAttr) {
    list = checkedAttr === 'true' ? 'checked' : 'unchecked';
  }

  return applyFormat(delta, 'list', list, scroll);
}

function matchNewline(node: Text | Element, delta: Delta, scroll: ScrollBlot) {
  if (!deltaEndsWith(delta, '\n')) {
    if (
      isLine(node, scroll) &&
      (node.childNodes.length > 0 || node instanceof HTMLParagraphElement)
    ) {
      return delta.insert('\n');
    }
    if (delta.length() > 0 && node.nextSibling) {
      let nextSibling: Node | null = node.nextSibling;
      while (nextSibling != null) {
        if (isLine(nextSibling, scroll)) {
          return delta.insert('\n');
        }
        const match = scroll.query(nextSibling);
        // @ts-expect-error
        if (match && match.prototype instanceof BlockEmbed) {
          return delta.insert('\n');
        }
        nextSibling = nextSibling.firstChild;
      }
    }
  }
  return delta;
}

function matchStyles(node: HTMLElement, delta: Delta, scroll: ScrollBlot) {
  const formats: Record<string, unknown> = {};
  const style: Partial<CSSStyleDeclaration> = node.style || {};
  if (style.fontStyle === 'italic') {
    formats.italic = true;
  }
  if (style.textDecoration === 'underline') {
    formats.underline = true;
  }
  if (style.textDecoration === 'line-through') {
    formats.strike = true;
  }
  if (
    style.fontWeight?.startsWith('bold') ||
    // @ts-expect-error Fix me later
    parseInt(style.fontWeight, 10) >= 700
  ) {
    formats.bold = true;
  }
  delta = Object.entries(formats).reduce(
    (newDelta, [name, value]) => applyFormat(newDelta, name, value, scroll),
    delta,
  );
  // @ts-expect-error
  if (parseFloat(style.textIndent || 0) > 0) {
    // Could be 0.5in
    return new Delta().insert('\t').concat(delta);
  }
  return delta;
}

function matchTable(
  node: HTMLTableRowElement,
  delta: Delta,
  scroll: ScrollBlot,
) {
  const table =
    node.parentElement?.tagName === 'TABLE'
      ? node.parentElement
      : node.parentElement?.parentElement;
  if (table != null) {
    const rows = Array.from(table.querySelectorAll('tr'));
    const row = rows.indexOf(node) + 1;
    return applyFormat(delta, 'table', row, scroll);
  }
  return delta;
}

function matchText(node: Text, delta: Delta, scroll: ScrollBlot) {
  let text = node.data;
  // Word represents empty line with <o:p>&nbsp;</o:p>
  if (node.parentElement?.tagName === 'O:P') {
    return delta.insert(text.trim());
  }
  if (!isPre(node)) {
    if (
      text.trim().length === 0 &&
      text.includes('\n') &&
      !isBetweenInlineElements(node, scroll)
    ) {
      return delta;
    }
    const replacer = (collapse: unknown, match: string) => {
      const replaced = match.replace(/[^\u00a0]/g, ''); // \u00a0 is nbsp;
      return replaced.length < 1 && collapse ? ' ' : replaced;
    };
    text = text.replace(/\r\n/g, ' ').replace(/\n/g, ' ');
    text = text.replace(/\s\s+/g, replacer.bind(replacer, true)); // collapse whitespace
    if (
      (node.previousSibling == null &&
        node.parentElement != null &&
        isLine(node.parentElement, scroll)) ||
      (node.previousSibling instanceof Element &&
        isLine(node.previousSibling, scroll))
    ) {
      text = text.replace(/^\s+/, replacer.bind(replacer, false));
    }
    if (
      (node.nextSibling == null &&
        node.parentElement != null &&
        isLine(node.parentElement, scroll)) ||
      (node.nextSibling instanceof Element && isLine(node.nextSibling, scroll))
    ) {
      text = text.replace(/\s+$/, replacer.bind(replacer, false));
    }
  }
  return delta.insert(text);
}

export {
  Clipboard as default,
  matchAttributor,
  matchBlot,
  matchNewline,
  matchText,
  traverse,
};
