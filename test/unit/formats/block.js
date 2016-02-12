import Delta from 'rich-text/lib/delta';
import Editor from '../../../src/editor';


describe('Block', function() {
  it('definition', function() {
    let editor = this.initialize(Editor, `
      <h1>0</h1>
      <h2>2</h2>
      <h3>4</h3>
      <ul>
        <li>6</li>
      </ul>
      <ol>
        <li>8</li>
      </ol>`
    );
    expect(editor.getDelta()).toEqual(new Delta()
      .insert('0')
      .insert('\n', { header: 1 })
      .insert('2')
      .insert('\n', { header: 2 })
      .insert('4')
      .insert('\n', { header: 3 })
      .insert('6')
      .insert('\n', { list: 'bullet' })
      .insert('8')
      .insert('\n', { list: 'ordered' })
    );
  });
});
