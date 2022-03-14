class Theme {
  constructor(quill, options) {
    this.quill = quill;
    this.options = options;
    this.modules = {};
  }

  init() {
    Object.keys(this.options.modules).forEach(name => {
      if (this.modules[name] == null) {
        this.addModule(name);
      }
    });
  }

  addModule(name) {
    const ModuleClass = this.quill.constructor.import(`modules/${name}`, {
      namespace: this.options.namespace,
    });
    this.modules[name] = new ModuleClass(
      this.quill,
      this.options.modules[name] || {},
    );
    return this.modules[name];
  }
}
Theme.DEFAULTS = {
  modules: {},
};
Theme.themes = {
  default: Theme,
};

export default Theme;
