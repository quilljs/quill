import Delta from 'quill-delta';
import cloneDeep from 'lodash.clonedeep';
import merge from 'lodash.merge';
import * as Parchment from 'parchment';
import Editor from './editor';
import Emitter from './emitter';
import Module from './module';
import Selection, { Range } from './selection';
import instances from './instances';
import logger from './logger';
import Theme from './theme';

const debug = logger('quill');

const defaultNamespace = Symbol('defaultNamespace');

const namespaces = {
  [defaultNamespace]: {
    registry: null,
    imports: {
      delta: Delta,
      parchment: Parchment,
      'core/module': Module,
      'core/theme': Theme,
    },
  },
};

Parchment.ParentBlot.uiClass = 'ql-ui';

class Quill {
  static debug(limit) {
    if (limit === true) {
      limit = 'log';
    }
    logger.level(limit);
  }

  static getNamespace(namespace = defaultNamespace) {
    if (!namespaces[namespace]) {
      namespaces[namespace] = { registry: null, imports: {} };
    }
    if (!namespaces[namespace].registry) {
      namespaces[namespace].registry = new Parchment.Registry();
      Object.keys(this.defaultDefinitions).forEach(path => {
        this.register(path, this.defaultDefinitions[path], { namespace });
      });
    }

    return namespaces[namespace];
  }

  static find(node) {
    return instances.get(node) || this.getNamespace().registry.find(node);
  }

  static import(name, options = {}) {
    const { imports } = this.getNamespace(options.namespace);
    if (imports[name] == null) {
      debug.error(`Cannot import ${name}. Are you sure it was registered?`);
    }
    return imports[name];
  }

  static register(path, target, options = {}) {
    if (typeof path !== 'string') {
      const name = path.attrName || path.blotName;
      if (typeof name === 'string') {
        // register(Blot | Attributor, overwrite)
        this.register(`formats/${name}`, path, target);
      } else {
        Object.keys(path).forEach(key => {
          this.register(key, path[key], target);
        });
      }
    } else {
      if (typeof options === 'boolean') {
        options = { overwrite: options };
      }
      const { overwrite = false, namespace } = options;
      const { registry, imports } = this.getNamespace(namespace);
      if (imports[path] != null && !overwrite) {
        debug.warn(`Overwriting ${path} with`, target);
      }
      imports[path] = target;

      if (
        (path.startsWith('blots/') || path.startsWith('formats/')) &&
        target.blotName !== 'abstract'
      ) {
        registry.register(target);
      }
      if (typeof target.register === 'function') {
        target.register(options);
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
    const html = this.container.innerHTML.trim();
    this.container.classList.add('ql-container');
    this.container.innerHTML = '';
    instances.set(this.container, this);
    this.root = this.addContainer('ql-editor');
    this.root.classList.add('ql-blank');
    this.scrollingContainer = this.options.scrollingContainer || this.root;
    this.emitter = new Emitter();
    const { registry } = Quill.getNamespace(this.options.namespace);
    const ScrollBlot = registry.query(Parchment.ScrollBlot.blotName);
    this.scroll = new ScrollBlot(registry, this.root, {
      emitter: this.emitter,
    });
    this.editor = new Editor(this.scroll);
    this.selection = new Selection(this.scroll, this.emitter);
    this.theme = new this.options.theme(this, this.options); // eslint-disable-line new-cap
    this.keyboard = this.theme.addModule('keyboard');
    this.clipboard = this.theme.addModule('clipboard');
    this.history = this.theme.addModule('history');
    this.uploader = this.theme.addModule('uploader');
    this.theme.init();
    this.emitter.on(Emitter.events.EDITOR_CHANGE, type => {
      if (type === Emitter.events.TEXT_CHANGE) {
        this.root.classList.toggle('ql-blank', this.editor.isBlank());
      }
    });
    this.emitter.on(Emitter.events.SCROLL_UPDATE, (source, mutations) => {
      const oldRange = this.selection.lastRange;
      const [newRange] = this.selection.getRange();
      const selectionInfo =
        oldRange && newRange ? { oldRange, newRange } : undefined;
      modify.call(
        this,
        () => this.editor.update(null, mutations, selectionInfo),
        source,
      );
    });
    if (html) {
      const contents = this.clipboard.convert({
        html: `${html}<p><br></p>`,
        text: '\n',
      });
      this.setContents(contents);
    }
    this.history.clear();
    if (this.options.placeholder) {
      this.root.setAttribute('data-placeholder', this.options.placeholder);
    }
    if (this.options.readOnly) {
      this.disable();
    }
    this.allowReadOnlyEdits = false;
  }

  addContainer(container, refNode = null) {
    if (typeof container === 'string') {
      const className = container;
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
    return modify.call(
      this,
      () => {
        return this.editor.deleteText(index, length);
      },
      source,
      index,
      -1 * length,
    );
  }

  disable() {
    this.enable(false);
  }

  editReadOnly(modifier) {
    this.allowReadOnlyEdits = true;
    const value = modifier();
    this.allowReadOnlyEdits = false;
    return value;
  }

  enable(enabled = true) {
    this.scroll.enable(enabled);
    this.container.classList.toggle('ql-disabled', !enabled);
  }

  focus() {
    const { scrollTop } = this.scrollingContainer;
    this.selection.focus();
    this.scrollingContainer.scrollTop = scrollTop;
    this.scrollIntoView();
  }

  format(name, value, source = Emitter.sources.API) {
    return modify.call(
      this,
      () => {
        const range = this.getSelection(true);
        let change = new Delta();
        if (range == null) return change;
        if (this.scroll.query(name, Parchment.Scope.BLOCK)) {
          change = this.editor.formatLine(range.index, range.length, {
            [name]: value,
          });
        } else if (range.length === 0) {
          this.selection.format(name, value);
          return change;
        } else {
          change = this.editor.formatText(range.index, range.length, {
            [name]: value,
          });
        }
        this.setSelection(range, Emitter.sources.SILENT);
        return change;
      },
      source,
    );
  }

  formatLine(index, length, name, value, source) {
    let formats;
    // eslint-disable-next-line prefer-const
    [index, length, formats, source] = overload(
      index,
      length,
      name,
      value,
      source,
    );
    return modify.call(
      this,
      () => {
        return this.editor.formatLine(index, length, formats);
      },
      source,
      index,
      0,
    );
  }

  formatText(index, length, name, value, source) {
    let formats;
    // eslint-disable-next-line prefer-const
    [index, length, formats, source] = overload(
      index,
      length,
      name,
      value,
      source,
    );
    return modify.call(
      this,
      () => {
        return this.editor.formatText(index, length, formats);
      },
      source,
      index,
      0,
    );
  }

  getBounds(index, length = 0) {
    let bounds;
    if (typeof index === 'number') {
      bounds = this.selection.getBounds(index, length);
    } else {
      bounds = this.selection.getBounds(index.index, index.length);
    }
    if (!bounds) return null;
    const containerBounds = this.container.getBoundingClientRect();
    return {
      bottom: bounds.bottom - containerBounds.top,
      height: bounds.height,
      left: bounds.left - containerBounds.left,
      right: bounds.right - containerBounds.left,
      top: bounds.top - containerBounds.top,
      width: bounds.width,
    };
  }

  getContents(index = 0, length = this.getLength() - index) {
    [index, length] = overload(index, length);
    return this.editor.getContents(index, length);
  }

  getFormat(index = this.getSelection(true), length = 0) {
    if (typeof index === 'number') {
      return this.editor.getFormat(index, length);
    }
    return this.editor.getFormat(index.index, index.length);
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
    }
    return this.scroll.lines(index, length);
  }

  getModule(name) {
    return this.theme.modules[name];
  }

  getSelection(focus = false) {
    if (focus) this.focus();
    this.update(); // Make sure we access getRange with editor in consistent state
    return this.selection.getRange()[0];
  }

  getSemanticHTML(index = 0, length = this.getLength() - index) {
    [index, length] = overload(index, length);
    return this.editor.getHTML(index, length);
  }

  getText(index = 0, length = this.getLength() - index) {
    [index, length] = overload(index, length);
    return this.editor.getText(index, length);
  }

  hasFocus() {
    return this.selection.hasFocus();
  }

  insertEmbed(index, embed, value, source = Quill.sources.API) {
    return modify.call(
      this,
      () => {
        return this.editor.insertEmbed(index, embed, value);
      },
      source,
      index,
    );
  }

  insertText(index, text, name, value, source) {
    let formats;
    // eslint-disable-next-line prefer-const
    [index, , formats, source] = overload(index, 0, name, value, source);
    return modify.call(
      this,
      () => {
        return this.editor.insertText(index, text, formats);
      },
      source,
      index,
      text.length,
    );
  }

  isEnabled() {
    return this.scroll.isEnabled();
  }

  off(...args) {
    return this.emitter.off(...args);
  }

  on(...args) {
    return this.emitter.on(...args);
  }

  once(...args) {
    return this.emitter.once(...args);
  }

  removeFormat(index, length, source) {
    [index, length, , source] = overload(index, length, source);
    return modify.call(
      this,
      () => {
        return this.editor.removeFormat(index, length);
      },
      source,
      index,
    );
  }

  scrollIntoView() {
    this.selection.scrollIntoView(this.scrollingContainer);
  }

  setContents(delta, source = Emitter.sources.API) {
    return modify.call(
      this,
      () => {
        delta = new Delta(delta);
        const length = this.getLength();
        // Quill will set empty editor to \n
        const delete1 = this.editor.deleteText(0, length);
        // delta always applied before existing content
        const applied = this.editor.applyDelta(delta);
        // Remove extra \n from empty editor initialization
        const delete2 = this.editor.deleteText(this.getLength() - 1, 1);
        return delete1.compose(applied).compose(delete2);
      },
      source,
    );
  }

  setSelection(index, length, source) {
    if (index == null) {
      this.selection.setRange(null, length || Quill.sources.API);
    } else {
      [index, length, , source] = overload(index, length, source);
      this.selection.setRange(new Range(Math.max(0, index), length), source);
      if (source !== Emitter.sources.SILENT) {
        this.selection.scrollIntoView(this.scrollingContainer);
      }
    }
  }

  setText(text, source = Emitter.sources.API) {
    const delta = new Delta().insert(text);
    return this.setContents(delta, source);
  }

  update(source = Emitter.sources.USER) {
    const change = this.scroll.update(source); // Will update selection before selection.update() does if text changes
    this.selection.update(source);
    // TODO this is usually undefined
    return change;
  }

  updateContents(delta, source = Emitter.sources.API) {
    return modify.call(
      this,
      () => {
        delta = new Delta(delta);
        return this.editor.applyDelta(delta, source);
      },
      source,
      true,
    );
  }
}
Quill.DEFAULTS = {
  bounds: null,
  modules: {},
  placeholder: '',
  readOnly: false,
  scrollingContainer: null,
  theme: 'default',
};
Quill.events = Emitter.events;
Quill.sources = Emitter.sources;
Quill.defaultDefinitions = {};
// eslint-disable-next-line no-undef
Quill.version = typeof QUILL_VERSION === 'undefined' ? 'dev' : QUILL_VERSION;

function expandConfig(container, userConfig) {
  userConfig = merge(
    {
      container,
      modules: {
        clipboard: true,
        keyboard: true,
        history: true,
        uploader: true,
      },
    },
    userConfig,
  );
  const { namespace } = userConfig;
  if (!userConfig.theme || userConfig.theme === Quill.DEFAULTS.theme) {
    userConfig.theme = Theme;
  } else {
    userConfig.theme = Quill.import(`themes/${userConfig.theme}`, {
      namespace,
    });
    if (userConfig.theme == null) {
      throw new Error(
        `Invalid theme ${userConfig.theme}. Did you register it?`,
      );
    }
  }
  const themeConfig = cloneDeep(userConfig.theme.DEFAULTS);
  [themeConfig, userConfig].forEach(config => {
    config.modules = config.modules || {};
    Object.keys(config.modules).forEach(module => {
      if (config.modules[module] === true) {
        config.modules[module] = {};
      }
    });
  });
  const moduleNames = Object.keys(themeConfig.modules).concat(
    Object.keys(userConfig.modules),
  );
  const moduleConfig = moduleNames.reduce((config, name) => {
    const moduleClass = Quill.import(`modules/${name}`, { namespace });
    if (moduleClass == null) {
      debug.error(
        `Cannot load ${name} module. Are you sure you registered it?`,
      );
    } else {
      config[name] = moduleClass.DEFAULTS || {};
    }
    return config;
  }, {});
  // Special case toolbar shorthand
  if (
    userConfig.modules != null &&
    userConfig.modules.toolbar &&
    userConfig.modules.toolbar.constructor !== Object
  ) {
    userConfig.modules.toolbar = {
      container: userConfig.modules.toolbar,
    };
  }
  userConfig = merge(
    {},
    Quill.DEFAULTS,
    { modules: moduleConfig },
    themeConfig,
    userConfig,
  );
  ['bounds', 'container', 'scrollingContainer'].forEach(key => {
    if (typeof userConfig[key] === 'string') {
      userConfig[key] = document.querySelector(userConfig[key]);
    }
  });
  userConfig.modules = Object.keys(userConfig.modules).reduce(
    (config, name) => {
      if (userConfig.modules[name]) {
        config[name] = userConfig.modules[name];
      }
      return config;
    },
    {},
  );
  return userConfig;
}

// Handle selection preservation and TEXT_CHANGE emission
// common to modification APIs
function modify(modifier, source, index, shift) {
  if (
    !this.isEnabled() &&
    source === Emitter.sources.USER &&
    !this.allowReadOnlyEdits
  ) {
    return new Delta();
  }
  let range = index == null ? null : this.getSelection();
  const oldDelta = this.editor.delta;
  const change = modifier();
  if (range != null) {
    if (index === true) {
      index = range.index; // eslint-disable-line prefer-destructuring
    }
    if (shift == null) {
      range = shiftRange(range, change, source);
    } else if (shift !== 0) {
      range = shiftRange(range, index, shift, source);
    }
    this.setSelection(range, Emitter.sources.SILENT);
  }
  if (change.length() > 0) {
    const args = [Emitter.events.TEXT_CHANGE, change, oldDelta, source];
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
      source = value;
      value = name;
      name = length;
      length = index.length; // eslint-disable-line prefer-destructuring
      index = index.index; // eslint-disable-line prefer-destructuring
    } else {
      length = index.length; // eslint-disable-line prefer-destructuring
      index = index.index; // eslint-disable-line prefer-destructuring
    }
  } else if (typeof length !== 'number') {
    source = value;
    value = name;
    name = length;
    length = 0;
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
  let start;
  let end;
  if (index instanceof Delta) {
    [start, end] = [range.index, range.index + range.length].map(pos =>
      index.transformPosition(pos, source !== Emitter.sources.USER),
    );
  } else {
    [start, end] = [range.index, range.index + range.length].map(pos => {
      if (pos < index || (pos === index && source === Emitter.sources.USER))
        return pos;
      if (length >= 0) {
        return pos + length;
      }
      return Math.max(index, pos + length);
    });
  }
  return new Range(start, end - start);
}

export { expandConfig, overload, Quill as default };
