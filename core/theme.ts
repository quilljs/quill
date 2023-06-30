import Quill from '../core';
import Clipboard from '../modules/clipboard';
import History from '../modules/history';
import Keyboard from '../modules/keyboard';
import Uploader from '../modules/uploader';
import Composition from './composition';

interface ThemeOptions {
  modules: Record<string, unknown>;
}

class Theme {
  static DEFAULTS = {
    modules: {},
  };

  static themes = {
    default: Theme,
  };

  modules: Record<string, unknown> = {};

  constructor(protected quill: Quill, protected options: ThemeOptions) {}

  init() {
    Object.keys(this.options.modules).forEach(name => {
      if (this.modules[name] == null) {
        this.addModule(name);
      }
    });
  }

  addModule(name: 'clipboard'): Clipboard;
  addModule(name: 'composition'): Composition;
  addModule(name: 'keyboard'): Keyboard;
  addModule(name: 'uploader'): Uploader;
  addModule(name: 'history'): History;
  addModule(name: string): unknown;
  addModule(name: string) {
    // @ts-expect-error
    const ModuleClass = this.quill.constructor.import(`modules/${name}`);
    this.modules[name] = new ModuleClass(
      this.quill,
      this.options.modules[name] || {},
    );
    return this.modules[name];
  }
}

export interface ThemeConstructor {
  new (quill: Quill, options: unknown): Theme;
}

export default Theme;
