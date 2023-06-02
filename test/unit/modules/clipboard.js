import Delta from 'quill-delta';
import { Range } from '../../../modules/selection';
import Quill from '../../../core';

describe('Clipboard', function () {
  describe('events', function () {
    beforeEach(function () {
      this.quill = this.initialize(Quill, '<h1>0123</h1><p>5<em>67</em>8</p>');
      this.quill.setSelection(2, 5);
    });

    describe('paste', function () {
      beforeAll(function () {
        this.clipboardEvent = {
          clipboardData: {
            getData: type =>
              type === 'text/html' ? '<strong>|</strong>' : '|',
          },
          preventDefault: () => {},
        };
      });

      it('pastes html data', function (done) {
        this.quill.clipboard.onCapturePaste(this.clipboardEvent);
        setTimeout(() => {
          expect(this.quill.root).toEqualHTML(
            '<p>01<strong>|</strong><em>7</em>8</p>',
          );
          expect(this.quill.getSelection()).toEqual(new Range(3));
          done();
        }, 2);
      });

      // Copying from Word includes both html and files
      it('pastes html data if present with file', function (done) {
        const upload = spyOn(this.quill.uploader, 'upload');
        this.quill.clipboard.onCapturePaste({
          ...this.clipboardEvent,
          clipboardData: {
            ...this.clipboardEvent.clipboardData,
            files: ['file'],
          },
        });
        setTimeout(() => {
          expect(upload).not.toHaveBeenCalled();
          expect(this.quill.root).toEqualHTML(
            '<p>01<strong>|</strong><em>7</em>8</p>',
          );
          expect(this.quill.getSelection()).toEqual(new Range(3));
          done();
        }, 2);
      });

      it('pastes image file if present with image only html', function (done) {
        const upload = spyOn(this.quill.uploader, 'upload');
        this.quill.clipboard.onCapturePaste({
          ...this.clipboardEvent,
          clipboardData: {
            getData: type =>
              type === 'text/html'
                ? `<meta charset='utf-8'><img src="/assets/favicon.png"/>`
                : '|',
            files: ['file'],
          },
        });
        setTimeout(() => {
          expect(upload).toHaveBeenCalled();
          done();
        }, 2);
      });

      it('does not fire selection-change', function (done) {
        const change = jasmine.createSpy('change');
        this.quill.on('selection-change', change);
        this.quill.clipboard.onCapturePaste(this.clipboardEvent);
        setTimeout(function () {
          expect(change).not.toHaveBeenCalled();
          done();
        }, 2);
      });
    });

    describe('cut', () => {
      beforeEach(function () {
        this.clipboardData = {};
        this.clipboardEvent = {
          clipboardData: {
            setData: (type, data) => {
              this.clipboardData[type] = data;
            },
          },
          preventDefault: () => {},
        };
      });

      it('keeps formats of first line', function (done) {
        this.quill.clipboard.onCaptureCopy(this.clipboardEvent, true);
        setTimeout(() => {
          expect(this.quill.root).toEqualHTML('<h1>01<em>7</em>8</h1>');
          expect(this.quill.getSelection()).toEqual(new Range(2));
          expect(this.clipboardData['text/plain']).toEqual('23\n56');
          expect(this.clipboardData['text/html']).toEqual(
            '<h1>23</h1><p>5<em>6</em></p>',
          );
          done();
        }, 2);
      });
    });

    it('dangerouslyPasteHTML(html)', function () {
      this.quill.clipboard.dangerouslyPasteHTML('<i>ab</i><b>cd</b>');
      expect(this.quill.root).toEqualHTML(
        '<p><em>ab</em><strong>cd</strong></p>',
      );
    });

    it('dangerouslyPasteHTML(index, html)', function () {
      this.quill.clipboard.dangerouslyPasteHTML(2, '<b>ab</b>');
      expect(this.quill.root).toEqualHTML(
        '<h1>01<strong>ab</strong>23</h1><p>5<em>67</em>8</p>',
      );
    });
  });

  describe('convert', function () {
    beforeEach(function () {
      const quill = this.initialize(Quill, '');
      this.clipboard = quill.clipboard;
    });

    it('plain text', function () {
      const delta = this.clipboard.convert({ html: 'simple plain text' });
      expect(delta).toEqual(new Delta().insert('simple plain text'));
    });

    it('whitespace', function () {
      const html =
        '<div> 0 </div><div> <div> 1 2 <span> 3 </span> 4 </div> </div>' +
        '<div><span>5 </span><span>6 </span><span> 7</span><span> 8</span></div>';
      const delta = this.clipboard.convert({ html });
      expect(delta).toEqual(new Delta().insert('0\n1 2  3  4\n5 6  7 8'));
    });

    it('inline whitespace', function () {
      const html = '<p>0 <strong>1</strong> 2</p>';
      const delta = this.clipboard.convert({ html });
      expect(delta).toEqual(
        new Delta().insert('0 ').insert('1', { bold: true }).insert(' 2'),
      );
    });

    it('intentional whitespace', function () {
      const html = '<span>0&nbsp;<strong>1</strong>&nbsp;2</span>';
      const delta = this.clipboard.convert({ html });
      expect(delta).toEqual(
        new Delta()
          .insert('0\u00a0')
          .insert('1', { bold: true })
          .insert('\u00a02'),
      );
    });

    it('consecutive intentional whitespace', function () {
      const html = '<strong>&nbsp;&nbsp;1&nbsp;&nbsp;</strong>';
      const delta = this.clipboard.convert({ html });
      expect(delta).toEqual(
        new Delta().insert('\u00a0\u00a01\u00a0\u00a0', { bold: true }),
      );
    });

    it('break', function () {
      const html =
        '<div>0<br>1</div><div>2<br></div><div>3</div><div><br>4</div><div><br></div><div>5</div>';
      const delta = this.clipboard.convert({ html });
      expect(delta).toEqual(new Delta().insert('0\n1\n2\n3\n\n4\n\n5'));
    });

    it('empty block', function () {
      const html = '<h1>Test</h1><h2></h2><p>Body</p>';
      const delta = this.clipboard.convert({ html });
      expect(delta).toEqual(
        new Delta()
          .insert('Test\n', { header: 1 })
          .insert('\n', { header: 2 })
          .insert('Body'),
      );
    });

    it('mixed inline and block', function () {
      const delta = this.clipboard.convert({
        html: '<div>One<div>Two</div></div>',
      });
      expect(delta).toEqual(new Delta().insert('One\nTwo'));
    });

    it('alias', function () {
      const delta = this.clipboard.convert({
        html: '<b>Bold</b><i>Italic</i>',
      });
      expect(delta).toEqual(
        new Delta()
          .insert('Bold', { bold: true })
          .insert('Italic', { italic: true }),
      );
    });

    it('pre', function () {
      const html = '<pre> 01 \n 23 </pre>';
      const delta = this.clipboard.convert({ html });
      expect(delta).toEqual(
        new Delta().insert(' 01 \n 23 \n', { 'code-block': true }),
      );
    });

    it('pre with \\n node', function () {
      const html = '<pre><span> 01 </span>\n<span> 23 </span></pre>';
      const delta = this.clipboard.convert({ html });
      expect(delta).toEqual(
        new Delta().insert(' 01 \n 23 \n', { 'code-block': true }),
      );
    });

    it('nested list', function () {
      const delta = this.clipboard.convert({
        html: '<ol><li>One</li><li class="ql-indent-1">Alpha</li></ol>',
      });
      expect(delta).toEqual(
        new Delta()
          .insert('One\n', { list: 'ordered' })
          .insert('Alpha\n', { list: 'ordered', indent: 1 }),
      );
    });

    it('html nested list', function () {
      const delta = this.clipboard.convert({
        html: '<ol><li>One<ol><li>Alpha</li><li>Beta<ol><li>I</li></ol></li></ol></li></ol>',
      });
      expect(delta).toEqual(
        new Delta()
          .insert('One\n', { list: 'ordered' })
          .insert('Alpha\nBeta\n', { list: 'ordered', indent: 1 })
          .insert('I\n', { list: 'ordered', indent: 2 }),
      );
    });

    it('html nested bullet', function () {
      const delta = this.clipboard.convert({
        html: '<ul><li>One<ul><li>Alpha</li><li>Beta<ul><li>I</li></ul></li></ul></li></ul>',
      });
      expect(delta).toEqual(
        new Delta()
          .insert('One\n', { list: 'bullet' })
          .insert('Alpha\nBeta\n', { list: 'bullet', indent: 1 })
          .insert('I\n', { list: 'bullet', indent: 2 }),
      );
    });

    it('html nested checklist', function () {
      const delta = this.clipboard.convert({
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

    it('html partial list', function () {
      const delta = this.clipboard.convert({
        html: '<ol><li><ol><li><ol><li>iiii</li></ol></li><li>bbbb</li></ol></li><li>2222</li></ol>',
      });
      expect(delta).toEqual(
        new Delta()
          .insert('iiii\n', { list: 'ordered', indent: 2 })
          .insert('bbbb\n', { list: 'ordered', indent: 1 })
          .insert('2222\n', { list: 'ordered' }),
      );
    });

    it('html table', function () {
      const delta = this.clipboard.convert({
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

    it('embeds', function () {
      const delta = this.clipboard.convert({
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

    it('block embed', function () {
      const delta = this.clipboard.convert({
        html: '<p>01</p><iframe src="#"></iframe><p>34</p>',
      });
      expect(delta).toEqual(
        new Delta().insert('01\n').insert({ video: '#' }).insert('34'),
      );
    });

    it('block embeds within blocks', function () {
      const delta = this.clipboard.convert({
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

    it('wrapped block embed', function () {
      const delta = this.clipboard.convert({
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

    it('wrapped block embed with siblings', function () {
      const delta = this.clipboard.convert({
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

    it('attributor and style match', function () {
      const delta = this.clipboard.convert({
        html: '<p style="direction:rtl;">Test</p>',
      });
      expect(delta).toEqual(new Delta().insert('Test\n', { direction: 'rtl' }));
    });

    it('nested styles', function () {
      const delta = this.clipboard.convert({
        html: '<span style="color: red;"><span style="color: blue;">Test</span></span>',
      });
      expect(delta).toEqual(new Delta().insert('Test', { color: 'blue' }));
    });

    it('custom matcher', function () {
      this.clipboard.addMatcher(Node.TEXT_NODE, function (node, delta) {
        let index = 0;
        const regex = /https?:\/\/[^\s]+/g;
        let match = null;
        const composer = new Delta();
        // eslint-disable-next-line no-cond-assign
        while ((match = regex.exec(node.data))) {
          composer.retain(match.index - index);
          index = regex.lastIndex;
          composer.retain(match[0].length, { link: match[0] });
        }
        return delta.compose(composer);
      });
      const delta = this.clipboard.convert({
        html: 'http://github.com https://quilljs.com',
      });
      const expected = new Delta()
        .insert('http://github.com', { link: 'http://github.com' })
        .insert(' ')
        .insert('https://quilljs.com', { link: 'https://quilljs.com' });
      expect(delta).toEqual(expected);
    });

    it('does not execute javascript', function () {
      window.unsafeFunction = jasmine.createSpy('unsafeFunction');
      const html =
        "<img src='/assets/favicon.png' onload='window.unsafeFunction()'/>";
      this.clipboard.convert({ html });
      expect(window.unsafeFunction).not.toHaveBeenCalled();
      delete window.unsafeFunction;
    });

    it('xss', function () {
      const delta = this.clipboard.convert({
        html: '<script>alert(2);</script>',
      });
      expect(delta).toEqual(new Delta().insert(''));
    });
  });
});
