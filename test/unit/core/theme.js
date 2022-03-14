import Theme from '../../../core/theme';
import Quill from '../../../core';
import Module from '../../../core/module';

describe('Theme', function() {
  it('imports modules from correct namespace', function() {
    const namespace = 'theme';
    const quill = this.initialize(Quill, '');
    const theme = new Theme(quill, { namespace, modules: {} });
    class CustomModule extends Module {}

    const moduleName = 'theme-test-module';
    Quill.register(`modules/${moduleName}`, CustomModule, { namespace });

    expect(theme.addModule(moduleName)).toBeInstanceOf(CustomModule);
  });
});
