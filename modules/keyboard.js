import clone from 'clone';
import equal from 'deep-equal';
import Delta from 'rich-text/lib/delta';
import Parchment from 'parchment';
import Quill from '../core/quill';
import logger from '../core/logger';
import Module from '../core/module';
import { Range } from '../core/selection';
import Block from '../blots/block';

let debug = logger('quill:keyboard');


class Keyboard extends Module {
  static match(evt, binding) {
    binding = normalize(binding);
    let metaKey = /Mac/i.test(navigator.platform) ? evt.metaKey : evt.metaKey || evt.ctrlKey;
    if (!!binding.metaKey !== metaKey && binding.metaKey !== null) return false;
    if (!!binding.shiftKey !== evt.shiftKey && binding.shiftKey !== null) return false;
    if (!!binding.altKey !== evt.altKey && binding.altKey !== null) return false;
    return true;
  }

  constructor(quill, options) {
    super(quill, options);
    this.bindings = {};
    this.addBinding({ key: 'B', metaKey: true }, this.onFormat.bind(this, 'bold'));
    this.addBinding({ key: 'I', metaKey: true }, this.onFormat.bind(this, 'italic'));
    this.addBinding({ key: 'U', metaKey: true }, this.onFormat.bind(this, 'underline'));
    this.addBinding({ key: Keyboard.keys.ENTER, shiftKey: null }, this.onEnter.bind(this));
    this.addBinding({ key: Keyboard.keys.BACKSPACE }, this.onDelete.bind(this, true));
    this.addBinding({ key: Keyboard.keys.DELETE }, this.onDelete.bind(this, false));
    // TODO implement
    // this.addBinding({ key: Keyboard.keys.BACKSPACE }, this.onDeleteWord.bind(this, true));
    // this.addBinding({ key: Keyboard.keys.DELETE }, this.onDeleteWord.bind(this, false));
    this.addBinding({ key: Keyboard.keys.TAB, shiftKey: null }, this.onTab.bind(this));
    this.quill.root.addEventListener('keydown', (evt) => {
      let which = evt.which || evt.keyCode;
      let handlers = (this.bindings[which] || []).reduce(function(handlers, binding) {
        let [key, handler] = binding;
        if (Keyboard.match(evt, key)) handlers.push(handler);
        return handlers;
      }, []);
      if (handlers.length > 0) {
        let range = this.quill.getSelection();
        handlers.forEach((handler) => {
          if (evt.defaultPrevented) return;
          handler(range, evt);
        });
        evt.preventDefault();
      }
    });
  }

  addBinding(binding, handler) {
    binding = normalize(binding);
    if (binding == null) {
      return debug.warn('Attempted to add invalid keyboard binding', binding);
    }
    this.bindings[binding.key] = this.bindings[binding.key] || [];
    this.bindings[binding.key].push([binding, handler]);
  }

  onDelete(backspace, range) {
    if (range.length > 0) {
      this.quill.deleteText(range, Quill.sources.USER);
    } else if (!backspace) {
      this.quill.deleteText(range.index, 1, Quill.sources.USER);
    } else {
      let [line, offset] = this.quill.scroll.descendant(Block, range.index);
      let formats = this.quill.getFormat(range);
      if (line != null && offset === 0 && (formats['indent'] || formats['list'])) {
        if (formats['indent'] != null) {
          line.format('indent', parseInt(formats['indent']) - 1, Quill.sources.USER);
        } else {
          line.format('list', false);
        }
      } else {
        this.quill.deleteText(range.index - 1, 1, Quill.sources.USER);
        range = new Range(Math.max(0, range.index - 1));
      }
    }
    this.quill.setSelection(range.index, Quill.sources.SILENT);
  }

  onEnter(range) {
    let formats = this.quill.getFormat(range);
    let lineFormats = Object.keys(formats).reduce(function(lineFormats, format) {
      if (Parchment.query(format, Parchment.Scope.BLOCK)) {
        lineFormats[format] = formats[format];
      }
      return lineFormats;
    }, {});
    let added = 1;
    let delta = new Delta()
      .retain(range.index)
      .insert('\n', lineFormats);
    delta.delete(range.length);
    this.quill.updateContents(delta, Quill.sources.USER);
    this.quill.setSelection(range.index + added, Quill.sources.SILENT);
    Object.keys(formats).forEach((name) => {
      if (lineFormats[name] == null) {
        this.quill.format(name, formats[name]);
      }
    });
  }

  onFormat(format, range) {
    let formats = this.quill.getFormat(range);
    this.quill.format(format, !formats[format], Quill.sources.USER);
  }

  onTab(range, evt) {
    if (range.length === 0) {
      let delta = new Delta().retain(range.index).insert('\t').delete(range.length);
      this.quill.updateContents(delta, Quill.sources.USER);
      this.quill.setSelection(range.index + 1, Quill.sources.SILENT);
    } else {
      let modifier = evt.shiftKey ? -1 : 1;
      this.quill.scroll.descendants(Block, range.index, range.length).forEach(function(line) {
        let format = line.formats();
        let indent = parseInt(format['indent'] || 0);
        line.format('indent', Math.max(0, indent + modifier));
      });
      this.quill.update(Quill.sources.USER);
      this.quill.setSelection(range, Quill.sources.SILENT);
    }
  }

  removeAllBindings(binding, handler = null) {
    binding = normalize(binding);
    if (binding == null || this.bindings[binding.key] == null) return [];
    let removed = [];
    this.bindings[binding.key] = this.bindings[binding.key].filter(function(target) {
      let [key, callback] = target;
      if (equal(key, binding) && (handler == null || callback === handler)) {
        removed.push(handler);
        return false;
      }
      return true;
    });
    return removed;
  }

  removeBinding(binding, handler) {
    this.removeAllBindings(binding, handler);
  }
}

Keyboard.keys = {
  BACKSPACE: 8,
  TAB: 9,
  ENTER: 13,
  ESCAPE: 27,
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40,
  DELETE: 46
}

function normalize(binding) {
  switch (typeof binding) {
    case 'string':
      if (Keyboard.keys[binding.toUpperCase()] != null) {
        binding = clone(Keyboard.keys[binding.toUpperCase()], false);
      } else if (binding.length === 1) {
        binding = { key: binding };
      } else {
        return null;
      }
      break;
    case 'number':
      binding = { key: binding };
      break;
    case 'object':
      binding = clone(binding, false);
      break;
    default:
      return null;
  }
  if (typeof binding.key === 'string') {
    binding.key = binding.key.toUpperCase().charCodeAt(0);
  }
  return binding;
}


export default Keyboard;
