import type { Page } from '@playwright/test';
import type Composition from '../fixtures/Composition.js';

interface Op {
  insert?: string | Record<string, unknown>;
  delete?: number;
  retain?: number | Record<string, unknown>;
  attributes?: Record<string, unknown>;
}

const getTextNodeDef = [
  'el',
  'match',
  `
  const walk = el.ownerDocument.createTreeWalker(
    el,
    NodeFilter.SHOW_TEXT,
    null,
    false,
  );
  if (!match) {
    return walk.nextNode();
  }

  let node;
  while ((node = walk.nextNode())) {
    if (node.wholeText.includes(match)) {
      return node;
    }
  }
  return null;
`,
];

// Return after a selection change event is triggered. The purpose is
// to simulate the actions of a real user, because in reality,
// users would not perform other actions before the selection event is triggered.
const updateSelectionDef = [
  'range',
  `
  return new Promise((resolve) => {
    document.addEventListener('selectionchange', () => {
      setTimeout(() => {
        resolve()
      }, 1); // wait for Quill to update the internal selection
    }, {
      once: true,
    });

    const selection = document.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
`,
];

export default class EditorPage {
  constructor(protected readonly page: Page) {}

  get root() {
    return this.page.locator('.ql-editor');
  }

  get cursorBlot() {
    return this.root.locator('.ql-cursor');
  }

  async open() {
    await this.page.goto('/');
    await this.page.waitForSelector('.ql-editor', { timeout: 10000 });
  }

  async html(content: string, title = '') {
    await this.page.evaluate((html) => {
      // @ts-expect-error
      const contents = window.quill.clipboard.convert({ html, text: '\n' });
      // @ts-expect-error
      return window.quill.setContents(contents);
    }, `<p>${title}</p>${content}`);
  }

  getSelection() {
    return this.page.evaluate(() => {
      // @ts-expect-error
      return window.quill.getSelection();
    });
  }

  async setSelection(index: number, length: number): Promise<void>;
  async setSelection(range: { index: number; length: number }): Promise<void>;
  async setSelection(
    range: { index: number; length: number } | number,
    length?: number,
  ) {
    await this.page.evaluate(
      // @ts-expect-error
      (range) => window.quill.setSelection(range),
      typeof range === 'number' ? { index: range, length: length || 0 } : range,
    );
  }

  async typeWordWithIME(composition: Composition, composedWord: string) {
    const ime = await composition.start();
    await ime.update('w');
    await ime.update('o');
    await ime.commit(composedWord);
  }

  async cutoffHistory() {
    await this.page.evaluate(() => {
      // @ts-expect-error
      window.quill.history.cutoff();
    });
  }

  async updateContents(delta: Op[], source: 'api' | 'user' = 'api') {
    await this.page.evaluate(
      ({ delta, source }) => {
        // @ts-expect-error
        window.quill.updateContents(delta, source);
      },
      { delta, source },
    );
  }

  async setContents(delta: Op[]) {
    await this.page.evaluate((delta) => {
      // @ts-expect-error
      window.quill.setContents(delta);
    }, delta);
  }

  getContents(): Promise<Op[]> {
    return this.page.evaluate(() => {
      // @ts-expect-error
      return window.quill.getContents().ops;
    });
  }

  /**
   * Move the cursor
   * @param {string} query text of the destination with `_` indicate the cursor place.
   */
  async moveCursorTo(query: string) {
    const text = query.replace('_', '');
    await this.waitForText(text);
    await this.page.evaluate(
      async ({ getTextNodeDef, updateSelectionDef, query, text }) => {
        const getTextNode = new Function(...getTextNodeDef);
        const updateSelection = new Function(...updateSelectionDef);

        const editor = window.document.querySelector('.ql-editor');
        const node = getTextNode(editor, text) as Text;
        if (!node) return;
        const offset = node.wholeText.indexOf(text) + query.indexOf('_');

        const document = node.ownerDocument;
        const range = document.createRange();
        range.setStart(node, offset);
        range.setEnd(node, offset);
        await updateSelection(range);
      },
      { getTextNodeDef, updateSelectionDef, query, text },
    );
  }

  moveCursorAfterText(text: string) {
    return this.moveCursorTo(`${text}_`);
  }

  moveCursorBeforeText(text: string) {
    return this.moveCursorTo(`_${text}`);
  }

  async selectText(start: string, end?: string) {
    await this.waitForText(start);
    if (end) {
      await this.waitForText(end);
    }
    await this.page.evaluate(
      async ({ getTextNodeDef, updateSelectionDef, start, end }) => {
        const getTextNode = new Function(...getTextNodeDef);
        const updateSelection = new Function(...updateSelectionDef);

        const editor = window.document.querySelector('.ql-editor');
        const anchorNode = getTextNode(editor, start) as Text;
        const focusNode = end ? (getTextNode(editor, end) as Text) : anchorNode;
        const anchorOffset = anchorNode.wholeText.indexOf(start);
        const focusOffset = end
          ? focusNode.wholeText.indexOf(end) + end.length
          : anchorOffset + start.length;

        const document = anchorNode.ownerDocument;
        const range = document.createRange();
        range.setStart(anchorNode, anchorOffset);
        range.setEnd(focusNode, focusOffset);
        await updateSelection(range);
      },
      { getTextNodeDef, updateSelectionDef, start, end },
    );
  }

  private async waitForText(text: string) {
    await this.page.waitForFunction(
      ({ getTextNodeDef, text }) => {
        const getTextNode = new Function(...getTextNodeDef);
        const editor = window.document.querySelector('.ql-editor');
        return getTextNode(editor, text);
      },
      { getTextNodeDef, text },
    );
  }
}
