---
layout: docs
title: Toolbar Module
permalink: /docs/modules/toolbar/
---
<!-- head -->
<link href="{{ site.cdn }}{{ site.version }}/quill.snow.css" rel="stylesheet">
<!-- head -->

The Toolbar module allow users to easily format Quill's contents.

<div class="quill-wrapper">
  <div id="toolbar-toolbar" class="toolbar">
  {% include full-toolbar.html %}
  </div>
  <div id="toolbar-editor" class="editor"></div>
</div>

It can be configured with a custom container and handlers.

```javascript
var quill = new Quill('#editor', {
  modules: {
    toolbar: {
      container: '#toolbar',  // Selector for toolbar container
      handlers: {
        'bold': customBoldHandler
      }
    }
  }
});
```

Because the `container` option is so common, a top level shorthand is also allowed.

```javascript
var quill = new Quill('#editor', {
  modules: {
    // Equivalent to { toolbar: { container: '#toolbar' }}
    toolbar: '#toolbar'
  }
});
```


## Container

Toolbar controls can either be specified by a simple array of format names or a custom HTML container.

To begin with the simpler array option:

```javascript
var toolbarOptions = ['bold', 'italic', 'underline', 'strike'];

var quill = new Quill('#editor', {
  modules: {
    toolbar: toolbarOptions
  }
});
```
or
```javascript
var toolbarOptions = {
    container: ['bold', 'italic', 'underline', 'strike'] 
};

var quill = new Quill('#editor', {
  modules: {
    toolbar: toolbarOptions
  }
});
```

Controls can also be grouped by one level of nesting an array. This will wrap controls in a `<span>` with class name `ql-formats`, providing structure for themes to utilize. For example [Snow](/docs/themes/#snow/) adds extra spacing between control groups.

```javascript
var toolbarOptions = [['bold', 'italic'], ['link', 'image']];
```

Buttons with custom values can be specified with an Object with the name of the format as its only key.

```javascript
var toolbarOptions = [{ 'header': '3' }];
```

Dropdowns are similarly specified by an Object, but with an array of possible values. CSS is used to control the visual labels for dropdown options.

```javascript
// Note false, not 'normal', is the correct value
// quill.format('size', false) removes the format,
// allowing default styling to work
var toolbarOptions = [
  { size: [ 'small', false, 'large', 'huge' ]}
];
```

Note [Themes](/docs/themes/) may also specify default values for dropdowns. For example, [Snow](/docs/themes/#snow/) provides a default list of 35 colors for the `color` and `background` formats, if set to an empty array.

```javascript
var toolbarOptions = [
  ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
  ['blockquote', 'code-block'],

  [{ 'header': 1 }, { 'header': 2 }],               // custom button values
  [{ 'list': 'ordered'}, { 'list': 'bullet' }],
  [{ 'script': 'sub'}, { 'script': 'super' }],      // superscript/subscript
  [{ 'indent': '-1'}, { 'indent': '+1' }],          // outdent/indent
  [{ 'direction': 'rtl' }],                         // text direction

  [{ 'size': ['small', false, 'large', 'huge'] }],  // custom dropdown
  [{ 'header': [1, 2, 3, 4, 5, 6, false] }],

  [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
  [{ 'font': [] }],
  [{ 'align': [] }],

  ['clean']                                         // remove formatting button
];

var quill = new Quill('#editor', {
  modules: {
    toolbar: toolbarOptions
  },
  theme: 'snow'
});
```

For use cases requiring even more customization, you can manually create a toolbar in HTML, and pass the DOM element or selector into Quill. The `ql-toolbar` class will be added to the toolbar container and Quill attach appropriate handlers to `<button>` and `<select>` elements with a class name in the form `ql-${format}`. Buttons element may optionally have a custom `value` attribute.

```html
<!-- Create toolbar container -->
<div id="toolbar">
  <!-- Add font size dropdown -->
  <select class="ql-size">
    <option value="small"></option>
    <!-- Note a missing, thus falsy value, is used to reset to default -->
    <option selected></option>
    <option value="large"></option>
    <option value="huge"></option>
  </select>
  <!-- Add a bold button -->
  <button class="ql-bold"></button>
  <!-- Add subscript and superscript buttons -->
  <button class="ql-script" value="sub"></button>
  <button class="ql-script" value="super"></button>
</div>
<div id="editor"></div>

<!-- Initialize editor with toolbar -->
<script>
  var quill = new Quill('#editor', {
    modules: {
      toolbar: '#toolbar'
    }
  });
</script>
```

Note by supplying your own HTML element, Quill searches for particular input elements, but your own inputs that have nothing to do with Quill can still be added and styled and coexist.

```html
<div id="toolbar">
  <!-- Add buttons as you would before -->
  <button class="ql-bold"></button>
  <button class="ql-italic"></button>

  <!-- But you can also add your own -->
  <button id="custom-button"></button>
</div>
<div id="editor"></div>

<script>
var quill = new Quill('#editor', {
  modules: {
    toolbar: '#toolbar'
  }
});

var customButton = document.querySelector('#custom-button');
customButton.addEventListener('click', function() {
  console.log('Clicked!');
});
</script>
```


## Handlers

The toolbar controls by default applies and removes formatting, but you can also overwrite this with custom handlers, for example in order to show external UI.

Handler functions will be bound to the toolbar (so using `this` will refer to the toolbar instance) and passed the `value` attribute of the input if the corresponding format is inactive, and `false` otherwise. Adding a custom handler will overwrite the default toolbar and theme behavior.

```javascript
var toolbarOptions = {
  handlers: {
    // handlers object will be merged with default handlers object
    'link': function(value) {
      if (value) {
        var href = prompt('Enter the URL');
        this.quill.format('link', href);
      } else {
        this.quill.format('link', false);
      }
    }
  }
}

var quill = new Quill('#editor', {
  modules: {
    toolbar: toolbarOptions
  }
});

// Handlers can also be added post initialization
var toolbar = quill.getModule('toolbar');
toolbar.addHandler('image', showImageUI);
```

<!-- script -->
<script src="{{site.cdn}}{{site.version}}/{{site.quill}}"></script>
<script>
  var quill = new Quill('#toolbar-editor', {
    modules: {
      toolbar: { container: '#toolbar-toolbar' }
    },
    theme: 'snow'
  });
</script>
<!-- script -->
