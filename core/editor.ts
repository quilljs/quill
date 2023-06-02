import cloneDeep from 'lodash.clonedeep';
import isEqual from 'lodash.isequal';
import merge from 'lodash.merge';
import { LeafBlot, EmbedBlot, Scope } from 'parchment';
import Delta, { AttributeMap, Op } from 'quill-delta';
import Block, { BlockEmbed, bubbleFormats } from '../blots/block';
import Break from '../blots/break';
import CursorBlot from '../blots/cursor';
import Scroll from '../blots/scroll';
import TextBlot, { escapeText } from '../blots/text';
import { Range } from '../modules/selection';

const ASCII = /^[ -~]*$/;

class Editor {
  scroll: Scroll;
  delta: Delta;

  constructor(scroll: Scroll) {
    this.scroll = scroll;
    this.delta = this.getDelta();
  }

  applyDelta(delta: Delta): Delta {
    this.scroll.update();
    let scrollLength = this.scroll.length();
    this.scroll.batchStart();
    const normalizedDelta = normalizeDelta(delta);
    const deleteDelta = new Delta();
    normalizedDelta.reduce((index, op) => {
      const length = Op.length(op);
      let attributes = op.attributes || {};
      let isImplicitNewlinePrepended = false;
      let isImplicitNewlineAppended = false;
      if (op.insert != null) {
        deleteDelta.retain(length);
        if (typeof op.insert === 'string') {
          const text = op.insert;
          isImplicitNewlineAppended =
            !text.endsWith('\n') &&
            (scrollLength <= index ||
              // @ts-expect-error
              !!this.scroll.descendant(BlockEmbed, index)[0]);
          this.scroll.insertAt(index, text);
          const [line, offset] = this.scroll.line(index);
          let formats = merge({}, bubbleFormats(line));
          if (line instanceof Block) {
            // @ts-expect-error
            const [leaf] = line.descendant(LeafBlot, offset);
            formats = merge(formats, bubbleFormats(leaf));
          }
          attributes = AttributeMap.diff(formats, attributes) || {};
        } else if (typeof op.insert === 'object') {
          const key = Object.keys(op.insert)[0]; // There should only be one key
          if (key == null) return index;
          const isInlineEmbed = this.scroll.query(key, Scope.INLINE) != null;
          if (isInlineEmbed) {
            if (
              scrollLength <= index ||
              // @ts-expect-error
              !!this.scroll.descendant(BlockEmbed, index)[0]
            ) {
              isImplicitNewlineAppended = true;
            }
            const [leaf] = this.scroll.leaf(index);
            const formats = merge({}, bubbleFormats(leaf));
            attributes = AttributeMap.diff(formats, attributes) || {};
          } else if (index > 0) {
            // @ts-expect-error
            const [leaf, offset] = this.scroll.descendant(LeafBlot, index - 1);
            if (leaf instanceof TextBlot) {
              const text = leaf.value();
              if (text[offset] !== '\n') {
                isImplicitNewlinePrepended = true;
              }
            } else if (
              leaf instanceof EmbedBlot &&
              leaf.statics.scope === Scope.INLINE_BLOT
            ) {
              isImplicitNewlinePrepended = true;
            }
          }
          this.scroll.insertAt(index, key, op.insert[key]);
        }
        scrollLength += length;
      } else {
        deleteDelta.push(op);

        if (op.retain !== null && typeof op.retain === 'object') {
          const key = Object.keys(op.retain)[0];
          if (key == null) return index;
          this.scroll.updateEmbedAt(index, key, op.retain[key]);
        }
      }
      Object.keys(attributes).forEach(name => {
        this.scroll.formatAt(index, length, name, attributes[name]);
      });
      const prependedLength = isImplicitNewlinePrepended ? 1 : 0;
      const addedLength = isImplicitNewlineAppended ? 1 : 0;
      scrollLength += prependedLength + addedLength;
      deleteDelta.retain(prependedLength);
      deleteDelta.delete(addedLength);
      return index + length + prependedLength + addedLength;
    }, 0);
    deleteDelta.reduce((index, op) => {
      if (typeof op.delete === 'number') {
        this.scroll.deleteAt(index, op.delete);
        return index;
      }
      return index + Op.length(op);
    }, 0);
    this.scroll.batchEnd();
    this.scroll.optimize();
    return this.update(normalizedDelta);
  }

  deleteText(index: number, length: number): Delta {
    this.scroll.deleteAt(index, length);
    return this.update(new Delta().retain(index).delete(length));
  }

  formatLine(
    index: number,
    length: number,
    formats: Record<string, unknown> = {},
  ): Delta {
    this.scroll.update();
    Object.keys(formats).forEach(format => {
      this.scroll.lines(index, Math.max(length, 1)).forEach(line => {
        line.format(format, formats[format]);
      });
    });
    this.scroll.optimize();
    const delta = new Delta().retain(index).retain(length, cloneDeep(formats));
    return this.update(delta);
  }

  formatText(
    index: number,
    length: number,
    formats: Record<string, unknown> = {},
  ): Delta {
    Object.keys(formats).forEach(format => {
      this.scroll.formatAt(index, length, format, formats[format]);
    });
    const delta = new Delta().retain(index).retain(length, cloneDeep(formats));
    return this.update(delta);
  }

  getContents(index: number, length: number): Delta {
    return this.delta.slice(index, index + length);
  }

  getDelta(): Delta {
    return this.scroll.lines().reduce((delta, line) => {
      return delta.concat(line.delta());
    }, new Delta());
  }

  getFormat(index: number, length = 0): Record<string, unknown> {
    let lines = [];
    let leaves = [];
    if (length === 0) {
      this.scroll.path(index).forEach(path => {
        const [blot] = path;
        if (blot instanceof Block) {
          lines.push(blot);
        } else if (blot instanceof LeafBlot) {
          leaves.push(blot);
        }
      });
    } else {
      lines = this.scroll.lines(index, length);
      // @ts-expect-error
      leaves = this.scroll.descendants(LeafBlot, index, length);
    }
    [lines, leaves] = [lines, leaves].map(blots => {
      if (blots.length === 0) return {};
      let formats = bubbleFormats(blots.shift());
      while (Object.keys(formats).length > 0) {
        const blot = blots.shift();
        if (blot == null) return formats;
        formats = combineFormats(bubbleFormats(blot), formats);
      }
      return formats;
    });
    return { ...lines, ...leaves };
  }

  getHTML(index: number, length: number): string {
    const [line, lineOffset] = this.scroll.line(index);
    if (line.length() >= lineOffset + length) {
      return convertHTML(line, lineOffset, length, true);
    }
    return convertHTML(this.scroll, index, length, true);
  }

  getText(index: number, length: number): string {
    return this.getContents(index, length)
      .filter(op => typeof op.insert === 'string')
      .map(op => op.insert)
      .join('');
  }

  insertEmbed(index: number, embed: string, value: unknown): Delta {
    this.scroll.insertAt(index, embed, value);
    return this.update(new Delta().retain(index).insert({ [embed]: value }));
  }

  insertText(
    index: number,
    text: string,
    formats: Record<string, unknown> = {},
  ): Delta {
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    this.scroll.insertAt(index, text);
    Object.keys(formats).forEach(format => {
      this.scroll.formatAt(index, text.length, format, formats[format]);
    });
    return this.update(
      new Delta().retain(index).insert(text, cloneDeep(formats)),
    );
  }

  isBlank(): boolean {
    if (this.scroll.children.length === 0) return true;
    if (this.scroll.children.length > 1) return false;
    const blot = this.scroll.children.head;
    if (blot.statics.blotName !== Block.blotName) return false;
    const block = blot as Block;
    if (block.children.length > 1) return false;
    return block.children.head instanceof Break;
  }

  removeFormat(index: number, length: number): Delta {
    const text = this.getText(index, length);
    const [line, offset] = this.scroll.line(index + length);
    let suffixLength = 0;
    let suffix = new Delta();
    if (line != null) {
      suffixLength = line.length() - offset;
      suffix = line
        .delta()
        .slice(offset, offset + suffixLength - 1)
        .insert('\n');
    }
    const contents = this.getContents(index, length + suffixLength);
    const diff = contents.diff(new Delta().insert(text).concat(suffix));
    const delta = new Delta().retain(index).concat(diff);
    return this.applyDelta(delta);
  }

  update(change: Delta, mutations = [], selectionInfo = undefined): Delta {
    const oldDelta = this.delta;
    if (
      mutations.length === 1 &&
      mutations[0].type === 'characterData' &&
      mutations[0].target.data.match(ASCII) &&
      this.scroll.find(mutations[0].target)
    ) {
      // Optimization for character changes
      const textBlot = this.scroll.find(mutations[0].target);
      const formats = bubbleFormats(textBlot);
      const index = textBlot.offset(this.scroll);
      const oldValue = mutations[0].oldValue.replace(CursorBlot.CONTENTS, '');
      const oldText = new Delta().insert(oldValue);
      // @ts-expect-error
      const newText = new Delta().insert(textBlot.value());
      const relativeSelectionInfo = selectionInfo && {
        oldRange: shiftRange(selectionInfo.oldRange, -index),
        newRange: shiftRange(selectionInfo.newRange, -index),
      };
      const diffDelta = new Delta()
        .retain(index)
        .concat(oldText.diff(newText, relativeSelectionInfo));
      change = diffDelta.reduce((delta, op) => {
        if (op.insert) {
          return delta.insert(op.insert, formats);
        }
        return delta.push(op);
      }, new Delta());
      this.delta = oldDelta.compose(change);
    } else {
      this.delta = this.getDelta();
      if (!change || !isEqual(oldDelta.compose(change), this.delta)) {
        change = oldDelta.diff(this.delta, selectionInfo);
      }
    }
    return change;
  }
}

function convertListHTML(items, lastIndent, types) {
  if (items.length === 0) {
    const [endTag] = getListType(types.pop());
    if (lastIndent <= 0) {
      return `</li></${endTag}>`;
    }
    return `</li></${endTag}>${convertListHTML([], lastIndent - 1, types)}`;
  }
  const [{ child, offset, length, indent, type }, ...rest] = items;
  const [tag, attribute] = getListType(type);
  if (indent > lastIndent) {
    types.push(type);
    if (indent === lastIndent + 1) {
      return `<${tag}><li${attribute}>${convertHTML(
        child,
        offset,
        length,
      )}${convertListHTML(rest, indent, types)}`;
    }
    return `<${tag}><li>${convertListHTML(items, lastIndent + 1, types)}`;
  }
  const previousType = types[types.length - 1];
  if (indent === lastIndent && type === previousType) {
    return `</li><li${attribute}>${convertHTML(
      child,
      offset,
      length,
    )}${convertListHTML(rest, indent, types)}`;
  }
  const [endTag] = getListType(types.pop());
  return `</li></${endTag}>${convertListHTML(items, lastIndent - 1, types)}`;
}

function convertHTML(blot, index, length, isRoot = false) {
  if (typeof blot.html === 'function') {
    return blot.html(index, length);
  }
  if (blot instanceof TextBlot) {
    return escapeText(blot.value().slice(index, index + length));
  }
  if (blot.children) {
    // TODO fix API
    if (blot.statics.blotName === 'list-container') {
      const items = [];
      blot.children.forEachAt(index, length, (child, offset, childLength) => {
        const formats = child.formats();
        items.push({
          child,
          offset,
          length: childLength,
          indent: formats.indent || 0,
          type: formats.list,
        });
      });
      return convertListHTML(items, -1, []);
    }
    const parts = [];
    blot.children.forEachAt(index, length, (child, offset, childLength) => {
      parts.push(convertHTML(child, offset, childLength));
    });
    if (isRoot || blot.statics.blotName === 'list') {
      return parts.join('');
    }
    const { outerHTML, innerHTML } = blot.domNode;
    const [start, end] = outerHTML.split(`>${innerHTML}<`);
    // TODO cleanup
    if (start === '<table') {
      return `<table style="border: 1px solid #000;">${parts.join('')}<${end}`;
    }
    return `${start}>${parts.join('')}<${end}`;
  }
  return blot.domNode.outerHTML;
}

function combineFormats(formats, combined) {
  return Object.keys(combined).reduce((merged, name) => {
    if (formats[name] == null) return merged;
    if (combined[name] === formats[name]) {
      merged[name] = combined[name];
    } else if (Array.isArray(combined[name])) {
      if (combined[name].indexOf(formats[name]) < 0) {
        merged[name] = combined[name].concat([formats[name]]);
      } else {
        // If style already exists, don't add to an array, but don't lose other styles
        merged[name] = combined[name];
      }
    } else {
      merged[name] = [combined[name], formats[name]];
    }
    return merged;
  }, {});
}

function getListType(type) {
  const tag = type === 'ordered' ? 'ol' : 'ul';
  switch (type) {
    case 'checked':
      return [tag, ' data-list="checked"'];
    case 'unchecked':
      return [tag, ' data-list="unchecked"'];
    default:
      return [tag, ''];
  }
}

function normalizeDelta(delta: Delta) {
  return delta.reduce((normalizedDelta, op) => {
    if (typeof op.insert === 'string') {
      const text = op.insert.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      return normalizedDelta.insert(text, op.attributes);
    }
    return normalizedDelta.push(op);
  }, new Delta());
}

function shiftRange(
  { index, length }: { index: number; length: number },
  amount: number,
) {
  return new Range(index + amount, length);
}

export default Editor;
