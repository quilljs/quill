import './polyfill';
import Delta from 'quill-delta';
import Editor from './editor';
import Emitter from './emitter';
import Module from './module';
import Parchment from 'parchment';
import Selection, { Range } from './selection';
import extend from 'extend';
import logger from './logger';
import Theme from './theme';
import Security from './security';

let debug = logger('quill');


class Quill {
  static debug(limit) {
    if (limit === true) {
      limit = 'log';
    }
    logger.level(limit);
  }

  static find(node) {
    return node.__quill || Parchment.find(node);
  }

  static import(name) {
    if (this.imports[name] == null) {
      debug.error(`Cannot import ${name}. Are you sure it was registered?`);
    }
    return this.imports[name];
  }

  static register(path, target, overwrite = false) {
    if (typeof path !== 'string') {
      let name = path.attrName || path.blotName;
      if (typeof name === 'string') {
        // register(Blot | Attributor, overwrite)
        this.register('formats/' + name, path, target);
      } else {
        Object.keys(path).forEach((key) => {
          this.register(key, path[key], target);
        });
      }
    } else {
      if (this.imports[path] != null && !overwrite) {
        debug.warn(`Overwriting ${path} with`, target);
      }
      this.imports[path] = target;
      if ((path.startsWith('blots/') || path.startsWith('formats/')) &&
          target.blotName !== 'abstract') {
        Parchment.register(target);
      } else if (path.startsWith('modules') && typeof target.register === 'function') {
        target.register();
      }
    }
  }

  constructor(container, options = {}) {
    this.options = expandConfig(container, options);
    this.container = this.options.container;
    if (this.container == null) {
      return debug.error('Invalid Quill container', container);
    }
    if (this.options.debug) {
      Quill.debug(this.options.debug);
    }
    let html = this.container.innerHTML.trim();
    this.container.classList.add('ql-container');
    this.container.textContent = '';
    this.container.__quill = this;
    this.root = this.addContainer('ql-editor');
    this.root.classList.add('ql-blank');
    this.root.setAttribute('data-gramm', false);
    this.scrollingContainer = this.options.scrollingContainer || this.root;
    this.emitter = new Emitter();
    this.scroll = Parchment.create(this.root, {
      emitter: this.emitter,
      whitelist: this.options.formats
    });
    this.editor = new Editor(this.scroll);
    this.selection = new Selection(this.scroll, this.emitter);
    this.theme = new this.options.theme(this, this.options);
    this.keyboard = this.theme.addModule('keyboard');
    this.clipboard = this.theme.addModule('clipboard');
    this.history = this.theme.addModule('history');
    this.theme.init();
    this.emitter.on(Emitter.events.EDITOR_CHANGE, (type) => {
      if (type === Emitter.events.TEXT_CHANGE) {
        this.root.classList.toggle('ql-blank', this.editor.isBlank());
      }
    });
    this.emitter.on(Emitter.events.SCROLL_UPDATE, (source, mutations) => {
      let range = this.selection.lastRange;
      let index = range && range.length === 0 ? range.index : undefined;
      modify.call(this, () => {
        return this.editor.update(null, mutations, index);
      }, source);
    });
    // Security: Blessed HTML is already part of the DOM.
    let initialContents = Quill.import('core/security').blessHTML(`<div class='ql-editor' style="white-space: normal;">${html}<p><br></p></div>`);
    let contents = this.clipboard.convert(initialContents);
    this.setContents(contents);
    this.history.clear();
    if (this.options.placeholder) {
      this.root.setAttribute('data-placeholder', this.options.placeholder);
    }
    if (this.options.readOnly) {
      this.disable();
    }
  }

  addContainer(container, refNode = null) {
    if (typeof container === 'string') {
      let className = container;
      container = document.createElement('div');
      container.classList.add(className);
    }
    this.container.insertBefore(container, refNode);
    return container;
  }

  blur() {
    this.selection.setRange(null);
  }

  deleteText(index, length, source) {
    [index, length, , source] = overload(index, length, source);
    return modify.call(this, () => {
      return this.editor.deleteText(index, length);
    }, source, index, -1*length);
  }

  disable() {
    this.enable(false);
  }

  enable(enabled = true) {
    this.scroll.enable(enabled);
    this.container.classList.toggle('ql-disabled', !enabled);
  }

  focus() {
    let scrollTop = this.scrollingContainer.scrollTop;
    this.selection.focus();
    this.scrollingContainer.scrollTop = scrollTop;
    this.scrollIntoView();
  }

  format(name, value, source = Emitter.sources.API) {
    return modify.call(this, () => {
      let range = this.getSelection(true);
      let change = new Delta();
      if (range == null) {
        return change;
      } else if (Parchment.query(name, Parchment.Scope.BLOCK)) {
        change = this.editor.formatLine(range.index, range.length, { [name]: value });
      } else if (range.length === 0) {
        this.selection.format(name, value);
        return change;
      } else {
        change = this.editor.formatText(range.index, range.length, { [name]: value });
      }
      this.setSelection(range, Emitter.sources.SILENT);
      return change;
    }, source);
  }

  formatLine(index, length, name, value, source) {
    let formats;
    [index, length, formats, source] = overload(index, length, name, value, source);
    return modify.call(this, () => {
      return this.editor.formatLine(index, length, formats);
    }, source, index, 0);
  }

  formatText(index, length, name, value, source) {
    let formats;
    [index, length, formats, source] = overload(index, length, name, value, source);
    return modify.call(this, () => {
      return this.editor.formatText(index, length, formats);
    }, source, index, 0);
  }

  getBounds(index, length = 0) {
    let bounds;
    if (typeof index === 'number') {
      bounds = this.selection.getBounds(index, length);
    } else {
      bounds = this.selection.getBounds(index.index, index.length);
    }
    let containerBounds = this.container.getBoundingClientRect();
    return {
      bottom: bounds.bottom - containerBounds.top,
      height: bounds.height,
      left: bounds.left - containerBounds.left,
      right: bounds.right - containerBounds.left,
      top: bounds.top - containerBounds.top,
      width: bounds.width
    };
  }

  getContents(index = 0, length = this.getLength() - index) {
    [index, length] = overload(index, length);
    return this.editor.getContents(index, length);
  }

  getFormat(index = this.getSelection(true), length = 0) {
    if (typeof index === 'number') {
      return this.editor.getFormat(index, length);
    } else {
      return this.editor.getFormat(index.index, index.length);
    }
  }

  getIndex(blot) {
    return blot.offset(this.scroll);
  }

  getLength() {
    return this.scroll.length();
  }

  getLeaf(index) {
    return this.scroll.leaf(index);
  }

  getLine(index) {
    return this.scroll.line(index);
  }

  getLines(index = 0, length = Number.MAX_VALUE) {
    if (typeof index !== 'number') {
      return this.scroll.lines(index.index, index.length);
    } else {
      return this.scroll.lines(index, length);
    }
  }

  getModule(name) {
    return this.theme.modules[name];
  }

  getSelection(focus = false) {
    if (focus) this.focus();
    this.update();  // Make sure we access getRange with editor in consistent state
    return this.selection.getRange()[0];
  }

  getText(index = 0, length = this.getLength() - index) {
    [index, length] = overload(index, length);
    return this.editor.getText(index, length);
  }

  hasFocus() {
    return this.selection.hasFocus();
  }

  insertEmbed(index, embed, value, source = Quill.sources.API) {
    return modify.call(this, () => {
      return this.editor.insertEmbed(index, embed, value);
    }, source, index);
  }

  insertText(index, text, name, value, source) {
    let formats;
    [index, , formats, source] = overload(index, 0, name, value, source);
    return modify.call(this, () => {
      return this.editor.insertText(index, text, formats);
    }, source, index, text.length);
  }

  isEnabled() {
    return !this.container.classList.contains('ql-disabled');
  }

  off() {
    return this.emitter.off.apply(this.emitter, arguments);
  }

  on() {
    return this.emitter.on.apply(this.emitter, arguments);
  }

  once() {
    return this.emitter.once.apply(this.emitter, arguments);
  }

  pasteHTML(index, html, source) {
    this.clipboard.dangerouslyPasteHTML(index, html, source);
  }

  removeFormat(index, length, source) {
    [index, length, , source] = overload(index, length, source);
    return modify.call(this, () => {
      return this.editor.removeFormat(index, length);
    }, source, index);
  }

  scrollIntoView() {
    this.selection.scrollIntoView(this.scrollingContainer);
  }

  setContents(delta, source = Emitter.sources.API) {
    return modify.call(this, () => {
      delta = new Delta(delta);
      let length = this.getLength();
      let deleted = this.editor.deleteText(0, length);
      let applied = this.editor.applyDelta(delta);
      let lastOp = applied.ops[applied.ops.length - 1];
      if (lastOp != null && typeof(lastOp.insert) === 'string' && lastOp.insert[lastOp.insert.length-1] === '\n') {
        this.editor.deleteText(this.getLength() - 1, 1);
        applied.delete(1);
      }
      let ret = deleted.compose(applied);
      return ret;
    }, source);
  }

  setSelection(index, length, source) {
    if (index == null) {
      this.selection.setRange(null, length || Quill.sources.API);
    } else {
      [index, length, , source] = overload(index, length, source);
      this.selection.setRange(new Range(index, length), source);
      if (source !== Emitter.sources.SILENT) {
        this.selection.scrollIntoView(this.scrollingContainer);
      }
    }
  }

  setText(text, source = Emitter.sources.API) {
    let delta = new Delta().insert(text);
    return this.setContents(delta, source);
  }

  update(source = Emitter.sources.USER) {
    let change = this.scroll.update(source);   // Will update selection before selection.update() does if text changes
    this.selection.update(source);
    return change;
  }

  updateContents(delta, source = Emitter.sources.API) {
    return modify.call(this, () => {
      delta = new Delta(delta);
      return this.editor.applyDelta(delta, source);
    }, source, true);
  }
}
Quill.DEFAULTS = {
  bounds: null,
  formats: null,
  modules: {},
  placeholder: '',
  readOnly: false,
  scrollingContainer: null,
  strict: true,
  theme: 'default'
};
Quill.events = Emitter.events;
Quill.sources = Emitter.sources;
// eslint-disable-next-line no-undef
Quill.version = typeof(QUILL_VERSION) === 'undefined' ? 'dev' : QUILL_VERSION;

Quill.imports = {
  'delta'         : Delta,
  'parchment'     : Parchment,
  'core/module'   : Module,
  'core/theme'    : Theme,
  'core/security' : new Security(),
};


function expandConfig(container, userConfig) {
  userConfig = extend(true, {
    container: container,
    modules: {
      clipboard: true,
      keyboard: true,
      history: true
    }
  }, userConfig);
  if (!userConfig.theme || userConfig.theme === Quill.DEFAULTS.theme) {
    userConfig.theme = Theme;
  } else {
    userConfig.theme = Quill.import(`themes/${userConfig.theme}`);
    if (userConfig.theme == null) {
      throw new Error(`Invalid theme ${userConfig.theme}. Did you register it?`);
    }
  }
  let themeConfig = extend(true, {}, userConfig.theme.DEFAULTS);
  [themeConfig, userConfig].forEach(function(config) {
    config.modules = config.modules || {};
    Object.keys(config.modules).forEach(function(module) {
      if (config.modules[module] === true) {
        config.modules[module] = {};
      }
    });
  });
  let moduleNames = Object.keys(themeConfig.modules).concat(Object.keys(userConfig.modules));
  let moduleConfig = moduleNames.reduce(function(config, name) {
    let moduleClass = Quill.import(`modules/${name}`);
    if (moduleClass == null) {
      debug.error(`Cannot load ${name} module. Are you sure you registered it?`);
    } else {
      config[name] = moduleClass.DEFAULTS || {};
    }
    return config;
  }, {});
  // Special case toolbar shorthand
  if (userConfig.modules != null && userConfig.modules.toolbar &&
      userConfig.modules.toolbar.constructor !== Object) {
    userConfig.modules.toolbar = {
      container: userConfig.modules.toolbar
    };
  }
  userConfig = extend(true, {}, Quill.DEFAULTS, { modules: moduleConfig }, themeConfig, userConfig);
  ['bounds', 'container', 'scrollingContainer'].forEach(function(key) {
    if (typeof userConfig[key] === 'string') {
      userConfig[key] = document.querySelector(userConfig[key]);
    }
  });
  userConfig.modules = Object.keys(userConfig.modules).reduce(function(config, name) {
    if (userConfig.modules[name]) {
      config[name] = userConfig.modules[name];
    }
    return config;
  }, {});
  return userConfig;
}

// Handle selection preservation and TEXT_CHANGE emission
// common to modification APIs
function modify(modifier, source, index, shift) {
  if (this.options.strict && !this.isEnabled() && source === Emitter.sources.USER) {
    return new Delta();
  }
  let range = index == null ? null : this.getSelection();
  let oldDelta = this.editor.delta;
  let change = modifier();
  if (range != null) {
    if (index === true) index = range.index;
    if (shift == null) {
      range = shiftRange(range, change, source);
    } else if (shift !== 0) {
      range = shiftRange(range, index, shift, source);
    }
    this.setSelection(range, Emitter.sources.SILENT);
  }
  if (change.length() > 0) {
    let args = [Emitter.events.TEXT_CHANGE, change, oldDelta, source];
    this.emitter.emit(Emitter.events.EDITOR_CHANGE, ...args);
    if (source !== Emitter.sources.SILENT) {
      this.emitter.emit(...args);
    }
  }
  return change;
}

function overload(index, length, name, value, source) {
  let formats = {};
  if (typeof index.index === 'number' && typeof index.length === 'number') {
    // Allow for throwaway end (used by insertText/insertEmbed)
    if (typeof length !== 'number') {
      source = value, value = name, name = length, length = index.length, index = index.index;
    } else {
      length = index.length, index = index.index;
    }
  } else if (typeof length !== 'number') {
    source = value, value = name, name = length, length = 0;
  }
  // Handle format being object, two format name/value strings or excluded
  if (typeof name === 'object') {
    formats = name;
    source = value;
  } else if (typeof name === 'string') {
    if (value != null) {
      formats[name] = value;
    } else {
      source = name;
    }
  }
  // Handle optional source
  source = source || Emitter.sources.API;
  return [index, length, formats, source];
}

function shiftRange(range, index, length, source) {
  if (range == null) return null;
  let start, end;
  if (index instanceof Delta) {
    [start, end] = [range.index, range.index + range.length].map(function(pos) {
      return index.transformPosition(pos, source !== Emitter.sources.USER);
    });
  } else {
    [start, end] = [range.index, range.index + range.length].map(function(pos) {
      if (pos < index || (pos === index && source === Emitter.sources.USER)) return pos;
      if (length >= 0) {
        return pos + length;
      } else {
        return Math.max(index, pos + length);
      }
    });
  }
  return new Range(start, end - start);
}


export { expandConfig, overload, Quill as default };
