## Content

### deleteText

Deletes text from the editor. [Source](/docs/api/#events) may be `"user"`, `"api"`, or `"silent"`.

**Methods**

```javascript
deleteText(index: Number, length: Number, source: String = 'api')
```

**Examples**

```javascript
quill.deleteText(6, 4);
```

### disable

Shorthand for [`enable(false)`](#enable).

### enable

Set ability for user to edit, via input devices like the mouse or keyboard. Does not affect capabilities of API calls.

**Methods**

```javascript
enable(enabled: boolean = true)
```

**Examples**

```javascript
quill.enable();
quill.enable(false);   // Disables user input
```

### getContents

Retrieves contents of the editor, with formatting data, represented by a [Delta](/guides/working-with-deltas/) object.

**Methods**

```javascript
getContents(index: Number = 0, length: Number = remaining): Delta
```

**Examples**

```javascript
var delta = quill.getContents();
```

### getLength

Retrieves the length of the editor contents. Note even when Quill is empty, there is still a blank line represented by '\n', so `getLength` will return 1.

**Methods**

```javascript
getLength(): Number
```

**Examples**

```javascript
var length = quill.getLength();
```

### getText

Retrieves the string contents of the editor. `length` defaults to the length of the remaining document. Note even when Quill is empty, there is still a blank line in the editor, so `getText` will return '\n'.

**Methods**

```javascript
getText(index: Number = 0, length: Number = remaining): String
```

**Examples**

```javascript
var text = quill.getText(0, 10);
```

### insertEmbed

Insert embedded content into the editor. [Source](/docs/api/#events) may be `"user"`, `"api"`, or `"silent"`.

**Methods**

```javascript
insertEmbed(index: Number, type: String, value: any, source: String = 'api')
```

**Examples**

```javascript
quill.insertEmbed(10, 'image', 'http://quilljs.com/images/cloud.png');
```

### insertText

Inserts text into the editor, optionally with a specified format or multiple [formats](/docs/formats/). [Source](/docs/api/#events) may be `"user"`, `"api"`, or `"silent"`.

**Methods**

```javascript
insertText(index: Number, text: String, source: String = 'api')
insertText(index: Number, text: String, format: String, value: any,
           source: String = 'api')
insertText(index: Number, text: String, formats: { [String]: any },
           source: String = 'api')
```

**Examples**

```javascript
quill.insertText(0, 'Hello', 'bold', true);

quill.insertText(5, 'Quill', {
  'color': '#ffff00',
  'italic': true
});
```

### pasteHTML

Inserts content into editor at a given index from an HTML snippet. The snippet is interpreted and cleaned by the [clipboard](/docs/modules/clipboard/) before being inserted into Quill. If no insertion index is provided, the entire editor contents will be overwritten. [Source](/docs/api/#events) may be `"user"`, `"api"`, or `"silent"`.

**Methods**

```javascript
pasteHTML(html: String, source: String = 'api')
pasteHTML(index: Number, html: String, source: String = 'api')
```

**Examples**

```javascript
quill.setText('Hello!');

quill.pasteHTML(5, '&nbsp;<b>World</b>');
// Editor is now '<p>Hello&nbsp;<strong>World</strong>!</p>';

```

### setContents

Overwrites editor with given contents. Contents should end with a newline (see [Working with Deltas](/guides/working-with-deltas/)). [Source](/docs/api/#events) may be `"user"`, `"api"`, or `"silent"`.

**Methods**

```javascript
setContents(delta: Delta, source: String = 'api')
```

**Examples**

```javascript
quill.setContents([
  { insert: 'Hello ' },
  { insert: 'World!', attributes: { bold: true } },
  { insert: '\n' }
]);
```

### setText

Sets contents of editor with given text. Note Quill documents must end with a newline so one will be added for you if omitted.  [Source](/docs/api/#events) may be `"user"`, `"api"`, or `"silent"`.

**Methods**

```javascript
setText(text: String, source: String = 'api')
```

**Examples**

```javascript
quill.setText('Hello\n');
```

### update

Synchronously check editor for user updates and fires events, if changes have occurred. Useful for collaborative use cases during conflict resolution requiring the latest up to date state. [Source](/docs/api/#events) may be `"user"`, `"api"`, or `"silent"`.

**Methods**

```javascript
update(source: String = 'user')
```

**Examples**

```javascript
quill.update();
```

### updateContents

Applies Delta to editor contents. [Source](/docs/api/#events) may be `"user"`, `"api"`, or `"silent"`.

**Methods**

```javascript
updateContents(delta: Delta, source: String = 'api')
```

**Examples**

```javascript
// Assuming editor currently contains [{ insert: 'Hello World!' }]
quill.updateContents({
  ops: [
    { retain: 6 },        // Keep 'Hello '
    { delete: 5 },        // 'World' is deleted
    { insert: 'Quill' },  // Insert 'Quill'
    { retain: 1, attributes: { bold: true } }    // Apply bold to exclamation mark
  ]
});
// Editor should now be [{ insert: 'Hello Quill' }, { insert: '!', attributes: { bold: true} }]
```
