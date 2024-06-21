import { expect } from '@playwright/test';
import { test } from './fixtures/index.js';
import { SHORTKEY } from './utils/index.js';

test.describe('cursor', () => {
  test.beforeEach(async ({ editorPage }) => {
    await editorPage.open();
  });

  test.describe('type', () => {
    test('normal typing with one format', async ({ page, editorPage }) => {
      await editorPage.setContents([{ insert: '1234\n' }]);
      await editorPage.moveCursorAfterText('12');
      await page.keyboard.press(`${SHORTKEY}+b`);
      await page.keyboard.type('abc');
      expect(await editorPage.getContents()).toEqual([
        { insert: '12' },
        { insert: 'abc', attributes: { bold: true } },
        { insert: '34\n' },
      ]);
      expect(await editorPage.getSelection()).toEqual({ index: 5, length: 0 });
      await expect(editorPage.cursorBlot).not.toBeAttached();
    });

    test('normal typing with two formats', async ({ page, editorPage }) => {
      await editorPage.setContents([{ insert: '1234\n' }]);
      await editorPage.moveCursorAfterText('12');
      await page.keyboard.press(`${SHORTKEY}+b`);
      await page.keyboard.press(`${SHORTKEY}+i`);
      await page.keyboard.type('abc');
      expect(await editorPage.getContents()).toEqual([
        { insert: '12' },
        { insert: 'abc', attributes: { bold: true, italic: true } },
        { insert: '34\n' },
      ]);
      expect(await editorPage.getSelection()).toEqual({ index: 5, length: 0 });
      await expect(editorPage.cursorBlot).not.toBeAttached();
    });

    test('normal typing with one format omitting', async ({
      page,
      editorPage,
    }) => {
      await editorPage.setContents([
        { insert: '1234', attributes: { bold: true, italic: true } },
        { insert: '\n' },
      ]);
      await editorPage.moveCursorAfterText('12');
      await page.keyboard.press(`${SHORTKEY}+b`);
      await page.keyboard.type('abc');
      expect(await editorPage.getContents()).toEqual([
        { insert: '12', attributes: { bold: true, italic: true } },
        { insert: 'abc', attributes: { italic: true } },
        { insert: '34', attributes: { bold: true, italic: true } },
        { insert: '\n' },
      ]);
      expect(await editorPage.getSelection()).toEqual({ index: 5, length: 0 });
      await expect(editorPage.cursorBlot).not.toBeAttached();
    });
  });

  test('paste', async ({ clipboard, editorPage, page }) => {
    await editorPage.setContents([{ insert: '1234\n' }]);
    await editorPage.moveCursorAfterText('12');
    await clipboard.writeText('abc');
    await page.keyboard.press(`${SHORTKEY}+b`);
    await clipboard.paste();
    expect(await editorPage.getContents()).toEqual([
      { insert: '12' },
      { insert: 'abc', attributes: { bold: true } },
      { insert: '34\n' },
    ]);
    expect(await editorPage.getSelection()).toEqual({ index: 5, length: 0 });
    await expect(editorPage.cursorBlot).not.toBeAttached();
  });

  test.describe('IME', () => {
    test('confirm composition', async ({ composition, editorPage, page }) => {
      await editorPage.setContents([{ insert: '1234\n' }]);
      await editorPage.moveCursorAfterText('12');
      await page.keyboard.press(`${SHORTKEY}+b`);
      const ime = await composition.start();
      await ime.update('w');
      await ime.update('o');
      await ime.commit('我');
      expect(await editorPage.getContents()).toEqual([
        { insert: '12' },
        { insert: '我', attributes: { bold: true } },
        { insert: '34\n' },
      ]);
      expect(await editorPage.getSelection()).toEqual({ index: 3, length: 0 });
      await expect(editorPage.cursorBlot).not.toBeAttached();
    });

    test('cancel composition', async ({ composition, editorPage, page }) => {
      await editorPage.setContents([{ insert: '1234\n' }]);
      await editorPage.moveCursorAfterText('12');
      await page.keyboard.press(`${SHORTKEY}+b`);
      const ime = await composition.start();
      await ime.update('w');
      await ime.update('o');
      await ime.cancel();
      expect(await editorPage.getContents()).toEqual([{ insert: '1234\n' }]);
      expect(await editorPage.getSelection()).toEqual({ index: 2, length: 0 });
      await expect(editorPage.cursorBlot).not.toBeAttached();
    });
  });

  test.describe('caret movements', () => {
    test('right arrow key', async ({ editorPage, page }) => {
      await editorPage.setContents([{ insert: '1234\n' }]);
      await editorPage.moveCursorAfterText('12');
      await page.keyboard.press(`${SHORTKEY}+b`);
      await page.keyboard.press('ArrowRight');
      expect(await editorPage.getSelection()).toEqual({ index: 3, length: 0 });
      await expect(editorPage.cursorBlot).not.toBeAttached();
    });

    test('left arrow key', async ({ editorPage, page }) => {
      await editorPage.setContents([{ insert: '1234\n' }]);
      await editorPage.moveCursorAfterText('12');
      await page.keyboard.press(`${SHORTKEY}+b`);
      await page.keyboard.press('ArrowLeft');
      expect(await editorPage.getSelection()).toEqual({ index: 1, length: 0 });
      await expect(editorPage.cursorBlot).not.toBeAttached();
    });

    test('jumping', async ({ editorPage, page }) => {
      await editorPage.setContents([{ insert: '12345\n' }]);
      await editorPage.moveCursorAfterText('12');
      await page.keyboard.press(`${SHORTKEY}+b`);
      await editorPage.moveCursorAfterText('34');
      expect(await editorPage.getSelection()).toEqual({ index: 4, length: 0 });
      await expect(editorPage.cursorBlot).not.toBeAttached();
    });
  });
});
