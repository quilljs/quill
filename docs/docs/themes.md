---
layout: docs
title: Themes
permalink: /docs/themes/
redirect_from:
  - /docs/themes/bubble/
  - /docs/themes/snow/
---
<!-- head -->
<link rel="stylesheet" href="{{site.katex}}/katex.min.css">
<link rel="stylesheet" href="{{site.highlightjs}}/styles/monokai-sublime.min.css">
<link rel="stylesheet" href="{{site.cdn}}{{site.version}}/quill.snow.css">
<link rel="stylesheet" href="{{site.cdn}}{{site.version}}/quill.bubble.css">
<style>
  #bubble-container .ql-editor {
    border: 1px solid #ccc;
  }
  .standalone-container .ql-editor {
    height: 350px;
  }
</style>
<!-- head -->

Themes allow you to easily make your editor look good with minimal effort. Quill features two officially supported themes: [Snow](#snow) and [Bubble](#bubble).

### Usage

```html
<!-- Add the theme's stylesheet -->
<link rel="stylesheet" href="https:{{site.cdn}}{{site.version}}/quill.bubble.css">

<script src="{{site.cdn}}{{site.version}}/quill.js"></script>
<script>
var quill = new Quill('#editor', {
  theme: 'bubble'   // Specify theme in configuration
});
</script>
```

## Bubble

Bubble is a simple tooltip based theme.

<div class="standalone-container">
  <div id="bubble-container"></div>
</div>
<a class="standalone-link" href="/standalone/bubble/">Standalone</a>

## Snow

Snow is a clean, flat toolbar theme.

<div class="standalone-container">
  <div id="snow-container"></div>
</div>
<a class="standalone-link" href="/standalone/snow/">Standalone</a>


### Customization

Themes primarily control the visual look of Quill through its CSS stylesheet, and many changes can easily be made by overriding these rules. This is easiest to do, as with any other web application, by simply using your browser developer console to inspect the elements to view the rules affecting them.

Many other customizations can be done through the respective modules. For example, the toolbar is perhaps the most visible user interface, but much of the customization is done through the [Toolbar module](/docs/modules/toolbar/).


<!-- script -->
<script src="{{site.katex}}/katex.min.js"></script>
<script src="{{site.highlightjs}}/highlight.min.js"></script>
<script src="{{site.cdn}}{{site.version}}/{{site.quill}}"></script>
<script>
  var snowQuill = new Quill('#snow-container', {
    placeholder: 'Compose an epic...',
    modules: {
      toolbar: [
        [{ header: [] }],
        ['bold', 'italic', 'underline', 'link'],
        [{ color: [] }, { background: [] }],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['clean']
      ]
    },
    theme: 'snow'
  });
  var bubbleQuill = new Quill('#bubble-container', {
    placeholder: 'Compose an epic...',
    theme: 'bubble'
  });
</script>
<!-- script -->
