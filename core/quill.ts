import { cloneDeep, merge } from 'lodash-es';
import * as Parchment from 'parchment';
import type { Op } from 'quill-delta';
import Delta from 'quill-delta';
import type { BlockEmbed } from '../blots/block';
import type Block from '../blots/block';
import type Scroll from '../blots/scroll';
import type { ScrollConstructor } from '../blots/scroll';
import type Clipboard from '../modules/clipboard';
import type History from '../modules/history';
import type Keyboard from '../modules/keyboard';
import type Uploader from '../modules/uploader';
import Editor from './editor';
import Emitter from './emitter';
import type { EmitterSource } from './emitter';
import instances from './instances';
import logger from './logger';
import type { DebugLevel } from './logger';
import Module from './module';
import Selection, { Range } from './selection';
import type { Bounds } from './selection';
import Composition from './composition';
import Theme from './theme';
import type { ThemeConstructor } from './theme';
import scrollRectIntoView from './utils/scrollRectIntoView';
import type { Rect } from './utils/scrollRectIntoView';

const debug = logger('quill');

const globalRegistry = new Parchment.Registry();
Parchment.ParentBlot.uiClass = 'ql-ui';

interface Options {
  theme?: string;
  debug?: DebugLevel | boolean;
  registry?: Parchment.Registry;
  readOnly?: boolean;
  container?: HTMLElement | string;
  placeholder?: string;
  bounds?: HTMLElement | string | null;
  modules?: Record<string, unknown>;
}

interface ExpandedOptions extends Omit<Options, 'theme'> {
  theme: ThemeConstructor;
  registry: Parchment.Registry;
  container: HTMLElement;
  modules: Record<string, unknown>;
  bounds?: HTMLElement | null;
}

class Quill {
  static DEFAULTS: Partial<Options> = {
    bounds: null,
    modules: {},
    placeholder: '',
    readOnly: false,
    registry: globalRegistry,
    theme: 'default',
  };
  static events = Emitter.events;
  static sources = Emitter.sources;
  // eslint-disable-next-line no-undef
  // @ts-expect-error defined in webpack
  static version = typeof QUILL_VERSION === 'undefined' ? 'dev' : QUILL_VERSION;

  static imports: Record<string, unknown> = {
    delta: Delta,
    parchment: Parchment,
    'core/module': Module,
    'core/theme': Theme,
  };

  static debug(limit: DebugLevel | boolean) {
    if (limit === true) {
      limit = 'log';
    }
    logger.level(limit);
  }

  static find(node: Node, bubble = false) {
    return instances.get(node) || globalRegistry.find(node, bubble);
  }

  static import(name: 'core/module'): typeof Module;
  static import(name: `themes/${string}`): typeof Theme;
  static import(name: 'parchment'): typeof Parchment;
  static import(name: 'delta'): typeof Delta;
  static import(name: string): unknown;
  static import(name: string) {
    if (this.imports[name] == null) {
      debug.error(`Cannot import ${name}. Are you sure it was registered?`);
    }
    return this.imports[name];
  }

  static register(
    path:
      | string
      | Parchment.BlotConstructor
      | Parchment.Attributor
      | Record<string, unknown>,
    target?: Parchment.BlotConstructor | Parchment.Attributor | boolean,
    overwrite = false,
  ) {
    if (typeof path !== 'string') {
      const name = 'attrName' in path ? path.attrName : path.blotName;
      if (typeof name === 'string') {
        // register(Blot | Attributor, overwrite)
        // @ts-expect-error
        this.register(`formats/${name}`, path, target);
      } else {
        Object.keys(path).forEach((key) => {
          // @ts-expect-error
          this.register(key, path[key], target);
        });
      }
    } else {
      if (this.imports[path] != null && !overwrite) {
        debug.warn(`Overwriting ${path} with`, target);
      }
      this.imports[path] = target;
      if (
        (path.startsWith('blots/') || path.startsWith('formats/')) &&
        // @ts-expect-error
        target.blotName !== 'abstract'
      ) {
        globalRegistry.register(target);
      }
      // @ts-expect-error
      if (typeof target.register === 'function') {
        // @ts-expect-error
        target.register(globalRegistry);
      }
    }
  }

  container: HTMLElement;
  root: HTMLDivElement;
  scroll: Scroll;
  emitter: Emitter;
  allowReadOnlyEdits: boolean;
  editor: Editor;
  composition: Composition;
  selection: Selection;

  theme: Theme;
  keyboard: Keyboard;
  clipboard: Clipboard;
  history: History;
  uploader: Uploader;

  options: ExpandedOptions;

  constructor(container: HTMLElement | string, options: Options = {}) {
    this.options = expandConfig(container, options);
    this.container = this.options.container;
    if (this.container == null) {
      debug.error('Invalid Quill container', container);
      return;
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
    this.emitter = new Emitter();
    // @ts-expect-error TODO: fix BlotConstructor
    const ScrollBlot = this.options.registry.query(
      Parchment.ScrollBlot.blotName,
    ) as ScrollConstructor;
    this.scroll = new ScrollBlot(this.options.registry, this.root, {
      emitter: this.emitter,
    });
    this.editor = new Editor(this.scroll);
    this.selection = new Selection(this.scroll, this.emitter);
    this.composition = new Composition(this.scroll, this.emitter);
    this.theme = new this.options.theme(this, this.options); // eslint-disable-line new-cap
    this.keyboard = this.theme.addModule('keyboard');
    this.clipboard = this.theme.addModule('clipboard');
    this.history = this.theme.addModule('history');
    this.uploader = this.theme.addModule('uploader');
    this.theme.addModule('input');
    this.theme.addModule('uiNode');
    this.theme.init();
    this.emitter.on(Emitter.events.EDITOR_CHANGE, (type) => {
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
    this.emitter.on(Emitter.events.SCROLL_EMBED_UPDATE, (blot, delta) => {
      const oldRange = this.selection.lastRange;
      const [newRange] = this.selection.getRange();
      const selectionInfo =
        oldRange && newRange ? { oldRange, newRange } : undefined;
      modify.call(
        this,
        () => {
          const change = new Delta()
            .retain(blot.offset(this))
            .retain({ [blot.statics.blotName]: delta });
          return this.editor.update(change, [], selectionInfo);
        },
        Quill.sources.USER,
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

  addContainer(container: string, refNode?: Node | null): HTMLDivElement;
  addContainer(container: HTMLElement, refNode?: Node | null): HTMLElement;
  addContainer(
    container: string | HTMLElement,
    refNode: Node | null = null,
  ): HTMLDivElement | HTMLElement {
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

  deleteText(range: Range, source?: EmitterSource): Delta;
  deleteText(index: number, length: number, source?: EmitterSource): Delta;
  deleteText(
    index: number | Range,
    length?: number | EmitterSource,
    source?: EmitterSource,
  ): Delta {
    // @ts-expect-error
    [index, length, , source] = overload(index, length, source);
    return modify.call(
      this,
      () => {
        // @ts-expect-error
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

  editReadOnly<T>(modifier: () => T): T {
    this.allowReadOnlyEdits = true;
    const value = modifier();
    this.allowReadOnlyEdits = false;
    return value;
  }

  enable(enabled = true) {
    this.scroll.enable(enabled);
    this.container.classList.toggle('ql-disabled', !enabled);
  }

  focus(options: { preventScroll?: boolean } = {}) {
    this.selection.focus();
    if (!options.preventScroll) {
      this.scrollSelectionIntoView();
    }
  }

  format(
    name: string,
    value: unknown,
    source: EmitterSource = Emitter.sources.API,
  ) {
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

  formatLine(
    index: number,
    length: number,
    formats: Record<string, unknown>,
    source?: EmitterSource,
  ): Delta;
  formatLine(
    index: number,
    length: number,
    name: string,
    value?: unknown,
    source?: EmitterSource,
  ): Delta;
  formatLine(
    index: number,
    length: number,
    name: string | Record<string, unknown>,
    value?: unknown | EmitterSource,
    source?: EmitterSource,
  ): Delta {
    let formats: Record<string, unknown>;
    // eslint-disable-next-line prefer-const
    [index, length, formats, source] = overload(
      index,
      length,
      // @ts-expect-error
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

  formatText(
    range: { index: number; length: number },
    name: string,
    value: unknown,
    source?: EmitterSource,
  ): Delta;
  formatText(
    index: number,
    length: number,
    name: string,
    value: unknown,
    source: EmitterSource,
  ): Delta;
  formatText(
    index: number | { index: number; length: number },
    length: number | string,
    name: string | unknown,
    value?: unknown | EmitterSource,
    source?: EmitterSource,
  ): Delta {
    let formats: Record<string, unknown>;
    // eslint-disable-next-line prefer-const
    [index, length, formats, source] = overload(
      // @ts-expect-error
      index,
      length,
      name,
      value,
      source,
    );
    return modify.call(
      this,
      () => {
        // @ts-expect-error
        return this.editor.formatText(index, length, formats);
      },
      source,
      index,
      0,
    );
  }

  getBounds(index: number | Range, length = 0): Bounds | null {
    let bounds: Bounds | null = null;
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

  getFormat(index?: number, length?: number): { [format: string]: unknown };
  getFormat(range?: { index: number; length: number }): {
    [format: string]: unknown;
  };
  getFormat(
    index: { index: number; length: number } | number = this.getSelection(true),
    length = 0,
  ): { [format: string]: unknown } {
    if (typeof index === 'number') {
      return this.editor.getFormat(index, length);
    }
    return this.editor.getFormat(index.index, index.length);
  }

  getIndex(blot: Parchment.Blot) {
    return blot.offset(this.scroll);
  }

  getLength() {
    return this.scroll.length();
  }

  getLeaf(index: number) {
    return this.scroll.leaf(index);
  }

  getLine(index: number) {
    return this.scroll.line(index);
  }

  getLines(range: { index: number; length: number }): (Block | BlockEmbed)[];
  getLines(index?: number, length?: number): (Block | BlockEmbed)[];
  getLines(
    index: { index: number; length: number } | number = 0,
    length = Number.MAX_VALUE,
  ): (Block | BlockEmbed)[] {
    if (typeof index !== 'number') {
      return this.scroll.lines(index.index, index.length);
    }
    return this.scroll.lines(index, length);
  }

  getModule(name: string) {
    return this.theme.modules[name];
  }

  getSelection(focus: true): Range;
  getSelection(focus?: boolean): Range | null;
  getSelection(focus = false): Range | null {
    if (focus) this.focus();
    this.update(); // Make sure we access getRange with editor in consistent state
    return this.selection.getRange()[0];
  }

  getSemanticHTML(range: { index: number; length: number }): string;
  getSemanticHTML(index?: number, length?: number): string;
  getSemanticHTML(
    index: { index: number; length: number } | number = 0,
    length?: number,
  ) {
    if (typeof index === 'number') {
      length = this.getLength() - index;
    }
    // @ts-expect-error
    [index, length] = overload(index, length);
    return this.editor.getHTML(index, length);
  }

  getText(range?: { index: number; length: number }): string;
  getText(index?: number, length?: number): string;
  getText(
    index: { index: number; length: number } | number = 0,
    length?: number,
  ): string {
    if (typeof index === 'number') {
      length = this.getLength() - index;
    }
    // @ts-expect-error
    [index, length] = overload(index, length);
    return this.editor.getText(index, length);
  }

  hasFocus() {
    return this.selection.hasFocus();
  }

  insertEmbed(
    index: number,
    embed: string,
    value: unknown,
    source: EmitterSource = Quill.sources.API,
  ) {
    return modify.call(
      this,
      () => {
        return this.editor.insertEmbed(index, embed, value);
      },
      source,
      index,
    );
  }

  insertText(index: number, text: string, source: EmitterSource): Delta;
  insertText(
    index: number,
    text: string,
    formats: Record<string, unknown>,
    source: EmitterSource,
  ): Delta;
  insertText(
    index: number,
    text: string,
    name: string,
    value: unknown,
    source: EmitterSource,
  ): Delta;
  insertText(
    index: number,
    text: string,
    name: string | Record<string, unknown> | EmitterSource,
    value?: unknown,
    source?: EmitterSource,
  ): Delta {
    let formats: Record<string, unknown>;
    // eslint-disable-next-line prefer-const
    // @ts-expect-error
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

  off(...args: Parameters<(typeof Emitter)['prototype']['off']>) {
    return this.emitter.off(...args);
  }

  on(
    event: (typeof Emitter)['events']['TEXT_CHANGE'],
    handler: (delta: Delta, oldContent: Delta, source: EmitterSource) => void,
  ): Emitter;
  on(
    event: (typeof Emitter)['events']['SELECTION_CHANGE'],
    handler: (range: Range, oldRange: Range, source: EmitterSource) => void,
  ): Emitter;
  // @ts-expect-error
  on(
    event: (typeof Emitter)['events']['EDITOR_CHANGE'],
    handler: (
      ...args:
        | [
            (typeof Emitter)['events']['TEXT_CHANGE'],
            Delta,
            Delta,
            EmitterSource,
          ]
        | [
            (typeof Emitter)['events']['SELECTION_CHANGE'],
            Range,
            Range,
            EmitterSource,
          ]
    ) => void,
  ): Emitter;
  on(event: string, ...args: unknown[]): Emitter;
  on(...args: Parameters<(typeof Emitter)['prototype']['on']>): Emitter {
    return this.emitter.on(...args);
  }

  once(...args: Parameters<(typeof Emitter)['prototype']['once']>) {
    return this.emitter.once(...args);
  }

  removeFormat(...args: Parameters<typeof overload>) {
    const [index, length, , source] = overload(...args);
    return modify.call(
      this,
      () => {
        return this.editor.removeFormat(index, length);
      },
      source,
      index,
    );
  }

  scrollRectIntoView(rect: Rect) {
    scrollRectIntoView(this.root, rect);
  }

  /**
   * @deprecated Use Quill#scrollSelectionIntoView() instead.
   */
  scrollIntoView() {
    console.warn(
      'Quill#scrollIntoView() has been deprecated and will be removed in the near future. Please use Quill#scrollSelectionIntoView() instead.',
    );
    this.scrollSelectionIntoView();
  }

  /**
   * Scroll the current selection into the visible area.
   * If the selection is already visible, no scrolling will occur.
   */
  scrollSelectionIntoView() {
    const range = this.selection.lastRange;
    const bounds = range && this.selection.getBounds(range.index, range.length);
    if (bounds) {
      this.scrollRectIntoView(bounds);
    }
  }

  setContents(
    delta: Delta | Op[],
    source: EmitterSource = Emitter.sources.API,
  ) {
    return modify.call(
      this,
      () => {
        delta = new Delta(delta);
        const length = this.getLength();
        // Quill will set empty editor to \n
        const delete1 = this.editor.deleteText(0, length);
        const applied = this.editor.insertContents(0, delta);
        // Remove extra \n from empty editor initialization
        const delete2 = this.editor.deleteText(this.getLength() - 1, 1);
        return delete1.compose(applied).compose(delete2);
      },
      source,
    );
  }
  setSelection(range: Range | null, source?: EmitterSource): void;
  setSelection(index: number, source?: EmitterSource): void;
  setSelection(index: number, length?: number, source?: EmitterSource): void;
  setSelection(index: number, source?: EmitterSource): void;
  setSelection(
    index: Range | null | number,
    length?: EmitterSource | number,
    source?: EmitterSource,
  ): void {
    if (index == null) {
      // @ts-expect-error https://github.com/microsoft/TypeScript/issues/22609
      this.selection.setRange(null, length || Quill.sources.API);
    } else {
      // @ts-expect-error
      [index, length, , source] = overload(index, length, source);
      this.selection.setRange(new Range(Math.max(0, index), length), source);
      if (source !== Emitter.sources.SILENT) {
        this.scrollSelectionIntoView();
      }
    }
  }

  setText(text: string, source: EmitterSource = Emitter.sources.API) {
    const delta = new Delta().insert(text);
    return this.setContents(delta, source);
  }

  update(source: EmitterSource = Emitter.sources.USER) {
    const change = this.scroll.update(source); // Will update selection before selection.update() does if text changes
    this.selection.update(source);
    // TODO this is usually undefined
    return change;
  }

  updateContents(
    delta: Delta | Op[],
    source: EmitterSource = Emitter.sources.API,
  ) {
    return modify.call(
      this,
      () => {
        delta = new Delta(delta);
        return this.editor.applyDelta(delta);
      },
      source,
      true,
    );
  }
}

function expandConfig(
  container: HTMLElement | string,
  userConfig: Options,
): ExpandedOptions {
  // @ts-expect-error -- TODO fix this later
  let expandedConfig: ExpandedOptions = merge(
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

  // @ts-expect-error -- TODO fix this later
  if (!expandedConfig.theme || expandedConfig.theme === Quill.DEFAULTS.theme) {
    expandedConfig.theme = Theme;
  } else {
    expandedConfig.theme = Quill.import(`themes/${expandedConfig.theme}`);
    if (expandedConfig.theme == null) {
      throw new Error(
        `Invalid theme ${expandedConfig.theme}. Did you register it?`,
      );
    }
  }
  // @ts-expect-error -- TODO fix this later
  const themeConfig = cloneDeep(expandedConfig.theme.DEFAULTS);
  [themeConfig, expandedConfig].forEach((config) => {
    config.modules = config.modules || {};
    Object.keys(config.modules).forEach((module) => {
      if (config.modules[module] === true) {
        config.modules[module] = {};
      }
    });
  });
  const moduleNames = Object.keys(themeConfig.modules).concat(
    Object.keys(expandedConfig.modules),
  );
  const moduleConfig = moduleNames.reduce((config, name) => {
    const moduleClass = Quill.import(`modules/${name}`);
    if (moduleClass == null) {
      debug.error(
        `Cannot load ${name} module. Are you sure you registered it?`,
      );
    } else {
      // @ts-expect-error
      config[name] = moduleClass.DEFAULTS || {};
    }
    return config;
  }, {});
  // Special case toolbar shorthand
  if (
    expandedConfig.modules != null &&
    expandedConfig.modules.toolbar &&
    expandedConfig.modules.toolbar.constructor !== Object
  ) {
    expandedConfig.modules.toolbar = {
      container: expandedConfig.modules.toolbar,
    };
  }
  expandedConfig = merge(
    {},
    Quill.DEFAULTS,
    { modules: moduleConfig },
    themeConfig,
    expandedConfig,
  );
  (['bounds', 'container'] as const).forEach((key) => {
    const selector = expandedConfig[key];
    if (typeof selector === 'string') {
      // @ts-expect-error Handle null case
      expandedConfig[key] = document.querySelector(selector) as HTMLElement;
    }
  });
  expandedConfig.modules = Object.keys(expandedConfig.modules).reduce(
    (config: Record<string, unknown>, name) => {
      if (expandedConfig.modules[name]) {
        config[name] = expandedConfig.modules[name];
      }
      return config;
    },
    {},
  );
  return expandedConfig;
}

// Handle selection preservation and TEXT_CHANGE emission
// common to modification APIs
function modify(
  modifier: () => Delta,
  source: EmitterSource,
  index: number | boolean,
  shift: number | null,
) {
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
      // @ts-expect-error index should always be number
      range = shiftRange(range, index, shift, source);
    }
    this.setSelection(range, Emitter.sources.SILENT);
  } else {
    this.selection.update(Emitter.sources.SILENT);
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

type NormalizedIndexLength = [
  number,
  number,
  Record<string, unknown>,
  EmitterSource,
];
function overload(index: number, source?: EmitterSource): NormalizedIndexLength;
function overload(
  index: number,
  length: number,
  source?: EmitterSource,
): NormalizedIndexLength;
function overload(
  index: number,
  length: number,
  format: string,
  value: unknown,
  source?: EmitterSource,
): NormalizedIndexLength;
function overload(
  index: number,
  length: number,
  format: Record<string, unknown>,
  source?: EmitterSource,
): NormalizedIndexLength;
function overload(range: Range, source?: EmitterSource): NormalizedIndexLength;
function overload(
  range: Range,
  format: string,
  value: unknown,
  source?: EmitterSource,
): NormalizedIndexLength;
function overload(
  range: Range,
  format: Record<string, unknown>,
  source?: EmitterSource,
): NormalizedIndexLength;
function overload(
  index: Range | number,
  length?: number | string | Record<string, unknown> | EmitterSource,
  name?: string | unknown | Record<string, unknown> | EmitterSource,
  value?: unknown | EmitterSource,
  source?: EmitterSource,
): NormalizedIndexLength {
  let formats: Record<string, unknown> = {};
  // @ts-expect-error
  if (typeof index.index === 'number' && typeof index.length === 'number') {
    // Allow for throwaway end (used by insertText/insertEmbed)
    if (typeof length !== 'number') {
      // @ts-expect-error
      source = value;
      value = name;
      name = length;
      // @ts-expect-error
      length = index.length; // eslint-disable-line prefer-destructuring
      // @ts-expect-error
      index = index.index; // eslint-disable-line prefer-destructuring
    } else {
      // @ts-expect-error
      length = index.length; // eslint-disable-line prefer-destructuring
      // @ts-expect-error
      index = index.index; // eslint-disable-line prefer-destructuring
    }
  } else if (typeof length !== 'number') {
    // @ts-expect-error
    source = value;
    value = name;
    name = length;
    length = 0;
  }
  // Handle format being object, two format name/value strings or excluded
  if (typeof name === 'object') {
    // @ts-expect-error Fix me later
    formats = name;
    // @ts-expect-error
    source = value;
  } else if (typeof name === 'string') {
    if (value != null) {
      formats[name] = value;
    } else {
      // @ts-expect-error
      source = name;
    }
  }
  // Handle optional source
  source = source || Emitter.sources.API;
  // @ts-expect-error
  return [index, length, formats, source];
}

function shiftRange(range: Range, change: Delta, source?: EmitterSource): Range;
function shiftRange(
  range: Range,
  index: number,
  length?: number,
  source?: EmitterSource,
): Range;
function shiftRange(
  range: Range,
  index: number | Delta,
  lengthOrSource?: number | EmitterSource,
  source?: EmitterSource,
) {
  const length = typeof lengthOrSource === 'number' ? lengthOrSource : 0;
  if (range == null) return null;
  let start;
  let end;
  // @ts-expect-error -- TODO: add a better type guard around `index`
  if (index && typeof index.transformPosition === 'function') {
    [start, end] = [range.index, range.index + range.length].map((pos) =>
      // @ts-expect-error -- TODO: add a better type guard around `index`
      index.transformPosition(pos, source !== Emitter.sources.USER),
    );
  } else {
    [start, end] = [range.index, range.index + range.length].map((pos) => {
      // @ts-expect-error -- TODO: add a better type guard around `index`
      if (pos < index || (pos === index && source === Emitter.sources.USER))
        return pos;
      if (length >= 0) {
        return pos + length;
      }
      // @ts-expect-error -- TODO: add a better type guard around `index`
      return Math.max(index, pos + length);
    });
  }
  return new Range(start, end - start);
}

export { globalRegistry, expandConfig, overload, Quill as default };
