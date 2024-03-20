import { ContainerBlot, LeafBlot, Scope, ScrollBlot } from 'parchment';
import type { Blot, Parent, EmbedBlot, ParentBlot, Registry } from 'parchment';
import Delta, { AttributeMap, Op } from 'quill-delta';
import Emitter from '../core/emitter.js';
import type { EmitterSource } from '../core/emitter.js';
import Block, { BlockEmbed, bubbleFormats } from './block.js';
import Break from './break.js';
import Container from './container.js';

type RenderBlock =
  | {
      type: 'blockEmbed';
      attributes: AttributeMap;
      key: string;
      value: unknown;
    }
  | { type: 'block'; attributes: AttributeMap; delta: Delta };

function isLine(blot: unknown): blot is Block | BlockEmbed {
  return blot instanceof Block || blot instanceof BlockEmbed;
}

interface UpdatableEmbed {
  updateContent(change: unknown): void;
}

function isUpdatable(blot: Blot): blot is Blot & UpdatableEmbed {
  return typeof (blot as unknown as any).updateContent === 'function';
}

class Scroll extends ScrollBlot {
  static blotName = 'scroll';
  static className = 'ql-editor';
  static tagName = 'DIV';
  static defaultChild = Block;
  static allowedChildren = [Block, BlockEmbed, Container];

  emitter: Emitter;
  batch: false | MutationRecord[];

  constructor(
    registry: Registry,
    domNode: HTMLDivElement,
    { emitter }: { emitter: Emitter },
  ) {
    super(registry, domNode);
    this.emitter = emitter;
    this.batch = false;
    this.optimize();
    this.enable();
    this.domNode.addEventListener('dragstart', (e) => this.handleDragStart(e));
  }

  batchStart() {
    if (!Array.isArray(this.batch)) {
      this.batch = [];
    }
  }

  batchEnd() {
    if (!this.batch) return;
    const mutations = this.batch;
    this.batch = false;
    this.update(mutations);
  }

  emitMount(blot: Blot) {
    this.emitter.emit(Emitter.events.SCROLL_BLOT_MOUNT, blot);
  }

  emitUnmount(blot: Blot) {
    this.emitter.emit(Emitter.events.SCROLL_BLOT_UNMOUNT, blot);
  }

  emitEmbedUpdate(blot: Blot, change: unknown) {
    this.emitter.emit(Emitter.events.SCROLL_EMBED_UPDATE, blot, change);
  }

  deleteAt(index: number, length: number) {
    const [first, offset] = this.line(index);
    const [last] = this.line(index + length);
    super.deleteAt(index, length);
    if (last != null && first !== last && offset > 0) {
      if (first instanceof BlockEmbed || last instanceof BlockEmbed) {
        this.optimize();
        return;
      }
      const ref =
        last.children.head instanceof Break ? null : last.children.head;
      // @ts-expect-error
      first.moveChildren(last, ref);
      // @ts-expect-error
      first.remove();
    }
    this.optimize();
  }

  enable(enabled = true) {
    this.domNode.setAttribute('contenteditable', enabled ? 'true' : 'false');
  }

  formatAt(index: number, length: number, format: string, value: unknown) {
    super.formatAt(index, length, format, value);
    this.optimize();
  }

  insertAt(index: number, value: string, def?: unknown) {
    if (index >= this.length()) {
      if (def == null || this.scroll.query(value, Scope.BLOCK) == null) {
        const blot = this.scroll.create(this.statics.defaultChild.blotName);
        this.appendChild(blot);
        if (def == null && value.endsWith('\n')) {
          blot.insertAt(0, value.slice(0, -1), def);
        } else {
          blot.insertAt(0, value, def);
        }
      } else {
        const embed = this.scroll.create(value, def);
        this.appendChild(embed);
      }
    } else {
      super.insertAt(index, value, def);
    }
    this.optimize();
  }

  insertBefore(blot: Blot, ref?: Blot) {
    if (blot.statics.scope === Scope.INLINE_BLOT) {
      const wrapper = this.scroll.create(
        this.statics.defaultChild.blotName,
      ) as Parent;
      wrapper.appendChild(blot);
      super.insertBefore(wrapper, ref);
    } else {
      super.insertBefore(blot, ref);
    }
  }

  insertContents(index: number, delta: Delta) {
    const renderBlocks = this.deltaToRenderBlocks(
      delta.concat(new Delta().insert('\n')),
    );
    const last = renderBlocks.pop();
    if (last == null) return;

    this.batchStart();

    const first = renderBlocks.shift();
    if (first) {
      const shouldInsertNewlineChar =
        first.type === 'block' &&
        (first.delta.length() === 0 ||
          (!this.descendant(BlockEmbed, index)[0] && index < this.length()));
      const delta =
        first.type === 'block'
          ? first.delta
          : new Delta().insert({ [first.key]: first.value });
      insertInlineContents(this, index, delta);
      const newlineCharLength = first.type === 'block' ? 1 : 0;
      const lineEndIndex = index + delta.length() + newlineCharLength;
      if (shouldInsertNewlineChar) {
        this.insertAt(lineEndIndex - 1, '\n');
      }

      const formats = bubbleFormats(this.line(index)[0]);
      const attributes = AttributeMap.diff(formats, first.attributes) || {};
      Object.keys(attributes).forEach((name) => {
        this.formatAt(lineEndIndex - 1, 1, name, attributes[name]);
      });

      index = lineEndIndex;
    }

    let [refBlot, refBlotOffset] = this.children.find(index);
    if (renderBlocks.length) {
      if (refBlot) {
        refBlot = refBlot.split(refBlotOffset);
        refBlotOffset = 0;
      }

      renderBlocks.forEach((renderBlock) => {
        if (renderBlock.type === 'block') {
          const block = this.createBlock(
            renderBlock.attributes,
            refBlot || undefined,
          );
          insertInlineContents(block, 0, renderBlock.delta);
        } else {
          const blockEmbed = this.create(
            renderBlock.key,
            renderBlock.value,
          ) as EmbedBlot;
          this.insertBefore(blockEmbed, refBlot || undefined);
          Object.keys(renderBlock.attributes).forEach((name) => {
            blockEmbed.format(name, renderBlock.attributes[name]);
          });
        }
      });
    }

    if (last.type === 'block' && last.delta.length()) {
      const offset = refBlot
        ? refBlot.offset(refBlot.scroll) + refBlotOffset
        : this.length();
      insertInlineContents(this, offset, last.delta);
    }

    this.batchEnd();
    this.optimize();
  }

  isEnabled() {
    return this.domNode.getAttribute('contenteditable') === 'true';
  }

  leaf(index: number): [LeafBlot | null, number] {
    const last = this.path(index).pop();
    if (!last) {
      return [null, -1];
    }

    const [blot, offset] = last;
    return blot instanceof LeafBlot ? [blot, offset] : [null, -1];
  }

  line(index: number): [Block | BlockEmbed | null, number] {
    if (index === this.length()) {
      return this.line(index - 1);
    }
    // @ts-expect-error TODO: make descendant() generic
    return this.descendant(isLine, index);
  }

  lines(index = 0, length = Number.MAX_VALUE): (Block | BlockEmbed)[] {
    const getLines = (
      blot: ParentBlot,
      blotIndex: number,
      blotLength: number,
    ) => {
      let lines: (Block | BlockEmbed)[] = [];
      let lengthLeft = blotLength;
      blot.children.forEachAt(
        blotIndex,
        blotLength,
        (child, childIndex, childLength) => {
          if (isLine(child)) {
            lines.push(child);
          } else if (child instanceof ContainerBlot) {
            lines = lines.concat(getLines(child, childIndex, lengthLeft));
          }
          lengthLeft -= childLength;
        },
      );
      return lines;
    };
    return getLines(this, index, length);
  }

  optimize(context?: { [key: string]: any }): void;
  optimize(
    mutations?: MutationRecord[],
    context?: { [key: string]: any },
  ): void;
  optimize(mutations = [], context = {}) {
    if (this.batch) return;
    super.optimize(mutations, context);
    if (mutations.length > 0) {
      this.emitter.emit(Emitter.events.SCROLL_OPTIMIZE, mutations, context);
    }
  }

  path(index: number) {
    return super.path(index).slice(1); // Exclude self
  }

  remove() {
    // Never remove self
  }

  update(source?: EmitterSource): void;
  update(mutations?: MutationRecord[]): void;
  update(mutations?: MutationRecord[] | EmitterSource): void {
    if (this.batch) {
      if (Array.isArray(mutations)) {
        this.batch = this.batch.concat(mutations);
      }
      return;
    }
    let source: EmitterSource = Emitter.sources.USER;
    if (typeof mutations === 'string') {
      source = mutations;
    }
    if (!Array.isArray(mutations)) {
      mutations = this.observer.takeRecords();
    }
    mutations = mutations.filter(({ target }) => {
      const blot = this.find(target, true);
      return blot && !isUpdatable(blot);
    });
    if (mutations.length > 0) {
      this.emitter.emit(Emitter.events.SCROLL_BEFORE_UPDATE, source, mutations);
    }
    const context = {};
    super.update(mutations.concat([]), context); // pass copy
    if (mutations.length > 0) {
      this.emitter.emit(
        Emitter.events.SCROLL_UPDATE,
        source,
        mutations,
        context,
      );
    }
  }

  updateEmbedAt(index: number, key: string, change: unknown) {
    // Currently it only supports top-level embeds (BlockEmbed).
    // We can update `ParentBlot` in parchment to support inline embeds.
    const [blot] = this.descendant((b: Blot) => b instanceof BlockEmbed, index);
    if (blot && blot.statics.blotName === key && isUpdatable(blot)) {
      blot.updateContent(change);
    }
  }

  protected handleDragStart(event: DragEvent) {
    event.preventDefault();
  }

  private deltaToRenderBlocks(delta: Delta) {
    const renderBlocks: RenderBlock[] = [];

    let currentBlockDelta = new Delta();
    delta.forEach((op) => {
      const insert = op?.insert;
      if (!insert) return;
      if (typeof insert === 'string') {
        const splitted = insert.split('\n');
        splitted.slice(0, -1).forEach((text) => {
          currentBlockDelta.insert(text, op.attributes);
          renderBlocks.push({
            type: 'block',
            delta: currentBlockDelta,
            attributes: op.attributes ?? {},
          });
          currentBlockDelta = new Delta();
        });
        const last = splitted[splitted.length - 1];
        if (last) {
          currentBlockDelta.insert(last, op.attributes);
        }
      } else {
        const key = Object.keys(insert)[0];
        if (!key) return;
        if (this.query(key, Scope.INLINE)) {
          currentBlockDelta.push(op);
        } else {
          if (currentBlockDelta.length()) {
            renderBlocks.push({
              type: 'block',
              delta: currentBlockDelta,
              attributes: {},
            });
          }
          currentBlockDelta = new Delta();
          renderBlocks.push({
            type: 'blockEmbed',
            key,
            value: insert[key],
            attributes: op.attributes ?? {},
          });
        }
      }
    });

    if (currentBlockDelta.length()) {
      renderBlocks.push({
        type: 'block',
        delta: currentBlockDelta,
        attributes: {},
      });
    }

    return renderBlocks;
  }

  private createBlock(attributes: AttributeMap, refBlot?: Blot) {
    let blotName: string | undefined;
    const formats: AttributeMap = {};

    Object.entries(attributes).forEach(([key, value]) => {
      const isBlockBlot = this.query(key, Scope.BLOCK & Scope.BLOT) != null;
      if (isBlockBlot) {
        blotName = key;
      } else {
        formats[key] = value;
      }
    });

    const block = this.create(
      blotName || this.statics.defaultChild.blotName,
      blotName ? attributes[blotName] : undefined,
    ) as ParentBlot;

    this.insertBefore(block, refBlot || undefined);

    const length = block.length();
    Object.entries(formats).forEach(([key, value]) => {
      block.formatAt(0, length, key, value);
    });

    return block;
  }
}

function insertInlineContents(
  parent: ParentBlot,
  index: number,
  inlineContents: Delta,
) {
  inlineContents.reduce((index, op) => {
    const length = Op.length(op);
    let attributes = op.attributes || {};
    if (op.insert != null) {
      if (typeof op.insert === 'string') {
        const text = op.insert;
        parent.insertAt(index, text);
        const [leaf] = parent.descendant(LeafBlot, index);
        const formats = bubbleFormats(leaf);
        attributes = AttributeMap.diff(formats, attributes) || {};
      } else if (typeof op.insert === 'object') {
        const key = Object.keys(op.insert)[0]; // There should only be one key
        if (key == null) return index;
        parent.insertAt(index, key, op.insert[key]);
        const isInlineEmbed = parent.scroll.query(key, Scope.INLINE) != null;
        if (isInlineEmbed) {
          const [leaf] = parent.descendant(LeafBlot, index);
          const formats = bubbleFormats(leaf);
          attributes = AttributeMap.diff(formats, attributes) || {};
        }
      }
    }
    Object.keys(attributes).forEach((key) => {
      parent.formatAt(index, length, key, attributes[key]);
    });
    return index + length;
  }, index);
}

export default Scroll;
