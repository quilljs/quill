import Delta from 'rich-text/lib/delta';
import Editor from '../../../src/editor';


describe('List', function() {
  it('format', function() {
    let editor = this.initialize(Editor, `
      <p>0123</p>
      <p>5678</p>
      <p>0123</p>`
    );
    editor.formatText(9, 10, { list: 'ordered' });
    expect(editor.getDelta()).toEqual(new Delta()
      .insert('0123\n5678')
      .insert('\n', { list: 'ordered' })
      .insert('0123\n')
    );
    expect(this.container.innerHTML).toEqualHTML(`
      <p>0123</p>
      <ol>
        <li>5678</li>
      </ol>
      <p>0123</p>`
    );
  });

  it('remove', function() {
    let editor = this.initialize(Editor, `
      <p>0123</p>
      <ol>
        <li>5678</li>
      </ol>
      <p>0123</p>`
    );
    editor.formatText(9, 10, { list: null });
    expect(editor.getDelta()).toEqual(new Delta().insert('0123\n5678\n0123\n'));
    expect(this.container.innerHTML).toEqualHTML(`
      <p>0123</p>
      <p>5678</p>
      <p>0123</p>`
    );
  });

  it('replace', function() {
    let editor = this.initialize(Editor, `
      <p>0123</p>
      <ol>
        <li>5678</li>
      </ol>
      <p>0123</p>`
    );
    editor.formatText(9, 10, { list: 'bullet' });
    expect(editor.getDelta()).toEqual(new Delta()
      .insert('0123\n5678')
      .insert('\n', { list: 'bullet' })
      .insert('0123\n')
    );
    expect(this.container.innerHTML).toEqualHTML(`
      <p>0123</p>
      <ul>
        <li>5678</li>
      </ul>
      <p>0123</p>`
    );
  });

  it('format merge', function() {
    let editor = this.initialize(Editor, `
      <ol>
        <li>0123</li>
      </ol>
      <p>5678</p>
      <ol>
        <li>0123</li>
      </ol>`
    );
    editor.formatText(9, 10, { list: 'ordered' });
    expect(editor.getDelta()).toEqual(new Delta()
      .insert('0123')
      .insert('\n', { list: 'ordered' })
      .insert('5678')
      .insert('\n', { list: 'ordered' })
      .insert('0123')
      .insert('\n', { list: 'ordered' })
    );
    expect(this.container.innerHTML).toEqualHTML(`
      <ol>
        <li>0123</li>
        <li>5678</li>
        <li>0123</li>
      </ol>`
    );
  });

  it('replace merge', function() {
    let editor = this.initialize(Editor, `
      <ol><li>0123</li></ol>
      <ul><li>5678</li></ul>
      <ol><li>0123</li></ol>`
    );
    editor.formatText(9, 10, { list: 'ordered' });
    expect(editor.getDelta()).toEqual(new Delta()
      .insert('0123')
      .insert('\n', { list: 'ordered' })
      .insert('5678')
      .insert('\n', { list: 'ordered' })
      .insert('0123')
      .insert('\n', { list: 'ordered' })
    );
    expect(this.container.innerHTML).toEqualHTML(`
      <ol>
        <li>0123</li>
        <li>5678</li>
        <li>0123</li>
      </ol>`
    );
  });

  it('delete merge', function() {
    let editor = this.initialize(Editor, `
      <ol><li>0123</li></ol>
      <p>5678</p>
      <ol><li>0123</li></ol>`
    );
    editor.deleteText(5, 10);
    expect(editor.getDelta()).toEqual(new Delta()
      .insert('0123')
      .insert('\n', { list: 'ordered' })
      .insert('0123')
      .insert('\n', { list: 'ordered' })
    );
    expect(this.container.innerHTML).toEqualHTML(`
      <ol>
        <li>0123</li>
        <li>0123</li>
      </ol>`
    );
  });

  it('replace split', function() {
    let editor = this.initialize(Editor, `
      <ol>
        <li>0123</li>
        <li>5678</li>
        <li>0123</li>
      </ol>`
    );
    editor.formatText(9, 10,  { list: 'bullet' });
    expect(editor.getDelta()).toEqual(new Delta()
      .insert('0123')
      .insert('\n', { list: 'ordered' })
      .insert('5678')
      .insert('\n', { list: 'bullet' })
      .insert('0123')
      .insert('\n', { list: 'ordered' })
    );
    expect(this.container.innerHTML).toEqualHTML(`
      <ol><li>0123</li></ol>
      <ul><li>5678</li></ul>
      <ol><li>0123</li></ol>`
    );
  });

  it('empty line interop', function() {
    let editor = this.initialize(Editor, '<ol><li></li></ol>');
    expect(this.container.innerHTML).toEqualHTML('<ol><li><br></li></ol>');
    editor.insertText(0, 'Test');
    expect(this.container.innerHTML).toEqualHTML('<ol><li>Test</li></ol>');
    editor.deleteText(0, 4);
    expect(this.container.innerHTML).toEqualHTML('<ol><li><br></li></ol>');
  });
});
