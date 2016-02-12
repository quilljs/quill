import Delta from 'rich-text/lib/delta';
import Editor from '../../../src/editor';


describe('Formats', function() {
  describe('Header', function() {
    it('init', function() {
      let editor = this.initialize(Editor, '<h1>Header</h1><h2>Subheader</h2><h3>Subsubheader</h3>');
      expect(editor.getDelta()).toEqual(new Delta()
        .insert('Header')
        .insert('\n', { header: 1 })
        .insert('Subheader')
        .insert('\n', { header: 2 })
        .insert('Subsubheader')
        .insert('\n', { header: 3 })
      );
    });

    it('set', function() {
      let editor = this.initialize(Editor, '<p><em>0123</em></p>');
      editor.formatText(4, 5, { header: 1 });
      expect(editor.getDelta()).toEqual(new Delta()
        .insert('0123', { italic: true })
        .insert('\n', { header: 1 })
      );
      expect(this.container.innerHTML).toEqualHTML('<h1><em>0123</em></h1>');
    });

    it('remove', function() {
      let editor = this.initialize(Editor, '<h1><em>0123</em></h1>');
      editor.formatText(4, 5, { header: false });
      expect(editor.getDelta()).toEqual(new Delta()
        .insert('0123', { italic: true })
        .insert('\n')
      );
      expect(this.container.innerHTML).toEqualHTML('<p><em>0123</em></p>');
    });

    it('change', function() {
      let editor = this.initialize(Editor, '<h1><em>0123</em></h1>');
      editor.formatText(4, 5, { header: 2 });
      expect(editor.getDelta()).toEqual(new Delta()
        .insert('0123', { italic: true })
        .insert('\n', { header: 2 })
      );
      expect(this.container.innerHTML).toEqualHTML('<h2><em>0123</em></h2>');
    });
  });
});
