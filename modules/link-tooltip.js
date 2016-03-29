import Emitter from '../core/emitter';
import { bindKeys } from './keyboard';
import LinkBlot from '../formats/link';
import Module from '../core/module';
import { Range } from '../core/selection';


class LinkTooltip extends Module {
  constructor(quill, options = {}) {
    super(quill, options);
    this.container = this.quill.addContainer('ql-link-tooltip');
    this.container.classList.add('ql-tooltip');
    this.hide();
    this.container.innerHTML = this.options.template;
    this.preview = this.container.querySelector('a.ql-preview');
    this.textbox = this.container.querySelector('input[type=text]');
    bindKeys(this.textbox, {
      'enter': this.save.bind(this),
      'escape': this.hide.bind(this)
    });
    this.clickHandler = this.clickHandler.bind(this);
    this.remove = this.remove.bind(this);
    this.bind();
    // quill.keyboard.addBinding({ key: 'K', metaKey: true }, this.show.bind(this));
    quill.on(Emitter.events.SELECTION_CHANGE, (range) => {
      if (range != null && range.length === 0) {
        let offset;
        [this.link, offset] = this.quill.scroll.descendant(LinkBlot, range.index);
        if (this.link != null) {
          this.range = new Range(range.index - offset, this.link.length());
          return this.show();
        }
      }
      this.hide();
    });
  }

  bind() {
    this.container.querySelector('a.ql-action').addEventListener('click', this.clickHandler);
    this.container.querySelector('a.ql-remove').addEventListener('click', this.remove);
  }

  unbind() {
    this.container.querySelector('a.ql-action').removeEventListener('click', this.clickHandler);
    this.container.querySelector('a.ql-remove').removeEventListener('click', this.remove);
  }

  destroy() {
    this.unbind();
  }

  clickHandler() {
    if (this.container.classList.contains('ql-editing')) {
      this.save();
    } else {
      this.edit();
    }
  }

  edit() {
    this.container.classList.add('ql-editing');
    this.textbox.focus();
    this.textbox.setSelectionRange(0, this.textbox.value.length);
  }

  open() {
    this.range = new Range(this.quill.selection.savedRange.index, this.quill.selection.savedRange.length);
    this.show();
    this.edit();
  }

  hide() {
    this.range = this.link = null;
    this.container.classList.add('ql-hidden');
  }

  position(bounds) {
    this.container.style.left = (bounds.left + bounds.width/2 - this.container.offsetWidth/2) + 'px';
    this.container.style.top = (bounds.bottom + this.options.offset) + 'px';
  }

  remove() {
    this.quill.formatText(this.range, 'link', false, Emitter.sources.USER);
    this.quill.setSelection(this.range, Emitter.sources.SILENT);
    this.hide();
  }

  save() {
    let url = this.textbox.value;
    this.quill.formatText(this.range, 'link', url, Emitter.sources.USER);
    this.quill.setSelection(this.range, Emitter.sources.SILENT);
    this.hide();
  }

  show() {
    this.container.classList.remove('ql-editing');
    this.container.classList.remove('ql-hidden');
    let preview, bounds;
    let range = this.quill.selection.savedRange;
    if (this.link != null) {
      preview = this.link.formats()['link'];
    } else {
      preview = this.quill.getText(range);
    }
    this.preview.textContent = this.textbox.value = preview;
    this.preview.setAttribute('href', preview);
    this.position(this.quill.getBounds(this.range));
  }
}
LinkTooltip.DEFAULTS = {
  offset: 10,
  template: [
    '<a class="ql-preview" target="_blank" href="about:blank"></a>',
    '<input type="text">',
    '<a class="ql-action"></a>',
    '<a class="ql-remove"></a>'
  ].join('')
};


export default LinkTooltip;
