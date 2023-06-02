import Delta from 'quill-delta';
import Editor from '../../../core/editor';
import Selection, { Range } from '../../../modules/selection';

describe('Editor', function () {
  describe('insert', function () {
    it('text', function () {
      const editor = this.initialize(Editor, '<p><strong>0123</strong></p>');
      editor.insertText(2, '!!');
      expect(editor.getDelta()).toEqual(
        new Delta().insert('01!!23', { bold: true }).insert('\n'),
      );
      expect(this.container).toEqualHTML('<p><strong>01!!23</strong></p>');
    });

    it('embed', function () {
      const editor = this.initialize(Editor, '<p><strong>0123</strong></p>');
      editor.insertEmbed(2, 'image', '/assets/favicon.png');
      expect(editor.getDelta()).toEqual(
        new Delta()
          .insert('01', { bold: true })
          .insert({ image: '/assets/favicon.png' }, { bold: true })
          .insert('23', { bold: true })
          .insert('\n'),
      );
      expect(this.container).toEqualHTML(
        '<p><strong>01<img src="/assets/favicon.png">23</strong></p>',
      );
    });

    it('on empty line', function () {
      const editor = this.initialize(Editor, '<p>0</p><p><br></p><p>3</p>');
      editor.insertText(2, '!');
      expect(editor.getDelta()).toEqual(new Delta().insert('0\n!\n3\n'));
      expect(this.container).toEqualHTML('<p>0</p><p>!</p><p>3</p>');
    });

    it('end of document', function () {
      const editor = this.initialize(Editor, '<p>Hello</p>');
      editor.insertText(6, 'World!');
      expect(editor.getDelta()).toEqual(new Delta().insert('Hello\nWorld!\n'));
      expect(this.container).toEqualHTML('<p>Hello</p><p>World!</p>');
    });

    it('end of document with newline', function () {
      const editor = this.initialize(Editor, '<p>Hello</p>');
      editor.insertText(6, 'World!\n');
      expect(editor.getDelta()).toEqual(new Delta().insert('Hello\nWorld!\n'));
      expect(this.container).toEqualHTML('<p>Hello</p><p>World!</p>');
    });

    it('embed at end of document with newline', function () {
      const editor = this.initialize(Editor, '<p>Hello</p>');
      editor.insertEmbed(6, 'image', '/assets/favicon.png');
      expect(editor.getDelta()).toEqual(
        new Delta()
          .insert('Hello\n')
          .insert({ image: '/assets/favicon.png' })
          .insert('\n'),
      );
      expect(this.container).toEqualHTML(
        '<p>Hello</p><p><img src="/assets/favicon.png"></p>',
      );
    });

    it('newline splitting', function () {
      const editor = this.initialize(Editor, '<p><strong>0123</strong></p>');
      editor.insertText(2, '\n');
      expect(editor.getDelta()).toEqual(
        new Delta()
          .insert('01', { bold: true })
          .insert('\n')
          .insert('23', { bold: true })
          .insert('\n'),
      );
      expect(this.container).toEqualHTML(`
        <p><strong>01</strong></p>
        <p><strong>23</strong></p>`);
    });

    it('prepend newline', function () {
      const editor = this.initialize(Editor, '<p><strong>0123</strong></p>');
      editor.insertText(0, '\n');
      expect(editor.getDelta()).toEqual(
        new Delta().insert('\n').insert('0123', { bold: true }).insert('\n'),
      );
      expect(this.container).toEqualHTML(`
        <p><br></p>
        <p><strong>0123</strong></p>`);
    });

    it('append newline', function () {
      const editor = this.initialize(Editor, '<p><strong>0123</strong></p>');
      editor.insertText(4, '\n');
      expect(editor.getDelta()).toEqual(
        new Delta().insert('0123', { bold: true }).insert('\n\n'),
      );
      expect(this.container).toEqualHTML(`
        <p><strong>0123</strong></p>
        <p><br></p>`);
    });

    it('multiline text', function () {
      const editor = this.initialize(Editor, '<p><strong>0123</strong></p>');
      editor.insertText(2, '\n!!\n!!\n');
      expect(editor.getDelta()).toEqual(
        new Delta()
          .insert('01', { bold: true })
          .insert('\n')
          .insert('!!', { bold: true })
          .insert('\n')
          .insert('!!', { bold: true })
          .insert('\n')
          .insert('23', { bold: true })
          .insert('\n'),
      );
      expect(this.container).toEqualHTML(`
        <p><strong>01</strong></p>
        <p><strong>!!</strong></p>
        <p><strong>!!</strong></p>
        <p><strong>23</strong></p>`);
    });

    it('multiple newlines', function () {
      const editor = this.initialize(Editor, '<p><strong>0123</strong></p>');
      editor.insertText(2, '\n\n');
      expect(editor.getDelta()).toEqual(
        new Delta()
          .insert('01', { bold: true })
          .insert('\n\n')
          .insert('23', { bold: true })
          .insert('\n'),
      );
      expect(this.container).toEqualHTML(`
        <p><strong>01</strong></p>
        <p><br></p>
        <p><strong>23</strong></p>`);
    });

    it('text removing formatting', function () {
      const editor = this.initialize(Editor, '<p><s>01</s></p>');
      editor.insertText(2, '23', { bold: false, strike: false });
      expect(editor.getDelta()).toEqual(
        new Delta().insert('01', { strike: true }).insert('23\n'),
      );
    });
  });

  describe('delete', function () {
    it('inner node', function () {
      const editor = this.initialize(
        Editor,
        '<p><strong><em>0123</em></strong></p>',
      );
      editor.deleteText(1, 2);
      expect(editor.getDelta()).toEqual(
        new Delta().insert('03', { bold: true, italic: true }).insert('\n'),
      );
      expect(this.container).toEqualHTML('<p><strong><em>03</em></strong></p>');
    });

    it('parts of multiple lines', function () {
      const editor = this.initialize(
        Editor,
        '<p><em>0123</em></p><p><em>5678</em></p>',
      );
      editor.deleteText(2, 5);
      expect(editor.getDelta()).toEqual(
        new Delta().insert('0178', { italic: true }).insert('\n'),
      );
      expect(this.container).toEqualHTML('<p><em>0178</em></p>');
    });

    it('entire line keeping newline', function () {
      const editor = this.initialize(
        Editor,
        '<p><strong><em>0123</em></strong></p>',
      );
      editor.deleteText(0, 4);
      expect(editor.getDelta()).toEqual(new Delta().insert('\n'));
      expect(this.container).toEqualHTML('<p><br></p>');
    });

    it('newline', function () {
      const editor = this.initialize(
        Editor,
        '<p><em>0123</em></p><p><em>5678</em></p>',
      );
      editor.deleteText(4, 1);
      expect(editor.getDelta()).toEqual(
        new Delta().insert('01235678', { italic: true }).insert('\n'),
      );
      expect(this.container).toEqualHTML('<p><em>01235678</em></p>');
    });

    it('entire document', function () {
      const editor = this.initialize(
        Editor,
        '<p><strong><em>0123</em></strong></p>',
      );
      editor.deleteText(0, 5);
      expect(editor.getDelta()).toEqual(new Delta().insert('\n'));
      expect(this.container).toEqualHTML('<p><br></p>');
    });

    it('multiple complete lines', function () {
      const editor = this.initialize(
        Editor,
        '<p><em>012</em></p><p><em>456</em></p><p><em>890</em></p>',
      );
      editor.deleteText(0, 8);
      expect(editor.getDelta()).toEqual(
        new Delta().insert('890', { italic: true }).insert('\n'),
      );
      expect(this.container).toEqualHTML('<p><em>890</em></p>');
    });
  });

  describe('format', function () {
    it('line', function () {
      const editor = this.initialize(Editor, '<p>0123</p>');
      editor.formatLine(1, 1, { header: 1 });
      expect(editor.scroll.domNode).toEqualHTML('<h1>0123</h1>');
    });
  });

  describe('removeFormat', function () {
    it('unwrap', function () {
      const editor = this.initialize(Editor, '<p>0<em>12</em>3</p>');
      editor.removeFormat(1, 2);
      expect(this.container).toEqualHTML('<p>0123</p>');
    });

    it('split inline', function () {
      const editor = this.initialize(
        Editor,
        '<p>0<strong><em>12</em></strong>3</p>',
      );
      editor.removeFormat(1, 1);
      expect(this.container).toEqualHTML(
        '<p>01<strong><em>2</em></strong>3</p>',
      );
    });

    it('partial line', function () {
      const editor = this.initialize(
        Editor,
        '<h1>01</h1><ol><li data-list="ordered">34</li></ol>',
      );
      editor.removeFormat(1, 3);
      expect(this.container).toEqualHTML('<p>01</p><p>34</p>');
    });

    it('remove embed', function () {
      const editor = this.initialize(
        Editor,
        '<p>0<img src="/assets/favicon.png">2</p>',
      );
      editor.removeFormat(1, 1);
      expect(this.container).toEqualHTML('<p>02</p>');
    });

    it('combined', function () {
      const editor = this.initialize(
        Editor,
        `
        <h1>01<img src="/assets/favicon.png">3</h1>
        <ol>
          <li data-list="ordered">5<strong>6<em>78</em>9</strong>0</li>
        </ol>
      `,
      );
      editor.removeFormat(1, 7);
      expect(this.container).toEqualHTML(`
        <p>013</p>
        <p>567<strong><em>8</em>9</strong>0</p>
      `);
    });

    it('end of document', function () {
      const editor = this.initialize(
        Editor,
        `
        <ol>
          <li data-list="ordered">0123</li>
          <li data-list="ordered">5678</li>
        </ol>
      `,
      );
      editor.removeFormat(0, 12);
      expect(this.container).toEqualHTML(`
        <p>0123</p>
        <p>5678</p>
      `);
    });
  });

  describe('applyDelta', function () {
    it('insert', function () {
      const editor = this.initialize(Editor, '<p></p>');
      editor.applyDelta(new Delta().insert('01'));
      expect(this.container).toEqualHTML('<p>01</p>');
    });

    it('attributed insert', function () {
      const editor = this.initialize(Editor, '<p>0123</p>');
      editor.applyDelta(new Delta().retain(2).insert('|', { bold: true }));
      expect(this.container).toEqualHTML('<p>01<strong>|</strong>23</p>');
    });

    it('format', function () {
      const editor = this.initialize(Editor, '<p>01</p>');
      editor.applyDelta(new Delta().retain(2, { bold: true }));
      expect(this.container).toEqualHTML('<p><strong>01</strong></p>');
    });

    it('discontinuous formats', function () {
      const editor = this.initialize(Editor, '');
      const delta = new Delta()
        .insert('ab', { bold: true })
        .insert('23\n45')
        .insert('cd', { bold: true });
      editor.applyDelta(delta);
      expect(this.container).toEqualHTML(
        '<p><strong>ab</strong>23</p><p>45<strong>cd</strong></p>',
      );
    });

    it('unformatted insert', function () {
      const editor = this.initialize(Editor, '<p><em>01</em></p>');
      editor.applyDelta(new Delta().retain(1).insert('|'));
      expect(this.container).toEqualHTML('<p><em>0</em>|<em>1</em></p>');
    });

    it('insert at format boundary', function () {
      const editor = this.initialize(Editor, '<p><em>0</em><u>1</u></p>');
      editor.applyDelta(new Delta().retain(1).insert('|', { strike: true }));
      expect(this.container).toEqualHTML('<p><em>0</em><s>|</s><u>1</u></p>');
    });

    it('unformatted newline', function () {
      const editor = this.initialize(Editor, '<h1>01</h1>');
      editor.applyDelta(new Delta().retain(2).insert('\n'));
      expect(this.container).toEqualHTML('<p>01</p><h1><br></h1>');
    });

    it('formatted embed', function () {
      const editor = this.initialize(Editor, '');
      editor.applyDelta(
        new Delta().insert({ image: '/assets/favicon.png' }, { italic: true }),
      );
      expect(this.container).toEqualHTML(
        '<p><em><img src="/assets/favicon.png"></em></p>',
      );
    });

    it('insert text before block embed', function () {
      const editor = this.initialize(
        Editor,
        '<p>0123</p><iframe src="#" class="ql-video" frameborder="0" allowfullscreen="true"></iframe>',
      );
      editor.applyDelta(new Delta().retain(5).insert('5678'));
      expect(this.container).toEqualHTML(
        '<p>0123</p><p>5678</p><iframe src="#" class="ql-video" frameborder="0" allowfullscreen="true"></iframe>',
      );
    });

    it('insert attributed text before block embed', function () {
      const editor = this.initialize(
        Editor,
        '<p>0123</p><iframe src="#" class="ql-video" frameborder="0" allowfullscreen="true"></iframe>',
      );
      editor.applyDelta(new Delta().retain(5).insert('5678', { bold: true }));
      expect(this.container).toEqualHTML(
        '<p>0123</p><p><strong>5678</strong></p><iframe src="#" class="ql-video" frameborder="0" allowfullscreen="true"></iframe>',
      );
    });

    it('insert text with newline before block embed', function () {
      const editor = this.initialize(
        Editor,
        '<p>0123</p><iframe src="#" class="ql-video" frameborder="0" allowfullscreen="true"></iframe>',
      );
      editor.applyDelta(new Delta().retain(5).insert('5678\n'));
      expect(this.container).toEqualHTML(
        '<p>0123</p><p>5678</p><iframe src="#" class="ql-video" frameborder="0" allowfullscreen="true"></iframe>',
      );
    });

    it('insert attributed text with newline before block embed', function () {
      const editor = this.initialize(
        Editor,
        '<p>0123</p><iframe src="#" class="ql-video" frameborder="0" allowfullscreen="true"></iframe>',
      );
      editor.applyDelta(
        new Delta().retain(5).insert('5678', { bold: true }).insert('\n'),
      );
      expect(this.container).toEqualHTML(
        '<p>0123</p><p><strong>5678</strong></p><iframe src="#" class="ql-video" frameborder="0" allowfullscreen="true"></iframe>',
      );
    });

    it('multiple inserts and deletes', function () {
      const editor = this.initialize(Editor, '<p>0123</p>');
      editor.applyDelta(
        new Delta()
          .retain(1)
          .insert('a')
          .delete(2)
          .insert('cd')
          .delete(1)
          .insert('efg'),
      );
      expect(this.container).toEqualHTML('<p>0acdefg</p>');
    });

    it('insert text with delete in existing block', function () {
      const editor = this.initialize(
        Editor,
        '<p>0123</p><iframe src="#" class="ql-video" frameborder="0" allowfullscreen="true"></iframe>',
      );
      editor.applyDelta(
        new Delta()
          .retain(4)
          .insert('abc')
          // Retain newline at end of block being inserted into.
          .retain(1)
          .delete(1),
      );
      expect(this.container).toEqualHTML('<p>0123abc</p>');
    });

    it('insert text with delete before block embed', function () {
      const editor = this.initialize(
        Editor,
        '<p>0123</p><iframe src="#" class="ql-video" frameborder="0" allowfullscreen="true"></iframe>',
      );
      editor.applyDelta(
        new Delta()
          .retain(5)
          // Explicit newline required to maintain correct index calculation for the delete.
          .insert('abc\n')
          .delete(1),
      );
      expect(this.container).toEqualHTML('<p>0123</p><p>abc</p>');
    });

    it('insert inline embed with delete in existing block', function () {
      const editor = this.initialize(
        Editor,
        '<p>0123</p><iframe src="#" class="ql-video" frameborder="0" allowfullscreen="true"></iframe>',
      );
      editor.applyDelta(
        new Delta()
          .retain(4)
          .insert({ image: '/assets/favicon.png' })
          // Retain newline at end of block being inserted into.
          .retain(1)
          .delete(1),
      );
      expect(this.container).toEqualHTML(
        '<p>0123<img src="/assets/favicon.png"></p>',
      );
    });

    it('insert inline embed with delete before block embed', function () {
      const editor = this.initialize(
        Editor,
        '<p>0123</p><iframe src="#" class="ql-video" frameborder="0" allowfullscreen="true"></iframe>',
      );
      editor.applyDelta(
        new Delta()
          .retain(5)
          .insert({ image: '/assets/favicon.png' })
          // Explicit newline required to maintain correct index calculation for the delete.
          .insert('\n')
          .delete(1),
      );
      expect(this.container).toEqualHTML(
        '<p>0123</p><p><img src="/assets/favicon.png"></p>',
      );
    });

    it('insert inline embed with delete before block embed using delete op first', function () {
      const editor = this.initialize(
        Editor,
        '<p>0123</p><iframe src="#" class="ql-video" frameborder="0" allowfullscreen="true"></iframe>',
      );
      editor.applyDelta(
        new Delta()
          .retain(5)
          .delete(1)
          .insert({ image: '/assets/favicon.png' })
          // Explicit newline required to maintain correct index calculation for the delete.
          .insert('\n'),
      );
      expect(this.container).toEqualHTML(
        '<p>0123</p><p><img src="/assets/favicon.png"></p>',
      );
    });

    it('insert inline embed and text with delete before block embed', function () {
      const editor = this.initialize(
        Editor,
        '<p>0123</p><iframe src="#" class="ql-video" frameborder="0" allowfullscreen="true"></iframe>',
      );
      editor.applyDelta(
        new Delta()
          .retain(5)
          .insert({ image: '/assets/favicon.png' })
          // Explicit newline required to maintain correct index calculation for the delete.
          .insert('abc\n')
          .delete(1),
      );
      expect(this.container).toEqualHTML(
        '<p>0123</p><p><img src="/assets/favicon.png">abc</p>',
      );
    });

    it('insert inline embed to the middle of formatted content', function () {
      const editor = this.initialize(Editor, '<p><strong>0123</strong></p>');
      editor.applyDelta(
        new Delta().retain(2).insert({ image: '/assets/favicon.png' }),
      );
      expect(this.container).toEqualHTML(
        '<p><strong>01</strong><img src="/assets/favicon.png"><strong>23</strong></p>',
      );
    });

    it('insert block embed with delete before block embed', function () {
      const editor = this.initialize(
        Editor,
        '<p>0123</p><iframe src="#" class="ql-video" frameborder="0" allowfullscreen="true"></iframe>',
      );
      editor.applyDelta(
        new Delta().retain(5).insert({ video: '#changed' }).delete(1),
      );
      expect(this.container).toEqualHTML(
        '<p>0123</p><iframe src="#changed" class="ql-video" frameborder="0" allowfullscreen="true"></iframe>',
      );
    });

    it('deletes block embed and appends text', function () {
      const editor = this.initialize(
        Editor,
        `<p><br></p><iframe class="ql-video" frameborder="0" allowfullscreen="true" src="#"></iframe><p>b</p>`,
      );
      editor.applyDelta(new Delta().retain(1).insert('a').delete(1));
      expect(this.container).toEqualHTML('<p><br></p><p>ab</p>');
    });

    it('multiple delete block embed and append texts', function () {
      const editor = this.initialize(
        Editor,
        `<p><br></p><iframe class="ql-video" frameborder="0" allowfullscreen="true" src="#"></iframe><iframe class="ql-video" frameborder="0" allowfullscreen="true" src="#"></iframe><p>b</p>`,
      );
      editor.applyDelta(
        new Delta().retain(1).insert('a').delete(1).insert('!').delete(1),
      );
      expect(this.container).toEqualHTML('<p><br></p><p>a!b</p>');
    });

    it('multiple nonconsecutive delete block embed and append texts', function () {
      const editor = this.initialize(
        Editor,
        `<p><br></p>
         <iframe class="ql-video" frameborder="0" allowfullscreen="true" src="#"></iframe>
         <p>a</p>
         <iframe class="ql-video" frameborder="0" allowfullscreen="true" src="#"></iframe>
         <p>bb</p>
         <iframe class="ql-video" frameborder="0" allowfullscreen="true" src="#"></iframe>
         <p>ccc</p>
         <iframe class="ql-video" frameborder="0" allowfullscreen="true" src="#"></iframe>
         <p>dddd</p>`,
      );
      const old = editor.getDelta();
      const delta = new Delta()
        .retain(1)
        .insert('1')
        .delete(1)
        .retain(2)
        .insert('2')
        .delete(1)
        .retain(3)
        .insert('3')
        .delete(1)
        .retain(4)
        .insert('4')
        .delete(1);
      editor.applyDelta(delta);
      expect(editor.getDelta()).toEqual(old.compose(delta));
      expect(this.container).toEqualHTML(
        '<p><br></p><p>1a</p><p>2bb</p><p>3ccc</p><p>4dddd</p>',
      );
    });

    describe('block embed', function () {
      it('improper block embed insert', function () {
        const editor = this.initialize(Editor, '<p>0123</p>');
        editor.applyDelta(new Delta().retain(2).insert({ video: '#' }));
        expect(this.container).toEqualHTML(
          '<p>01</p><iframe src="#" class="ql-video" frameborder="0" allowfullscreen="true"></iframe><p>23</p>',
        );
      });

      describe('insert and delete', function () {
        it('prepend', function () {
          const editor = this.initialize(Editor, '<p>0123</p>');
          editor.applyDelta(new Delta().insert({ video: '#' }).delete(2));
          expect(this.container).toEqualHTML(
            '<iframe src="#" class="ql-video" frameborder="0" allowfullscreen="true"></iframe><p>23</p>',
          );
        });

        it('insert to the middle of text', function () {
          const editor = this.initialize(Editor, `<p>abc</p>`);
          editor.applyDelta(
            new Delta().retain(1).insert({ video: '#' }).delete(2),
          );
          expect(this.container).toEqualHTML(
            '<p>a</p><iframe class="ql-video" frameborder="0" allowfullscreen="true" src="#"></iframe><p><br></p>',
          );
        });

        it('insert after \\n', function () {
          const editor = this.initialize(Editor, `<p>a</p><p>cda</p>`);
          editor.applyDelta(
            new Delta().retain(2).insert({ video: '#' }).delete(2),
          );
          expect(this.container).toEqualHTML(
            '<p>a</p><iframe class="ql-video" frameborder="0" allowfullscreen="true" src="#"></iframe><p>a</p>',
          );
        });

        it('insert after an inline embed', function () {
          const editor = this.initialize(
            Editor,
            `<p><img src="/assets/favicon.png"></p><p>abc</p>`,
          );
          editor.applyDelta(
            new Delta().retain(1).insert({ video: '#' }).delete(2),
          );
          expect(this.container).toEqualHTML(
            '<p><img src="/assets/favicon.png"></p><iframe class="ql-video" frameborder="0" allowfullscreen="true" src="#"></iframe><p>bc</p>',
          );
        });

        it('insert after a block embed', function () {
          const editor = this.initialize(
            Editor,
            `<iframe class="ql-video" frameborder="0" allowfullscreen="true" src="#"></iframe><p>abc</p>`,
          );
          editor.applyDelta(
            new Delta().retain(1).insert({ video: '#' }).delete(2),
          );
          expect(this.container).toEqualHTML(
            '<iframe class="ql-video" frameborder="0" allowfullscreen="true" src="#"></iframe><iframe class="ql-video" frameborder="0" allowfullscreen="true" src="#"></iframe><p>c</p>',
          );
        });
      });

      it('append formatted block embed', function () {
        const editor = this.initialize(Editor, '<p>0123</p><p><br></p>');
        editor.applyDelta(
          new Delta().retain(5).insert({ video: '#' }, { align: 'right' }),
        );
        expect(this.container).toEqualHTML(
          '<p>0123</p><iframe src="#" class="ql-video ql-align-right" frameborder="0" allowfullscreen="true"></iframe><p><br></p>',
        );
      });
    });

    it('append', function () {
      const editor = this.initialize(Editor, '<p>0123</p>');
      editor.applyDelta(new Delta().retain(5).insert('5678'));
      expect(this.container).toEqualHTML('<p>0123</p><p>5678</p>');
    });

    it('append newline', function () {
      const editor = this.initialize(Editor, '<p>0123</p>');
      editor.applyDelta(new Delta().retain(5).insert('\n', { header: 2 }));
      expect(this.container).toEqualHTML('<p>0123</p><h2><br></h2>');
    });

    it('append text with newline', function () {
      const editor = this.initialize(Editor, '<p>0123</p>');
      editor.applyDelta(
        new Delta().retain(5).insert('5678').insert('\n', { header: 2 }),
      );
      expect(this.container).toEqualHTML('<p>0123</p><h2>5678</h2>');
    });

    it('append non-isolated newline', function () {
      const editor = this.initialize(Editor, '<p>0123</p>');
      editor.applyDelta(new Delta().retain(5).insert('5678\n', { header: 2 }));
      expect(this.container).toEqualHTML('<p>0123</p><h2>5678</h2>');
    });

    it('eventual append', function () {
      const editor = this.initialize(Editor, '<p>0123</p>');
      editor.applyDelta(
        new Delta()
          .retain(2)
          .insert('ab\n', { header: 1 })
          .retain(3)
          .insert('cd\n', { header: 2 }),
      );
      expect(this.container).toEqualHTML('<h1>01ab</h1><p>23</p><h2>cd</h2>');
    });

    it('append text, embed and newline', function () {
      const editor = this.initialize(Editor, '<p>0123</p>');
      editor.applyDelta(
        new Delta()
          .retain(5)
          .insert('5678')
          .insert({ image: '/assets/favicon.png' })
          .insert('\n', { header: 2 }),
      );
      expect(this.container).toEqualHTML(
        '<p>0123</p><h2>5678<img src="/assets/favicon.png"></h2>',
      );
    });

    it('append multiple lines', function () {
      const editor = this.initialize(Editor, '<p>0123</p>');
      editor.applyDelta(
        new Delta()
          .retain(5)
          .insert('56')
          .insert('\n', { header: 1 })
          .insert('89')
          .insert('\n', { header: 2 }),
      );
      expect(this.container).toEqualHTML('<p>0123</p><h1>56</h1><h2>89</h2>');
    });

    it('code block', function () {
      const editor = this.initialize(Editor, {
        html: '<p>0</p><div class="ql-code-block-container"><div class="ql-code-block">1</div><div class="ql-code-block">23</div></div><p><br></p>',
      });
      editor.applyDelta(new Delta().delete(4).retain(1).delete(2));
      expect(editor.scroll.domNode.innerHTML).toEqual('<p>2</p>');
    });
  });

  describe('getFormat()', function () {
    it('unformatted', function () {
      const editor = this.initialize(Editor, '<p>0123</p>');
      expect(editor.getFormat(1)).toEqual({});
    });

    it('formatted', function () {
      const editor = this.initialize(Editor, '<h1><em>0123</em></h1>');
      expect(editor.getFormat(1)).toEqual({ header: 1, italic: true });
    });

    it('cursor', function () {
      const editor = this.initialize(
        Editor,
        '<h1><strong><em>0123</em></strong></h1><h2><u>5678</u></h2>',
      );
      expect(editor.getFormat(2)).toEqual({
        bold: true,
        italic: true,
        header: 1,
      });
    });

    it('cursor with preformat', function () {
      const [editor, selection] = this.initialize(
        [Editor, Selection],
        '<h1><strong><em>0123</em></strong></h1>',
      );
      selection.setRange(new Range(2));
      selection.format('underline', true);
      selection.format('color', 'red');
      expect(editor.getFormat(2)).toEqual({
        bold: true,
        italic: true,
        header: 1,
        color: 'red',
        underline: true,
      });
    });

    it('across leaves', function () {
      const editor = this.initialize(
        Editor,
        `
        <h1>
          <strong class="ql-size-small"><em>01</em></strong>
          <em class="ql-size-large"><u>23</u></em>
          <em class="ql-size-huge"><u>45</u></em>
        </h1>
      `,
      );
      expect(editor.getFormat(1, 4)).toEqual({
        italic: true,
        header: 1,
        size: ['small', 'large', 'huge'],
      });
    });

    it('across leaves repeated', function () {
      const editor = this.initialize(
        Editor,
        `
        <h1>
          <strong class="ql-size-small"><em>01</em></strong>
          <em class="ql-size-large"><u>23</u></em>
          <em class="ql-size-huge"><u>45</u></em>
          <em class="ql-size-small"><u>45</u></em>
        </h1>
      `,
      );
      expect(editor.getFormat(1, 4)).toEqual({
        italic: true,
        header: 1,
        size: ['small', 'large', 'huge'],
      });
    });

    it('across lines repeated', function () {
      const editor = this.initialize(
        Editor,
        `
        <h1 class="ql-align-right"><em>01</em></h1>
        <h1 class="ql-align-center"><em>34</em></h1>
        <h1 class="ql-align-right"><em>36</em></h1>
        <h1 class="ql-align-center"><em>33</em></h1>
      `,
      );
      expect(editor.getFormat(1, 3)).toEqual({
        italic: true,
        header: 1,
        align: ['right', 'center'],
      });
    });
    it('across lines', function () {
      const editor = this.initialize(
        Editor,
        `
        <h1 class="ql-align-right"><em>01</em></h1>
        <h1 class="ql-align-center"><em>34</em></h1>
      `,
      );
      expect(editor.getFormat(1, 3)).toEqual({
        italic: true,
        header: 1,
        align: ['right', 'center'],
      });
    });
  });

  describe('getHTML', function () {
    it('inline', function () {
      const editor = this.initialize(Editor, '<blockquote>Test</blockquote>');
      expect(editor.getHTML(1, 2)).toEqual('es');
    });

    it('across lines', function () {
      const editor = this.initialize(
        Editor,
        '<h1 class="ql-align-center">Header</h1><p>Text</p><blockquote>Quote</blockquote>',
      );
      expect(editor.getHTML(1, 14)).toEqual(
        '<h1 class="ql-align-center">eader</h1><p>Text</p><blockquote>Quo</blockquote>',
      );
    });

    it('mixed list', function () {
      const editor = this.initialize(
        Editor,
        `
          <ol>
            <li data-list="ordered">One</li>
            <li data-list="ordered">Two</li>
            <li data-list="bullet">Foo</li>
            <li data-list="bullet">Bar</li>
          </ol>
        `,
      );
      expect(editor.getHTML(2, 12)).toEqualHTML(`
        <ol>
          <li>e</li>
          <li>Two</li>
        </ol>
        <ul>
          <li>Foo</li>
          <li>Ba</li>
        </ul>
      `);
    });

    it('nested list', function () {
      const editor = this.initialize(
        Editor,
        `
          <ol>
            <li data-list="ordered">One</li>
            <li data-list="ordered">Two</li>
            <li data-list="bullet" class="ql-indent-1">Alpha</li>
            <li data-list="ordered" class="ql-indent-2">I</li>
            <li data-list="ordered" class="ql-indent-2">II</li>
            <li data-list="ordered">Three</li>
          </ol>
        `,
      );
      expect(editor.getHTML(2, 20)).toEqualHTML(`
        <ol>
          <li>e</li>
          <li>Two
            <ul>
              <li>Alpha
                <ol>
                  <li>I</li>
                  <li>II</li>
                </ol>
              </li>
            </ul>
          </li>
          <li>Thr</li>
        </ol>
      `);
    });

    it('nested checklist', function () {
      const editor = this.initialize(
        Editor,
        `
          <ol>
            <li data-list="checked">One</li>
            <li data-list="checked">Two</li>
            <li data-list="unchecked" class="ql-indent-1">Alpha</li>
            <li data-list="checked" class="ql-indent-2">I</li>
            <li data-list="checked" class="ql-indent-2">II</li>
            <li data-list="checked">Three</li>
          </ol>
        `,
      );
      expect(editor.getHTML(2, 20)).toEqualHTML(`
        <ul>
          <li data-list="checked">e</li>
          <li data-list="checked">Two
            <ul>
              <li data-list="unchecked">Alpha
                <ul>
                  <li data-list="checked">I</li>
                  <li data-list="checked">II</li>
                </ul>
              </li>
            </ul>
          </li>
          <li data-list="checked">Thr</li>
        </ul>
      `);
    });

    it('partial list', function () {
      const editor = this.initialize(
        Editor,
        `
        <ol>
          <li data-list="ordered">1111</li>
          <li data-list="ordered" class="ql-indent-1">AAAA</li>
          <li data-list="ordered" class="ql-indent-2">IIII</li>
          <li data-list="ordered" class="ql-indent-1">BBBB</li>
          <li data-list="ordered">2222</li>
        </ol>
        `,
      );
      expect(editor.getHTML(12, 12)).toEqualHTML(`
        <ol>
          <li>
            <ol>
              <li>
                <ol>
                  <li>II</li>
                </ol>
              </li>
              <li>BBBB</li>
            </ol>
          </li>
          <li>2222</li>
        </ol>
      `);
    });

    it('text within tag', function () {
      const editor = this.initialize(Editor, '<p><a>a</a></p>');
      expect(editor.getHTML(0, 1)).toEqual('<a>a</a>');
    });

    it('escape html', function () {
      const editor = this.initialize(Editor, '<p><br></p>');
      editor.insertText(0, '<b>Test</b>');
      expect(editor.getHTML(0, 11)).toEqual('&lt;b&gt;Test&lt;/b&gt;');
    });

    it('multiline code', function () {
      const editor = this.initialize(
        Editor,
        '<p><br></p><p>0123</p><p><br></p><p><br></p><p>4567</p><p><br></p>',
      );
      const length = editor.scroll.length();
      editor.formatLine(0, length, { 'code-block': 'javascript' });

      expect(editor.getHTML(0, length)).toEqual(
        '<pre>\n\n0123\n\n\n4567\n\n</pre>',
      );
      expect(editor.getHTML(1, 7)).toEqual('<pre>\n0123\n\n\n\n</pre>');
      expect(editor.getHTML(2, 7)).toEqual('<pre>\n123\n\n\n4\n</pre>');
      expect(editor.getHTML(5, 7)).toEqual('<pre>\n\n\n\n4567\n</pre>');
    });
  });
});
