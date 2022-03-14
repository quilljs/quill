import Delta from 'quill-delta';
import Quill, { expandConfig, overload } from '../../../core/quill';
import Theme from '../../../core/theme';
import Emitter from '../../../core/emitter';
import Toolbar from '../../../modules/toolbar';
import Snow from '../../../themes/snow';
import { Range } from '../../../core/selection';
import Bold from '../../../formats/bold';

describe('Quill', function() {
  describe('construction', function() {
    it('empty', function() {
      const quill = this.initialize(Quill, '');
      expect(quill.getContents()).toEqual(new Delta().insert('\n'));
      expect(quill.root).toEqualHTML('<p><br></p>');
    });

    it('text', function() {
      const quill = this.initialize(Quill, '0123');
      expect(quill.getContents()).toEqual(new Delta().insert('0123\n'));
      expect(quill.root).toEqualHTML('<p>0123</p>');
    });

    it('newlines', function() {
      const quill = this.initialize(Quill, '<p><br></p><p><br></p><p><br></p>');
      expect(quill.getContents()).toEqual(new Delta().insert('\n\n\n'));
      expect(quill.root).toEqualHTML('<p><br></p><p><br></p><p><br></p>');
    });

    it('formatted ending', function() {
      const quill = this.initialize(
        Quill,
        '<p class="ql-align-center">Test</p>',
      );
      expect(quill.getContents()).toEqual(
        new Delta().insert('Test').insert('\n', { align: 'center' }),
      );
      expect(quill.root).toEqualHTML('<p class="ql-align-center">Test</p>');
    });
  });

  describe('namespaces', function() {
    it('has a default namespace', function() {
      const { imports } = Quill.getNamespace();
      Object.keys(imports).forEach(function(path) {
        expect(Quill.import(path)).toBeTruthy();
      });

      Object.keys(Quill.defaultDefinitions).forEach(function(path) {
        expect(Quill.import(path)).toBeTruthy();
      });
    });

    it('accepts other namespaces', function() {
      const namespace = 'myspace';

      const { defaultDefinitions } = Quill;
      Quill.defaultDefinitions = {};
      const { imports } = Quill.getNamespace(namespace);
      Quill.defaultDefinitions = defaultDefinitions;

      expect(Object.keys(imports).length).toEqual(0);
      Quill.register(Bold, { namespace });
      expect(Object.keys(imports).length).toEqual(1);

      class CustomBlot extends Bold {}
      CustomBlot.blotName = 'customBlot';
      Quill.register(CustomBlot, { namespace });
      expect(Quill.import(`formats/${CustomBlot.blotName}`)).toBeFalsy();
      expect(
        Quill.import(`formats/${CustomBlot.blotName}`, {
          namespace,
        }),
      ).toBeTruthy();
    });
  });

  describe('api', function() {
    beforeEach(function() {
      this.quill = this.initialize(Quill, '<p>0123<em>45</em>67</p>');
      this.oldDelta = this.quill.getContents();
      spyOn(this.quill.emitter, 'emit').and.callThrough();
    });

    it('deleteText()', function() {
      this.quill.deleteText(3, 2);
      const change = new Delta().retain(3).delete(2);
      expect(this.quill.root).toEqualHTML('<p>012<em>5</em>67</p>');
      expect(this.quill.emitter.emit).toHaveBeenCalledWith(
        Emitter.events.TEXT_CHANGE,
        change,
        this.oldDelta,
        Emitter.sources.API,
      );
    });

    it('format()', function() {
      this.quill.setSelection(3, 2);
      this.quill.format('bold', true);
      const change = new Delta().retain(3).retain(2, { bold: true });
      expect(this.quill.root).toEqualHTML(
        '<p>012<strong>3<em>4</em></strong><em>5</em>67</p>',
      );
      expect(this.quill.emitter.emit).toHaveBeenCalledWith(
        Emitter.events.TEXT_CHANGE,
        change,
        this.oldDelta,
        Emitter.sources.API,
      );
      expect(this.quill.getSelection()).toEqual(new Range(3, 2));
    });

    it('formatLine()', function() {
      this.quill.formatLine(1, 1, 'header', 2);
      const change = new Delta().retain(8).retain(1, { header: 2 });
      expect(this.quill.root).toEqualHTML('<h2>0123<em>45</em>67</h2>');
      expect(this.quill.emitter.emit).toHaveBeenCalledWith(
        Emitter.events.TEXT_CHANGE,
        change,
        this.oldDelta,
        Emitter.sources.API,
      );
    });

    it('formatText()', function() {
      this.quill.formatText(3, 2, 'bold', true);
      const change = new Delta().retain(3).retain(2, { bold: true });
      expect(this.quill.root).toEqualHTML(
        '<p>012<strong>3<em>4</em></strong><em>5</em>67</p>',
      );
      expect(this.quill.emitter.emit).toHaveBeenCalledWith(
        Emitter.events.TEXT_CHANGE,
        change,
        this.oldDelta,
        Emitter.sources.API,
      );
    });

    it('insertEmbed()', function() {
      this.quill.insertEmbed(5, 'image', '/assets/favicon.png');
      const change = new Delta()
        .retain(5)
        .insert({ image: '/assets/favicon.png' }, { italic: true });
      expect(this.quill.root).toEqualHTML(
        '<p>0123<em>4<img src="/assets/favicon.png">5</em>67</p>',
      );
      expect(this.quill.emitter.emit).toHaveBeenCalledWith(
        Emitter.events.TEXT_CHANGE,
        change,
        this.oldDelta,
        Emitter.sources.API,
      );
    });

    it('insertText()', function() {
      this.quill.insertText(5, '|', 'bold', true);
      const change = new Delta()
        .retain(5)
        .insert('|', { bold: true, italic: true });
      expect(this.quill.root).toEqualHTML(
        '<p>0123<em>4</em><strong><em>|</em></strong><em>5</em>67</p>',
      );
      expect(this.quill.emitter.emit).toHaveBeenCalledWith(
        Emitter.events.TEXT_CHANGE,
        change,
        this.oldDelta,
        Emitter.sources.API,
      );
    });

    it('enable/disable', function() {
      this.quill.disable();
      expect(this.quill.root.getAttribute('contenteditable')).toEqual('false');
      this.quill.enable();
      expect(this.quill.root.getAttribute('contenteditable')).toBeTruthy();
    });

    it('getBounds() index', function() {
      expect(this.quill.getBounds(1)).toBeTruthy();
    });

    it('getBounds() range', function() {
      expect(this.quill.getBounds(new Range(3, 4))).toBeTruthy();
    });

    it('getFormat()', function() {
      const formats = this.quill.getFormat(5);
      expect(formats).toEqual({ italic: true });
    });

    it('getSelection()', function() {
      expect(this.quill.getSelection()).toEqual(null);
      const range = new Range(1, 2);
      this.quill.setSelection(range);
      expect(this.quill.getSelection()).toEqual(range);
    });

    it('removeFormat()', function() {
      this.quill.removeFormat(5, 1);
      const change = new Delta().retain(5).retain(1, { italic: null });
      expect(this.quill.root).toEqualHTML('<p>0123<em>4</em>567</p>');
      expect(this.quill.emitter.emit).toHaveBeenCalledWith(
        Emitter.events.TEXT_CHANGE,
        change,
        this.oldDelta,
        Emitter.sources.API,
      );
    });

    it('updateContents() delta', function() {
      const delta = new Delta().retain(5).insert('|');
      this.quill.updateContents(delta);
      expect(this.quill.root).toEqualHTML('<p>0123<em>4</em>|<em>5</em>67</p>');
      expect(this.quill.emitter.emit).toHaveBeenCalledWith(
        Emitter.events.TEXT_CHANGE,
        delta,
        this.oldDelta,
        Emitter.sources.API,
      );
    });

    it('updateContents() ops array', function() {
      const delta = new Delta().retain(5).insert('|');
      this.quill.updateContents(delta.ops);
      expect(this.quill.root).toEqualHTML('<p>0123<em>4</em>|<em>5</em>67</p>');
      expect(this.quill.emitter.emit).toHaveBeenCalledWith(
        Emitter.events.TEXT_CHANGE,
        delta,
        this.oldDelta,
        Emitter.sources.API,
      );
    });
  });

  describe('events', function() {
    beforeEach(function() {
      this.quill = this.initialize(Quill, '<p>0123</p>');
      this.quill.update();
      spyOn(this.quill.emitter, 'emit').and.callThrough();
      this.oldDelta = this.quill.getContents();
    });

    it('api text insert', function() {
      this.quill.insertText(2, '!');
      const delta = new Delta().retain(2).insert('!');
      expect(this.quill.emitter.emit).toHaveBeenCalledWith(
        Emitter.events.TEXT_CHANGE,
        delta,
        this.oldDelta,
        Emitter.sources.API,
      );
    });

    it('user text insert', function(done) {
      this.container.firstChild.firstChild.firstChild.data = '01!23';
      const delta = new Delta().retain(2).insert('!');
      setTimeout(() => {
        expect(this.quill.emitter.emit).toHaveBeenCalledWith(
          Emitter.events.TEXT_CHANGE,
          delta,
          this.oldDelta,
          Emitter.sources.USER,
        );
        done();
      }, 1);
    });

    function editTest(
      oldText,
      oldSelection,
      newText,
      newSelection,
      expectedDelta,
    ) {
      return function(done) {
        this.quill.setText(`${oldText}\n`);
        this.quill.setSelection(oldSelection); // number or Range
        this.quill.update();
        const oldContents = this.quill.getContents();
        const textNode = this.container.firstChild.firstChild.firstChild;
        textNode.data = newText;
        if (typeof newSelection === 'number') {
          this.quill.selection.setNativeRange(textNode, newSelection);
        } else {
          this.quill.selection.setNativeRange(
            textNode,
            newSelection.index,
            textNode,
            newSelection.index + newSelection.length,
          );
        }
        setTimeout(() => {
          const calls = this.quill.emitter.emit.calls.all();
          if (
            calls[calls.length - 1].args[1] === Emitter.events.SELECTION_CHANGE
          ) {
            calls.pop();
          }
          const { args } = calls.pop();
          expect(args).toEqual([
            Emitter.events.TEXT_CHANGE,
            expectedDelta,
            oldContents,
            Emitter.sources.USER,
          ]);
          done();
        }, 1);
      };
    }

    describe('insert a in aaaa', function() {
      it(
        'at index 0',
        editTest('aaaa', 0, 'aaaaa', 1, new Delta().insert('a')),
      );
      it(
        'at index 1',
        editTest('aaaa', 1, 'aaaaa', 2, new Delta().retain(1).insert('a')),
      );
      it(
        'at index 2',
        editTest('aaaa', 2, 'aaaaa', 3, new Delta().retain(2).insert('a')),
      );
      it(
        'at index 3',
        editTest('aaaa', 3, 'aaaaa', 4, new Delta().retain(3).insert('a')),
      );
    });

    describe('insert a in xaa', function() {
      it(
        'at index 1',
        editTest('xaa', 1, 'xaaa', 2, new Delta().retain(1).insert('a')),
      );
      it(
        'at index 2',
        editTest('xaa', 2, 'xaaa', 3, new Delta().retain(2).insert('a')),
      );
      it(
        'at index 3',
        editTest('xaa', 3, 'xaaa', 4, new Delta().retain(3).insert('a')),
      );
    });

    describe('insert aa in ax', function() {
      it('at index 0', editTest('ax', 0, 'aaax', 2, new Delta().insert('aa')));
      it(
        'at index 1',
        editTest('ax', 1, 'aaax', 3, new Delta().retain(1).insert('aa')),
      );
    });

    describe('delete a in xaa', function() {
      it(
        'at index 1',
        editTest('xaa', 2, 'xa', 1, new Delta().retain(1).delete(1)),
      );
      it(
        'at index 2',
        editTest('xaa', 3, 'xa', 2, new Delta().retain(2).delete(1)),
      );
    });

    describe('forward-delete a in xaa', function() {
      it(
        'at index 1',
        editTest('xaa', 1, 'xa', 1, new Delta().retain(1).delete(1)),
      );
      it(
        'at index 2',
        editTest('xaa', 2, 'xa', 2, new Delta().retain(2).delete(1)),
      );
    });

    it(
      'replace yay with y',
      editTest(
        'yay',
        new Range(0, 3),
        'y',
        1,
        new Delta().insert('y').delete(3),
      ),
    );
  });

  describe('setContents()', function() {
    it('empty', function() {
      const quill = this.initialize(Quill, '');
      const delta = new Delta().insert('\n');
      quill.setContents(delta);
      expect(quill.getContents()).toEqual(delta);
      expect(quill.root).toEqualHTML('<p><br></p>');
    });

    it('single line', function() {
      const quill = this.initialize(Quill, '');
      const delta = new Delta().insert('Hello World!\n');
      quill.setContents(delta);
      expect(quill.getContents()).toEqual(delta);
      expect(quill.root).toEqualHTML('<p>Hello World!</p>');
    });

    it('multiple lines', function() {
      const quill = this.initialize(Quill, '');
      const delta = new Delta().insert('Hello\n\nWorld!\n');
      quill.setContents(delta);
      expect(quill.getContents()).toEqual(delta);
      expect(quill.root).toEqualHTML('<p>Hello</p><p><br></p><p>World!</p>');
    });

    it('basic formats', function() {
      const quill = this.initialize(Quill, '');
      const delta = new Delta()
        .insert('Welcome')
        .insert('\n', { header: 1 })
        .insert('Hello\n')
        .insert('World')
        .insert('!', { bold: true })
        .insert('\n');
      quill.setContents(delta);
      expect(quill.getContents()).toEqual(delta);
      expect(quill.root).toEqualHTML(`
        <h1>Welcome</h1>
        <p>Hello</p>
        <p>World<strong>!</strong></p>
      `);
    });

    it('array of operations', function() {
      const quill = this.initialize(Quill, '');
      const delta = new Delta()
        .insert('test')
        .insert('123', { bold: true })
        .insert('\n');
      quill.setContents(delta.ops);
      expect(quill.getContents()).toEqual(delta);
    });

    it('json', function() {
      const quill = this.initialize(Quill, '');
      const delta = { ops: [{ insert: 'test\n' }] };
      quill.setContents(delta);
      expect(quill.getContents()).toEqual(new Delta(delta));
    });

    it('no trailing newline', function() {
      const quill = this.initialize(Quill, '<h1>Welcome</h1>');
      quill.setContents(new Delta().insert('0123'));
      expect(quill.getContents()).toEqual(new Delta().insert('0123\n'));
    });

    it('inline formatting', function() {
      const quill = this.initialize(
        Quill,
        '<p><strong>Bold</strong></p><p>Not bold</p>',
      );
      const contents = quill.getContents();
      const delta = quill.setContents(contents);
      expect(quill.getContents()).toEqual(contents);
      expect(delta).toEqual(contents.delete(contents.length()));
    });

    it('block embed', function() {
      const quill = this.initialize(Quill, '<p>Hello World!</p>');
      const contents = new Delta().insert({ video: '#' });
      quill.setContents(contents);
      expect(quill.getContents()).toEqual(contents);
    });
  });

  describe('setText()', function() {
    it('overwrite', function() {
      const quill = this.initialize(Quill, '<h1>Welcome</h1>');
      quill.setText('abc');
      expect(quill.root).toEqualHTML('<p>abc</p>');
    });

    it('set to newline', function() {
      const quill = this.initialize(Quill, '<h1>Welcome</h1>');
      quill.setText('\n');
      expect(quill.root).toEqualHTML('<p><br></p>');
    });

    it('multiple newlines', function() {
      const quill = this.initialize(Quill, '<h1>Welcome</h1>');
      quill.setText('\n\n');
      expect(quill.root).toEqualHTML('<p><br></p><p><br></p>');
    });

    it('content with trailing newline', function() {
      const quill = this.initialize(Quill, '<h1>Welcome</h1>');
      quill.setText('abc\n');
      expect(quill.root).toEqualHTML('<p>abc</p>');
    });

    it('return carriage', function() {
      const quill = this.initialize(Quill, '<p>Test</p>');
      quill.setText('\r');
      expect(quill.root).toEqualHTML('<p><br></p>');
    });

    it('return carriage newline', function() {
      const quill = this.initialize(Quill, '<p>Test</p>');
      quill.setText('\r\n');
      expect(quill.root).toEqualHTML('<p><br></p>');
    });
  });

  describe('expandConfig', function() {
    it('user overwrite quill', function() {
      const config = expandConfig('#test-container', {
        placeholder: 'Test',
        readOnly: true,
      });
      expect(config.placeholder).toEqual('Test');
      expect(config.readOnly).toEqual(true);
    });

    it('convert css selectors', function() {
      const config = expandConfig('#test-container', {
        bounds: '#test-container',
      });
      expect(config.bounds).toEqual(document.querySelector('#test-container'));
      expect(config.container).toEqual(
        document.querySelector('#test-container'),
      );
    });

    xit('convert module true to {}', function() {
      Quill.debug(0);
      const oldModules = Theme.DEFAULTS.modules;
      Theme.DEFAULTS.modules = {
        formula: true,
      };
      const config = expandConfig('#test-container', {
        modules: {
          syntax: true,
        },
      });
      Quill.debug('error');
      expect(config.modules.formula).toEqual({});
      expect(config.modules.syntax).toEqual({
        highlight: null,
        interval: 1000,
      });
      Theme.DEFAULTS.modules = oldModules;
    });

    describe('theme defaults', function() {
      it('for Snow', function() {
        const config = expandConfig('#test-container', {
          modules: {
            toolbar: true,
          },
          theme: 'snow',
        });
        expect(config.theme).toEqual(Snow);
        expect(config.modules.toolbar.handlers.image).toEqual(
          Snow.DEFAULTS.modules.toolbar.handlers.image,
        );
      });

      it('for false', function() {
        const config = expandConfig('#test-container', {
          theme: false,
        });
        expect(config.theme).toEqual(Theme);
      });

      it('for undefined', function() {
        const config = expandConfig('#test-container', {
          theme: undefined,
        });
        expect(config.theme).toEqual(Theme);
      });

      it('for null', function() {
        const config = expandConfig('#test-container', {
          theme: null,
        });
        expect(config.theme).toEqual(Theme);
      });
    });

    it('quill < module < theme < user', function() {
      const oldTheme = Theme.DEFAULTS.modules;
      const oldToolbar = Toolbar.DEFAULTS;
      Toolbar.DEFAULTS = {
        option: 2,
        module: true,
      };
      Theme.DEFAULTS.modules = {
        toolbar: {
          option: 1,
          theme: true,
        },
      };
      const config = expandConfig('#test-container', {
        modules: {
          toolbar: {
            option: 0,
            user: true,
          },
        },
      });
      expect(config.modules.toolbar).toEqual({
        option: 0,
        module: true,
        theme: true,
        user: true,
      });
      Theme.DEFAULTS.modules = oldTheme;
      Toolbar.DEFAULTS = oldToolbar;
    });

    it('toolbar default', function() {
      const config = expandConfig('#test-container', {
        modules: {
          toolbar: true,
        },
      });
      expect(config.modules.toolbar).toEqual(Toolbar.DEFAULTS);
    });

    it('toolbar disabled', function() {
      const config = expandConfig('#test-container', {
        modules: {
          toolbar: false,
        },
        theme: 'snow',
      });
      expect(config.modules.toolbar).toBe(undefined);
    });

    it('toolbar selector', function() {
      const config = expandConfig('#test-container', {
        modules: {
          toolbar: {
            container: '#test-container',
          },
        },
      });
      expect(config.modules.toolbar).toEqual({
        container: '#test-container',
        handlers: Toolbar.DEFAULTS.handlers,
      });
    });

    it('toolbar container shorthand', function() {
      const config = expandConfig('#test-container', {
        modules: {
          toolbar: document.querySelector('#test-container'),
        },
      });
      expect(config.modules.toolbar).toEqual({
        container: document.querySelector('#test-container'),
        handlers: Toolbar.DEFAULTS.handlers,
      });
    });

    it('toolbar format array', function() {
      const config = expandConfig('#test-container', {
        modules: {
          toolbar: ['bold'],
        },
      });
      expect(config.modules.toolbar).toEqual({
        container: ['bold'],
        handlers: Toolbar.DEFAULTS.handlers,
      });
    });

    it('toolbar custom handler, default container', function() {
      const handler = function() {}; // eslint-disable-line func-style
      const config = expandConfig('#test-container', {
        modules: {
          toolbar: {
            handlers: {
              bold: handler,
            },
          },
        },
      });
      expect(config.modules.toolbar.container).toEqual(null);
      expect(config.modules.toolbar.handlers.bold).toEqual(handler);
      expect(config.modules.toolbar.handlers.clean).toEqual(
        Toolbar.DEFAULTS.handlers.clean,
      );
    });
  });

  describe('overload', function() {
    it('(index:number, length:number)', function() {
      const [index, length, formats, source] = overload(0, 1);
      expect(index).toBe(0);
      expect(length).toBe(1);
      expect(formats).toEqual({});
      expect(source).toBe(Quill.sources.API);
    });

    it('(index:number, length:number, format:string, value:boolean, source:string)', function() {
      const [index, length, formats, source] = overload(
        0,
        1,
        'bold',
        true,
        Quill.sources.USER,
      );
      expect(index).toBe(0);
      expect(length).toBe(1);
      expect(formats).toEqual({ bold: true });
      expect(source).toBe(Quill.sources.USER);
    });

    it('(index:number, length:number, format:string, value:string, source:string)', function() {
      const [index, length, formats, source] = overload(
        0,
        1,
        'color',
        Quill.sources.USER,
        Quill.sources.USER,
      );
      expect(index).toBe(0);
      expect(length).toBe(1);
      expect(formats).toEqual({ color: Quill.sources.USER });
      expect(source).toBe(Quill.sources.USER);
    });

    it('(index:number, length:number, format:string, value:string)', function() {
      const [index, length, formats, source] = overload(
        0,
        1,
        'color',
        Quill.sources.USER,
      );
      expect(index).toBe(0);
      expect(length).toBe(1);
      expect(formats).toEqual({ color: Quill.sources.USER });
      expect(source).toBe(Quill.sources.API);
    });

    it('(index:number, length:number, format:object)', function() {
      const [index, length, formats, source] = overload(0, 1, { bold: true });
      expect(index).toBe(0);
      expect(length).toBe(1);
      expect(formats).toEqual({ bold: true });
      expect(source).toBe(Quill.sources.API);
    });

    it('(index:number, length:number, format:object, source:string)', function() {
      const [index, length, formats, source] = overload(
        0,
        1,
        { bold: true },
        Quill.sources.USER,
      );
      expect(index).toBe(0);
      expect(length).toBe(1);
      expect(formats).toEqual({ bold: true });
      expect(source).toBe(Quill.sources.USER);
    });

    it('(index:number, length:number, source:string)', function() {
      const [index, length, formats, source] = overload(
        0,
        1,
        Quill.sources.USER,
      );
      expect(index).toBe(0);
      expect(length).toBe(1);
      expect(formats).toEqual({});
      expect(source).toBe(Quill.sources.USER);
    });

    it('(index:number, source:string)', function() {
      const [index, length, formats, source] = overload(0, Quill.sources.USER);
      expect(index).toBe(0);
      expect(length).toBe(0);
      expect(formats).toEqual({});
      expect(source).toBe(Quill.sources.USER);
    });

    it('(range:range)', function() {
      const [index, length, formats, source] = overload(new Range(0, 1));
      expect(index).toBe(0);
      expect(length).toBe(1);
      expect(formats).toEqual({});
      expect(source).toBe(Quill.sources.API);
    });

    it('(range:range, format:string, value:boolean, source:string)', function() {
      const [index, length, formats, source] = overload(
        new Range(0, 1),
        'bold',
        true,
        Quill.sources.USER,
      );
      expect(index).toBe(0);
      expect(length).toBe(1);
      expect(formats).toEqual({ bold: true });
      expect(source).toBe(Quill.sources.USER);
    });

    it('(range:range, format:string, value:string, source:string)', function() {
      const [index, length, formats, source] = overload(
        new Range(0, 1),
        'color',
        Quill.sources.API,
        Quill.sources.USER,
      );
      expect(index).toBe(0);
      expect(length).toBe(1);
      expect(formats).toEqual({ color: Quill.sources.API });
      expect(source).toBe(Quill.sources.USER);
    });

    it('(range:range, format:string, value:string)', function() {
      const [index, length, formats, source] = overload(
        new Range(0, 1),
        'color',
        Quill.sources.USER,
      );
      expect(index).toBe(0);
      expect(length).toBe(1);
      expect(formats).toEqual({ color: Quill.sources.USER });
      expect(source).toBe(Quill.sources.API);
    });

    it('(range:range, format:object)', function() {
      const [index, length, formats, source] = overload(new Range(0, 1), {
        bold: true,
      });
      expect(index).toBe(0);
      expect(length).toBe(1);
      expect(formats).toEqual({ bold: true });
      expect(source).toBe(Quill.sources.API);
    });

    it('(range:range, format:object, source:string)', function() {
      const [index, length, formats, source] = overload(
        new Range(0, 1),
        { bold: true },
        Quill.sources.USER,
      );
      expect(index).toBe(0);
      expect(length).toBe(1);
      expect(formats).toEqual({ bold: true });
      expect(source).toBe(Quill.sources.USER);
    });

    it('(range:range, source:string)', function() {
      const [index, length, formats, source] = overload(
        new Range(0, 1),
        Quill.sources.USER,
      );
      expect(index).toBe(0);
      expect(length).toBe(1);
      expect(formats).toEqual({});
      expect(source).toBe(Quill.sources.USER);
    });

    it('(range:range)', function() {
      const [index, length, formats, source] = overload(new Range(0, 1));
      expect(index).toBe(0);
      expect(length).toBe(1);
      expect(formats).toEqual({});
      expect(source).toBe(Quill.sources.API);
    });

    it('(range:range, dummy:number)', function() {
      const [index, length, formats, source] = overload(new Range(10, 1), 0);
      expect(index).toBe(10);
      expect(length).toBe(1);
      expect(formats).toEqual({});
      expect(source).toBe(Quill.sources.API);
    });

    it('(range:range, dummy:number, format:string, value:boolean)', function() {
      const [index, length, formats, source] = overload(
        new Range(10, 1),
        0,
        'bold',
        true,
      );
      expect(index).toBe(10);
      expect(length).toBe(1);
      expect(formats).toEqual({ bold: true });
      expect(source).toBe(Quill.sources.API);
    });

    it('(range:range, dummy:number, format:object, source:string)', function() {
      const [index, length, formats, source] = overload(
        new Range(10, 1),
        0,
        { bold: true },
        Quill.sources.USER,
      );
      expect(index).toBe(10);
      expect(length).toBe(1);
      expect(formats).toEqual({ bold: true });
      expect(source).toBe(Quill.sources.USER);
    });
  });

  describe('placeholder', function() {
    beforeEach(function() {
      this.initialize(HTMLElement, '<div><p></p></div>');
      this.quill = new Quill(this.container.firstChild, {
        placeholder: 'a great day to be a placeholder',
      });
      this.original = this.quill.getContents();
    });

    it('blank editor', function() {
      expect(this.quill.root.dataset.placeholder).toEqual(
        'a great day to be a placeholder',
      );
      expect(this.quill.root.classList).toContain('ql-blank');
    });

    it('with text', function() {
      this.quill.setText('test');
      expect(this.quill.root.classList).not.toContain('ql-blank');
    });

    it('formatted line', function() {
      this.quill.formatLine(0, 1, 'list', 'ordered');
      expect(this.quill.root.classList).not.toContain('ql-blank');
    });
  });
});
