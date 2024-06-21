import type { Op } from 'quill-delta';
import Delta, { AttributeMap } from 'quill-delta';
import { choose, randomInt, runFuzz } from './__helpers__/utils.js';
import { AlignClass } from '../../src/formats/align.js';
import { FontClass } from '../../src/formats/font.js';
import { SizeClass } from '../../src/formats/size.js';
import Quill from '../../src/quill.js';
import { describe, expect, test } from 'vitest';

type AttributeDef = { name: string; values: (number | string | boolean)[] };
const BLOCK_EMBED_NAME = 'video';
const INLINE_EMBED_NAME = 'image';

const attributeDefs: {
  text: AttributeDef[];
  newline: AttributeDef[];
  inlineEmbed: AttributeDef[];
  blockEmbed: AttributeDef[];
} = {
  text: [
    { name: 'color', values: ['#ffffff', '#000000', '#ff0000', '#ffff00'] },
    { name: 'bold', values: [true] },
    { name: 'code', values: [true] },
    // @ts-expect-error
    { name: 'font', values: FontClass.whitelist },
    // @ts-expect-error
    { name: 'size', values: SizeClass.whitelist },
  ],
  newline: [
    // @ts-expect-error
    { name: 'align', values: AlignClass.whitelist },
    { name: 'header', values: [1, 2, 3, 4, 5] },
    { name: 'blockquote', values: [true] },
    { name: 'list', values: ['ordered', 'bullet', 'checked', 'unchecked'] },
  ],
  inlineEmbed: [
    { name: 'width', values: ['100', '200', '300'] },
    { name: 'height', values: ['100', '200', '300'] },
  ],
  blockEmbed: [
    { name: 'align', values: ['center', 'right'] },
    { name: 'width', values: ['100', '200', '300'] },
    { name: 'height', values: ['100', '200', '300'] },
  ],
};

const isLineFinished = (delta: Delta) => {
  const lastOp = delta.ops[delta.ops.length - 1];
  if (!lastOp) return false;
  if (typeof lastOp.insert === 'string') {
    return lastOp.insert.endsWith('\n');
  }
  if (typeof lastOp.insert === 'object') {
    const key = Object.keys(lastOp.insert)[0];
    return key === BLOCK_EMBED_NAME;
  }
  throw new Error('invalid op');
};

const generateAttributes = (scope: keyof typeof attributeDefs) => {
  const attributeCount =
    scope === 'newline'
      ? // Some block-level formats are exclusive so we only pick one for now for simplicity
        choose([0, 0, 1])
      : choose([0, 0, 0, 0, 0, 1, 2, 3, 4]);
  const attributes: AttributeMap = {};
  for (let i = 0; i < attributeCount; i += 1) {
    const def = choose(attributeDefs[scope]);
    attributes[def.name] = choose(def.values);
  }
  return attributes;
};

const generateRandomText = () => {
  return choose([
    'hi',
    'world',
    'Slab',
    ' ',
    'this is a long text that contains spaces',
  ]);
};

type SingleInsertValue =
  | string
  | { [INLINE_EMBED_NAME]: string }
  | { [BLOCK_EMBED_NAME]: string };

const generateSingleInsertDelta = (): Delta['ops'][number] & {
  insert: SingleInsertValue;
} => {
  const operation = choose<keyof typeof attributeDefs>([
    'text',
    'text',
    'text',
    'newline',
    'inlineEmbed',
    'blockEmbed',
  ]);

  let insert: SingleInsertValue;
  switch (operation) {
    case 'text':
      insert = generateRandomText();
      break;
    case 'newline':
      insert = '\n';
      break;
    case 'inlineEmbed':
      insert = { [INLINE_EMBED_NAME]: 'https://example.com' };
      break;
    case 'blockEmbed': {
      insert = { [BLOCK_EMBED_NAME]: 'https://example.com' };
      break;
    }
  }

  const attributes = generateAttributes(operation);
  const op: Op & { insert: SingleInsertValue } = { insert };
  if (Object.keys(attributes).length) {
    op.attributes = attributes;
  }
  return op;
};

const safePushInsert = (delta: Delta, isDoc: boolean) => {
  const op = generateSingleInsertDelta();
  if (
    typeof op.insert === 'object' &&
    op.insert[BLOCK_EMBED_NAME] &&
    (!isDoc || (delta.ops.length && !isLineFinished(delta)))
  ) {
    delta.insert('\n');
  }
  delta.push(op);
};

const generateDocument = () => {
  const delta = new Delta();
  const operationCount = 2 + randomInt(20);
  for (let i = 0; i < operationCount; i += 1) {
    safePushInsert(delta, true);
  }
  if (!isLineFinished(delta)) {
    delta.insert('\n');
  }
  return delta;
};

const generateChange = (
  doc: Delta,
  changeCount: number,
  allowedActions = ['insert', 'delete', 'retain'],
): Delta => {
  const docLength = doc.length();
  const skipLength = allowedActions.includes('retain')
    ? randomInt(docLength)
    : 0;
  let change = new Delta().retain(skipLength);
  const action = choose(allowedActions);
  const nextOp = doc.slice(skipLength).ops[0];
  if (!nextOp) throw new Error('nextOp expected');
  const needNewline = !isLineFinished(doc.slice(0, skipLength));
  switch (action) {
    case 'insert': {
      const delta = new Delta();
      const operationCount = randomInt(5) + 1;
      for (let i = 0; i < operationCount; i += 1) {
        safePushInsert(delta, false);
      }
      if (
        needNewline ||
        (typeof nextOp.insert === 'object' && !!nextOp.insert[BLOCK_EMBED_NAME])
      ) {
        delta.insert('\n');
      }
      change = change.concat(delta);
      break;
    }
    case 'delete': {
      const lengthToDelete = randomInt(docLength - skipLength - 1) + 1;
      const nextOpAfterDelete = doc.slice(skipLength + lengthToDelete).ops[0];
      if (
        needNewline &&
        (!nextOpAfterDelete ||
          (typeof nextOpAfterDelete.insert === 'object' &&
            !!nextOpAfterDelete.insert[BLOCK_EMBED_NAME]))
      ) {
        change.insert('\n');
      }
      change.delete(lengthToDelete);
      break;
    }
    case 'retain': {
      const retainLength =
        typeof nextOp.insert === 'string'
          ? randomInt(nextOp.insert.length - 1) + 1
          : 1;
      if (typeof nextOp.insert === 'string') {
        if (
          nextOp.insert.includes('\n') &&
          nextOp.insert.replace(/\n/g, '').length
        ) {
          break;
        }
        if (nextOp.insert.includes('\n')) {
          change.retain(
            retainLength,
            AttributeMap.diff(nextOp.attributes, generateAttributes('newline')),
          );
        } else {
          change.retain(
            retainLength,
            AttributeMap.diff(nextOp.attributes, generateAttributes('text')),
          );
        }
        break;
      }
      break;
    }
  }
  changeCount -= 1;
  return changeCount <= 0
    ? change
    : change.compose(
        generateChange(doc.compose(change), changeCount, allowedActions),
      );
};

describe('editor', () => {
  test('setContents()', () => {
    runFuzz(() => {
      const quill = new Quill(document.createElement('div'));
      const delta = generateDocument();

      expect(delta.concat(new Delta().delete(1))).toEqual(
        quill.setContents(delta),
      );
    });
  });

  test('updateContents()', () => {
    runFuzz(() => {
      const quill = new Quill(document.createElement('div'));
      const delta = generateDocument();
      quill.setContents(delta);

      for (let i = 0; i < 800; i += 1) {
        const doc = quill.getContents();
        const change = generateChange(doc, randomInt(4) + 1);
        const diff = quill.updateContents(change);
        expect(change.chop()).toEqual(diff);
      }
    });
  });

  test('insertContents() vs applyDelta()', () => {
    const quill1 = new Quill(document.createElement('div'));
    const quill2 = new Quill(document.createElement('div'));

    runFuzz(() => {
      const delta = generateDocument();
      quill1.setContents(delta);
      quill2.setContents(delta);

      const retain = randomInt(delta.length());
      const change = generateChange(delta, randomInt(20) + 1, ['insert']);

      quill1.editor.insertContents(retain, change);
      quill2.editor.applyDelta(new Delta().retain(retain).concat(change));

      const contents1 = quill1.getContents().ops;
      const contents2 = quill2.getContents().ops;

      expect(contents1).toEqual(contents2);
    });
  });
});
