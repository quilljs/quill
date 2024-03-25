import Delta from 'quill-delta';
import { describe, expect, test, vitest } from 'vitest';
import Quill from '../../../src/core.js';
import { Range } from '../../../src/core/selection.js';
import Bold from '../../../src/formats/bold.js';
import Header from '../../../src/formats/header.js';
import Image from '../../../src/formats/image.js';
import IndentClass from '../../../src/formats/indent.js';
import Italic from '../../../src/formats/italic.js';
import Link from '../../../src/formats/link.js';
import List, { ListContainer } from '../../../src/formats/list.js';
import {
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
} from '../../../src/formats/table.js';
import Video from '../../../src/formats/video.js';
import { createRegistry } from '../__helpers__/factory.js';
import type { RegistryDefinition } from 'parchment';
import {
  DirectionAttribute,
  DirectionClass,
  DirectionStyle,
} from '../../../src/formats/direction.js';
import CodeBlock from '../../../src/formats/code.js';
import { ColorClass, ColorStyle } from '../../../src/formats/color.js';

describe('Clipboard', () => {
  describe('events', () => {
    const createQuill = () => {
      const container = document.body.appendChild(
        document.createElement('div'),
      );
      container.innerHTML = '<h1>0123</h1><p>5<em>67</em>8</p>';
      const registry = createRegistry([Bold, Italic, Header]);
      const quill = new Quill(container, { registry });
      quill.setSelection(2, 5);
      return quill;
    };

    describe('paste', () => {
      const clipboardEvent = {
        clipboardData: {
          getData: (type: string) =>
            type === 'text/html' ? '<strong>|</strong>' : '|',
        },
        preventDefault: () => {},
      } as ClipboardEvent;

      test('pastes html data', async () => {
        const quill = createQuill();
        quill.clipboard.onCapturePaste(clipboardEvent);
        expect(quill.root).toEqualHTML(
          '<p>01<strong>|</strong><em>7</em>8</p>',
        );
        expect(quill.getSelection()).toEqual(new Range(3));
      });

      test('pastes with "paste and match style"', async () => {
        const quill = createQuill();
        quill.setContents([
          { insert: 'abc', attributes: { bold: true } },
          { insert: '\n' },
        ]);
        quill.setSelection(3, 0);
        quill.clipboard.onCapturePaste({
          clipboardData: {
            getData: (type: string) =>
              type === 'text/plain' ? 'def' : undefined,
          },
          preventDefault: () => {},
        } as ClipboardEvent);
        expect(quill.getContents().ops).toEqual([
          { insert: 'abcdef', attributes: { bold: true } },
          { insert: '\n' },
        ]);
      });

      test('pastes links from iOS share sheets', async () => {
        const quill = createQuill();
        quill.setContents(new Delta().insert('\n'));
        quill.clipboard.onCapturePaste({
          clipboardData: {
            getData: (type: string) =>
              type === 'text/uri-list' ? 'https://example.com' : undefined,
          },
          preventDefault: () => {},
        } as ClipboardEvent);
        expect(quill.getContents().ops).toEqual([
          { insert: 'https://example.com\n' },
        ]);

        // Ignore comments
        quill.setContents(new Delta().insert('\n'));
        quill.clipboard.onCapturePaste({
          clipboardData: {
            getData: (type: string) =>
              type === 'text/uri-list'
                ? 'https://example.com\r\n# Comment\r\nhttps://example.com/a'
                : undefined,
          },
          preventDefault: () => {},
        } as ClipboardEvent);
        expect(quill.getContents().ops).toEqual([
          { insert: 'https://example.com\nhttps://example.com/a\n' },
        ]);
      });

      // Copying from Word includes both html and files
      test('pastes html data if present with file', async () => {
        const quill = createQuill();
        const upload = vitest.spyOn(quill.uploader, 'upload');
        quill.clipboard.onCapturePaste({
          ...clipboardEvent,
          clipboardData: {
            ...clipboardEvent.clipboardData,
            // @ts-expect-error
            files: ['file'],
          },
        });
        expect(upload).not.toHaveBeenCalled();
        expect(quill.root).toEqualHTML(
          '<p>01<strong>|</strong><em>7</em>8</p>',
        );
        expect(quill.getSelection()).toEqual(new Range(3));
      });

      test('pastes image file if present with image only html', async () => {
        const quill = createQuill();
        const upload = vitest.spyOn(quill.uploader, 'upload');
        quill.clipboard.onCapturePaste({
          ...clipboardEvent,
          clipboardData: {
            getData: (type) =>
              type === 'text/html'
                ? `<meta charset='utf-8'><img src="/assets/favicon.png"/>`
                : '|',
            // @ts-expect-error
            files: ['file'],
          },
        });
        expect(upload).toHaveBeenCalled();
      });

      test('does not fire selection-change', async () => {
        const quill = createQuill();
        const change = vitest.fn();
        quill.on('selection-change', change);
        quill.clipboard.onCapturePaste(clipboardEvent);
        expect(change).not.toHaveBeenCalled();
      });
    });

    describe('cut', () => {
      const setup = () => {
        const clipboardData: Record<string, string> = {};
        const clipboardEvent = {
          clipboardData: {
            setData: (type, data) => {
              clipboardData[type] = data;
            },
          },
          preventDefault: () => {},
        } as ClipboardEvent;
        return { clipboardData, clipboardEvent };
      };

      test('keeps formats of first line', async () => {
        const quill = createQuill();
        const { clipboardData, clipboardEvent } = setup();
        quill.clipboard.onCaptureCopy(clipboardEvent, true);
        expect(quill.root).toEqualHTML('<h1>01<em>7</em>8</h1>');
        expect(quill.getSelection()).toEqual(new Range(2));
        expect(clipboardData['text/plain']).toEqual('23\n56');
        expect(clipboardData['text/html']).toEqual(
          '<h1>23</h1><p>5<em>6</em></p>',
        );
      });
    });

    test('dangerouslyPasteHTML(html)', () => {
      const quill = createQuill();
      quill.clipboard.dangerouslyPasteHTML('<i>ab</i><b>cd</b>');
      expect(quill.root).toEqualHTML('<p><em>ab</em><strong>cd</strong></p>');
    });

    test('dangerouslyPasteHTML(index, html)', () => {
      const quill = createQuill();
      quill.clipboard.dangerouslyPasteHTML(2, '<b>ab</b>');
      expect(quill.root).toEqualHTML(`
        <h1>01<strong>ab</strong>23</h1>
        <p>5<em>67</em>8</p>
      `);
    });
  });

  describe('convert', () => {
    const createClipboard = (extraFormats: RegistryDefinition[] = []) => {
      const container = document.body.appendChild(
        document.createElement('div'),
      );
      const registry = createRegistry([
        Bold,
        Italic,
        Header,
        TableBody,
        TableContainer,
        TableCell,
        TableRow,
        ListContainer,
        List,
        IndentClass,
        Image,
        Video,
        Link,
        ...extraFormats,
      ]);
      const quill = new Quill(container, { registry });
      quill.setSelection(2, 5);
      return quill.clipboard;
    };

    test('text with adjacent spaces', () => {
      const delta = createClipboard().convert({ text: 'simple  text' });
      expect(delta).toEqual(new Delta().insert('simple  text'));
    });

    test('text with newlines', () => {
      const delta = createClipboard().convert({ text: 'simple\ntext' });
      expect(delta).toEqual(new Delta().insert('simple\ntext'));
    });

    test('only text in html', () => {
      const delta = createClipboard().convert({ html: 'simple plain text' });
      expect(delta).toEqual(new Delta().insert('simple plain text'));
    });

    test('whitespace', () => {
      const html =
        '<div> 0 </div><div> <div> 1 2 <span> 3 </span> 4 </div> </div>' +
        '<div><span>5 </span><span>6 </span><span> 7</span><span> 8</span></div>';
      const delta = createClipboard().convert({ html });
      expect(delta).toEqual(new Delta().insert('0\n\n1 2  3  4\n5 6  7 8'));
    });

    test('inline whitespace', () => {
      const html = '<p>0 <strong>1</strong> 2</p>';
      const delta = createClipboard().convert({ html });
      expect(delta).toEqual(
        new Delta().insert('0 ').insert('1', { bold: true }).insert(' 2'),
      );
    });

    test('intentional whitespace', () => {
      const html = '<span>0&nbsp;<strong>1</strong>&nbsp;2</span>';
      const delta = createClipboard().convert({ html });
      expect(delta).toEqual(
        new Delta()
          .insert('0\u00a0')
          .insert('1', { bold: true })
          .insert('\u00a02'),
      );
    });

    test('consecutive intentional whitespace', () => {
      const html = '<strong>&nbsp;&nbsp;1&nbsp;&nbsp;</strong>';
      const delta = createClipboard().convert({ html });
      expect(delta).toEqual(
        new Delta().insert('\u00a0\u00a01\u00a0\u00a0', { bold: true }),
      );
    });

    test('newlines between inline elements', () => {
      const html = '<span>foo</span>\n<span>bar</span>';
      const delta = createClipboard().convert({ html });
      expect(delta).toEqual(new Delta().insert('foo bar'));
    });

    test('multiple newlines between inline elements', () => {
      const html = '<span>foo</span>\n\n\n\n<span>bar</span>';
      const delta = createClipboard().convert({ html });
      expect(delta).toEqual(new Delta().insert('foo bar'));
    });

    test('newlines between block elements', () => {
      const html = '<p>foo</p>\n<p>bar</p>';
      const delta = createClipboard().convert({ html });
      expect(delta).toEqual(new Delta().insert('foo\n\nbar'));
    });

    test('multiple newlines between block elements', () => {
      const html = '<p>foo</p>\n\n\n\n<p>bar</p>';
      const delta = createClipboard().convert({ html });
      expect(delta).toEqual(new Delta().insert('foo\n\nbar'));
    });

    test('space between empty paragraphs', () => {
      const html = '<p></p> <p></p>';
      const delta = createClipboard().convert({ html });
      expect(delta).toEqual(new Delta().insert('\n\n'));
    });

    test('newline between empty paragraphs', () => {
      const html = '<p></p>\n<p></p>';
      const delta = createClipboard().convert({ html });
      expect(delta).toEqual(new Delta().insert('\n\n'));
    });

    test('break', () => {
      const html =
        '<div>0<br>1</div><div>2<br></div><div>3</div><div><br>4</div><div><br></div><div>5</div>';
      const delta = createClipboard().convert({ html });
      expect(delta).toEqual(new Delta().insert('0\n1\n2\n3\n\n4\n\n5'));
    });

    test('empty block', () => {
      const html = '<h1>Test</h1><h2></h2><p>Body</p>';
      const delta = createClipboard().convert({ html });
      expect(delta).toEqual(
        new Delta()
          .insert('Test\n', { header: 1 })
          .insert('\n', { header: 2 })
          .insert('Body'),
      );
    });

    test('mixed inline and block', () => {
      const delta = createClipboard().convert({
        html: '<div>One<div>Two</div></div>',
      });
      expect(delta).toEqual(new Delta().insert('One\nTwo'));
    });

    test('alias', () => {
      const delta = createClipboard().convert({
        html: '<b>Bold</b><i>Italic</i>',
      });
      expect(delta).toEqual(
        new Delta()
          .insert('Bold', { bold: true })
          .insert('Italic', { italic: true }),
      );
    });

    test('pre', () => {
      const html = '<pre> 01 \n 23 </pre>';
      expect(createClipboard([CodeBlock]).convert({ html })).toEqual(
        new Delta().insert(' 01 \n 23 \n', { 'code-block': true }),
      );
      expect(createClipboard().convert({ html })).toEqual(
        new Delta().insert(' 01 \n 23 '),
      );
    });

    test('pre with \\n node', () => {
      const html = '<pre><span> 01 </span>\n<span> 23 </span></pre>';
      const delta = createClipboard([CodeBlock]).convert({ html });
      expect(delta).toEqual(
        new Delta().insert(' 01 \n 23 \n', { 'code-block': true }),
      );
    });

    test('nested list', () => {
      const delta = createClipboard().convert({
        html: '<ol><li>One</li><li class="ql-indent-1">Alpha</li></ol>',
      });
      expect(delta).toEqual(
        new Delta()
          .insert('One\n', { list: 'ordered' })
          .insert('Alpha\n', { list: 'ordered', indent: 1 }),
      );
    });

    test('html nested list', () => {
      const delta = createClipboard().convert({
        html: '<ol><li>One<ol><li>Alpha</li><li>Beta<ol><li>I</li></ol></li></ol></li></ol>',
      });
      expect(delta).toEqual(
        new Delta()
          .insert('One\n', { list: 'ordered' })
          .insert('Alpha\nBeta\n', { list: 'ordered', indent: 1 })
          .insert('I\n', { list: 'ordered', indent: 2 }),
      );
    });

    test('html nested bullet', () => {
      const delta = createClipboard().convert({
        html: '<ul><li>One<ul><li>Alpha</li><li>Beta<ul><li>I</li></ul></li></ul></li></ul>',
      });
      expect(delta).toEqual(
        new Delta()
          .insert('One\n', { list: 'bullet' })
          .insert('Alpha\nBeta\n', { list: 'bullet', indent: 1 })
          .insert('I\n', { list: 'bullet', indent: 2 }),
      );
    });

    test('html nested checklist', () => {
      const delta = createClipboard().convert({
        html:
          '<ul><li data-list="checked">One<ul><li data-list="checked">Alpha</li><li data-list="checked">Beta' +
          '<ul><li data-list="checked">I</li></ul></li></ul></li></ul>',
      });
      expect(delta).toEqual(
        new Delta()
          .insert('One\n', { list: 'checked' })
          .insert('Alpha\nBeta\n', { list: 'checked', indent: 1 })
          .insert('I\n', { list: 'checked', indent: 2 }),
      );
    });

    test('html partial list', () => {
      const delta = createClipboard().convert({
        html: '<ol><li><ol><li><ol><li>iiii</li></ol></li><li>bbbb</li></ol></li><li>2222</li></ol>',
      });
      expect(delta).toEqual(
        new Delta()
          .insert('iiii\n', { list: 'ordered', indent: 2 })
          .insert('bbbb\n', { list: 'ordered', indent: 1 })
          .insert('2222\n', { list: 'ordered' }),
      );
    });

    test('html table', () => {
      const delta = createClipboard().convert({
        html:
          '<table>' +
          '<thead><tr><td>A1</td><td>A2</td><td>A3</td></tr></thead>' +
          '<tbody><tr><td>B1</td><td></td><td>B3</td></tr></tbody>' +
          '</table>',
      });
      expect(delta).toEqual(
        new Delta()
          .insert('A1\nA2\nA3\n', { table: 1 })
          .insert('B1\n\nB3\n', { table: 2 }),
      );
    });

    test('embeds', () => {
      const delta = createClipboard().convert({
        html: '<div>01<img src="/assets/favicon.png" height="200" width="300">34</div>',
      });
      const expected = new Delta()
        .insert('01')
        .insert(
          { image: '/assets/favicon.png' },
          { height: '200', width: '300' },
        )
        .insert('34');
      expect(delta).toEqual(expected);
    });

    test('block embed', () => {
      const delta = createClipboard().convert({
        html: '<p>01</p><iframe src="#"></iframe><p>34</p>',
      });
      expect(delta).toEqual(
        new Delta().insert('01\n').insert({ video: '#' }).insert('34'),
      );
    });

    test('block embeds within blocks', () => {
      const delta = createClipboard().convert({
        html: '<h1>01<iframe src="#"></iframe>34</h1><p>67</p>',
      });
      expect(delta).toEqual(
        new Delta()
          .insert('01\n', { header: 1 })
          .insert({ video: '#' }, { header: 1 })
          .insert('34\n', { header: 1 })
          .insert('67'),
      );
    });

    test('wrapped block embed', () => {
      const delta = createClipboard().convert({
        html: '<h1>01<a href="/"><iframe src="#"></iframe></a>34</h1><p>67</p>',
      });
      expect(delta).toEqual(
        new Delta()
          .insert('01\n', { header: 1 })
          .insert({ video: '#' }, { link: '/', header: 1 })
          .insert('34\n', { header: 1 })
          .insert('67'),
      );
    });

    test('wrapped block embed with siblings', () => {
      const delta = createClipboard().convert({
        html: '<h1>01<a href="/">a<iframe src="#"></iframe>b</a>34</h1><p>67</p>',
      });
      expect(delta).toEqual(
        new Delta()
          .insert('01', { header: 1 })
          .insert('a\n', { link: '/', header: 1 })
          .insert({ video: '#' }, { link: '/', header: 1 })
          .insert('b', { link: '/', header: 1 })
          .insert('34\n', { header: 1 })
          .insert('67'),
      );
    });

    test('attributor and style match', () => {
      const html = '<p style="direction:rtl;">Test</p>';
      const attributors = [DirectionStyle, DirectionClass, DirectionAttribute];
      attributors.forEach((attributor) => {
        expect(createClipboard([attributor]).convert({ html })).toEqual(
          new Delta().insert('Test\n', { direction: 'rtl' }),
        );
      });

      expect(createClipboard().convert({ html })).toEqual(
        new Delta().insert('Test'),
      );
    });

    test('nested styles', () => {
      const html =
        '<span style="color: red;"><span style="color: blue;">Test</span></span>';
      const attributors = [ColorStyle, ColorClass];
      attributors.forEach((attributor) => {
        expect(createClipboard([attributor]).convert({ html })).toEqual(
          new Delta().insert('Test', { color: 'blue' }),
        );
      });

      expect(createClipboard().convert({ html })).toEqual(
        new Delta().insert('Test'),
      );
    });

    test('custom matcher', () => {
      const clipboard = createClipboard();
      clipboard.addMatcher(Node.TEXT_NODE, (node, delta) => {
        let index = 0;
        const regex = /https?:\/\/[^\s]+/g;
        let match: RegExpExecArray | null = null;
        const composer = new Delta();
        // eslint-disable-next-line no-cond-assign
        while ((match = regex.exec((node as Text).data))) {
          composer.retain(match.index - index);
          index = regex.lastIndex;
          composer.retain(match[0].length, { link: match[0] });
        }
        return delta.compose(composer);
      });
      const delta = clipboard.convert({
        html: 'http://github.com https://quilljs.com',
      });
      const expected = new Delta()
        .insert('http://github.com', { link: 'http://github.com' })
        .insert(' ')
        .insert('https://quilljs.com', { link: 'https://quilljs.com' });
      expect(delta).toEqual(expected);
    });

    test('does not execute javascript', () => {
      // @ts-expect-error
      window.unsafeFunction = vitest.fn();
      const html =
        "<img src='/assets/favicon.png' onload='window.unsafeFunction()'/>";
      createClipboard().convert({ html });
      // @ts-expect-error
      expect(window.unsafeFunction).not.toHaveBeenCalled();
      // @ts-expect-error
      delete window.unsafeFunction;
    });

    test('xss', () => {
      const delta = createClipboard().convert({
        html: '<script>alert(2);</script>',
      });
      expect(delta).toEqual(new Delta().insert(''));
    });

    test('Google Docs', () => {
      const html = `<meta charset='utf-8'><meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-6f072e08-7fff-e641-0fbc-7fe2846294a4"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">text</span></p><br /><ol style="margin-top:0;margin-bottom:0;padding-inline-start:48px;"><li dir="ltr" style="list-style-type:decimal;font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;" aria-level="1"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;" role="presentation"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">i1</span></p></li><li dir="ltr" style="list-style-type:decimal;font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;" aria-level="1"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;" role="presentation"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">i2</span></p></li><ol style="margin-top:0;margin-bottom:0;padding-inline-start:48px;"><li dir="ltr" style="list-style-type:lower-alpha;font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;" aria-level="2"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;" role="presentation"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">i3</span></p></li></ol></ol><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">text</span></p></b><br class="Apple-interchange-newline">`;
      const delta = createClipboard().convert({ html });
      expect(delta).toEqual(
        new Delta()
          .insert('text\n')
          .insert('i1\ni2\n', { list: 'ordered' })
          .insert('i3\n', { list: 'ordered', indent: 1 })
          .insert('text', { bold: true })
          .insert('\n'),
      );
    });

    test('ignore empty elements except paragraphs', () => {
      const html = '<div>hello<div></div>my<p></p>world</div>';
      const delta = createClipboard().convert({ html });
      expect(delta).toEqual(new Delta().insert('hello\nmy\n\nworld'));
    });
  });
});
