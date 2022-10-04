---
layout: docs
title: Formats
permalink: /docs/formats/
redirect_from:
  - /docs/modules/formula/
  - /docs/modules/formulas/
---

Quill supports a number of formats, both in UI controls and API calls.

By default all formats are enabled and allowed to exist within a Quill editor and can be configured with the [formats](/docs/configuration/#formats) option. This is separate from adding a control in the [Toolbar](/docs/modules/toolbar/). For example, you can configure Quill to allow bolded content to be pasted into an editor that has no bold button in the toolbar.

{% include standalone/full.html %}

<a class="standalone-link" href="/standalone/full/">Standalone</a>

To define formats on configuration:

```javascript
var options = {
  formats: ['bold', 'italic', 'underline', 'color']
};
var editor = new Quill('#editor', options);
```

#### Inline

  - Background Color - `background`
  - Bold - `bold`
  - Color - `color`
  - Font - `font`
  - Inline Code - `code`
  - Italic - `italic`
  - Link - `link`
  - Size - `size`
  - Strikethrough - `strike`
  - Superscript/Subscript - `script`
  - Underline - `underline`

#### Block

  - Blockquote - `blockquote`
  - Header - `header`
  - Indent - `indent`
  - List - `list`
  - Text Alignment - `align`
  - Text Direction - `direction`
  - Code Block - `code-block`

#### Embeds

  - Formula - `formula` (requires [KaTex](https://khan.github.io/KaTeX/))
  - Image - `image`
  - Video - `video`
