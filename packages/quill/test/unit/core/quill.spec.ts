import '../../../src/quill.js';
import Delta from 'quill-delta';
import { LeafBlot, Registry } from 'parchment';
import { afterEach, beforeEach, describe, expect, test, vitest } from 'vitest';
import type { MockedFunction } from 'vitest';
import Emitter from '../../../src/core/emitter.js';
import Theme from '../../../src/core/theme.js';
import Toolbar from '../../../src/modules/toolbar.js';
import Quill, {
  expandConfig,
  globalRegistry,
  overload,
} from '../../../src/core/quill.js';
import { Range } from '../../../src/core/selection.js';
import Snow from '../../../src/themes/snow.js';
import { normalizeHTML } from '../__helpers__/utils.js';

const createContainer = (html: string | { html: string } = '') => {
  const container = document.createElement('div');
  container.innerHTML = normalizeHTML(html);
  document.body.appendChild(container);
  return container;
};

describe('Quill', () => {
  test('imports', () => {
    Object.keys(Quill.imports).forEach((path) => {
      expect(Quill.import(path)).toBeTruthy();
    });
  });

  describe('register', () => {
    const imports = { ...Quill.imports };
    afterEach(() => {
      Quill.imports = imports;
    });

    test('register(path, target)', () => {
      class Counter {}
      Quill.register('modules/counter', Counter);

      expect(Quill.imports).toHaveProperty('modules/counter', Counter);
      expect(Quill.import('modules/counter')).toEqual(Counter);
    });

    test('register(formats)', () => {
      class MyCounterBlot extends LeafBlot {
        static blotName = 'my-counter';
        static className = 'ql-my-counter';
      }
      Quill.register(MyCounterBlot);

      expect(Quill.imports).toHaveProperty('formats/my-counter', MyCounterBlot);
      expect(Quill.import('formats/my-counter')).toEqual(MyCounterBlot);
    });

    test('register(targets)', () => {
      class ABlot extends LeafBlot {
        static blotName = 'a-blot';
        static className = 'ql-a-blot';
      }
      class AModule {}
      Quill.register({
        'formats/a-blot': ABlot,
        'modules/a-module': AModule,
      });

      expect(Quill.import('formats/a-blot')).toEqual(ABlot);
      expect(Quill.import('modules/a-module')).toEqual(AModule);
    });
  });

  describe('construction', () => {
    test('empty', () => {
      const quill = new Quill(createContainer());
      expect(quill.getContents()).toEqual(new Delta().insert('\n'));
      expect(quill.root.innerHTML).toMatchInlineSnapshot('"<p><br></p>"');
    });

    test('text', () => {
      const quill = new Quill(createContainer('0123'));
      expect(quill.getContents()).toEqual(new Delta().insert('0123\n'));
      expect(quill.root.innerHTML).toMatchInlineSnapshot('"<p>0123</p>"');
    });

    test('newlines', () => {
      const quill = new Quill(
        createContainer('<p><br></p><p><br></p><p><br></p>'),
      );
      expect(quill.getContents()).toEqual(new Delta().insert('\n\n\n'));
      expect(quill.root.innerHTML).toMatchInlineSnapshot(
        '"<p><br></p><p><br></p><p><br></p>"',
      );
    });

    test('formatted ending', () => {
      const quill = new Quill(
        createContainer('<p class="ql-align-center">Test</p>'),
      );
      expect(quill.getContents()).toEqual(
        new Delta().insert('Test').insert('\n', { align: 'center' }),
      );
      expect(quill.root.innerHTML).toMatchInlineSnapshot(
        '"<p class="ql-align-center">Test</p>"',
      );
    });
  });

  describe('api', () => {
    const setup = () => {
      const quill = new Quill(createContainer('<p>0123<em>45</em>67</p>'));
      const oldDelta = quill.getContents();
      vitest.spyOn(quill.emitter, 'emit');
      return { quill, oldDelta };
    };

    describe('deleteText()', () => {
      test('delete text', () => {
        const { quill, oldDelta } = setup();
        quill.deleteText(3, 2);
        const change = new Delta().retain(3).delete(2);
        expect(quill.root.innerHTML).toMatchInlineSnapshot(
          '"<p>012<em>5</em>67</p>"',
        );
        expect(quill.emitter.emit).toHaveBeenCalledWith(
          Emitter.events.TEXT_CHANGE,
          change,
          oldDelta,
          Emitter.sources.API,
        );
      });

      test('delete 0 length', () => {
        const { quill } = setup();
        const delta = quill.deleteText(3, 0);
        expect(delta).toEqual(new Delta());
        expect(quill.emitter.emit).not.toHaveBeenCalledWith(
          Emitter.events.TEXT_CHANGE,
          expect.anything(),
          expect.anything(),
          expect.anything(),
        );
      });

      test('delete after trailing', () => {
        const { quill } = setup();
        const delta = quill.deleteText(100000, 10);
        expect(delta).toEqual(new Delta());
        expect(quill.emitter.emit).not.toHaveBeenCalledWith(
          Emitter.events.TEXT_CHANGE,
          expect.anything(),
          expect.anything(),
          expect.anything(),
        );
      });
    });

    test('format()', () => {
      const { quill, oldDelta } = setup();
      quill.setSelection(3, 2);
      quill.format('bold', true);
      const change = new Delta().retain(3).retain(2, { bold: true });
      expect(quill.root.innerHTML).toMatchInlineSnapshot(
        '"<p>012<strong>3<em>4</em></strong><em>5</em>67</p>"',
      );
      expect(quill.emitter.emit).toHaveBeenCalledWith(
        Emitter.events.TEXT_CHANGE,
        change,
        oldDelta,
        Emitter.sources.API,
      );
      expect(quill.getSelection()).toEqual(new Range(3, 2));
    });

    test('formatLine()', () => {
      const { quill, oldDelta } = setup();
      quill.formatLine(1, 1, 'header', 2);
      const change = new Delta().retain(8).retain(1, { header: 2 });
      expect(quill.root.innerHTML).toMatchInlineSnapshot(
        '"<h2>0123<em>45</em>67</h2>"',
      );
      expect(quill.emitter.emit).toHaveBeenCalledWith(
        Emitter.events.TEXT_CHANGE,
        change,
        oldDelta,
        Emitter.sources.API,
      );
    });

    describe('formatText()', () => {
      test('single format', () => {
        const { quill, oldDelta } = setup();
        quill.formatText(3, 2, 'bold', true);
        const change = new Delta().retain(3).retain(2, { bold: true });
        expect(quill.root.innerHTML).toMatchInlineSnapshot(
          '"<p>012<strong>3<em>4</em></strong><em>5</em>67</p>"',
        );
        expect(quill.emitter.emit).toHaveBeenCalledWith(
          Emitter.events.TEXT_CHANGE,
          change,
          oldDelta,
          Emitter.sources.API,
        );
      });

      test('format object', () => {
        const { quill, oldDelta } = setup();
        quill.formatText(3, 2, { bold: true });
        const change = new Delta().retain(3).retain(2, { bold: true });
        expect(quill.root.innerHTML).toMatchInlineSnapshot(
          '"<p>012<strong>3<em>4</em></strong><em>5</em>67</p>"',
        );
        expect(quill.emitter.emit).toHaveBeenCalledWith(
          Emitter.events.TEXT_CHANGE,
          change,
          oldDelta,
          Emitter.sources.API,
        );
      });
    });

    test('insertEmbed()', () => {
      const { quill, oldDelta } = setup();
      quill.insertEmbed(5, 'image', '/assets/favicon.png');
      const change = new Delta()
        .retain(5)
        .insert({ image: '/assets/favicon.png' }, { italic: true });
      expect(quill.root.innerHTML).toMatchInlineSnapshot(
        '"<p>0123<em>4<img src="/assets/favicon.png">5</em>67</p>"',
      );
      expect(quill.emitter.emit).toHaveBeenCalledWith(
        Emitter.events.TEXT_CHANGE,
        change,
        oldDelta,
        Emitter.sources.API,
      );
    });

    test('insertText()', () => {
      const { quill, oldDelta } = setup();
      quill.insertText(5, '|', 'bold', true);
      const change = new Delta()
        .retain(5)
        .insert('|', { bold: true, italic: true });
      expect(quill.root.innerHTML).toMatchInlineSnapshot(
        '"<p>0123<em>4</em><strong><em>|</em></strong><em>5</em>67</p>"',
      );
      expect(quill.emitter.emit).toHaveBeenCalledWith(
        Emitter.events.TEXT_CHANGE,
        change,
        oldDelta,
        Emitter.sources.API,
      );
    });

    test('enable/disable', () => {
      const { quill } = setup();
      quill.disable();
      expect(quill.root.getAttribute('contenteditable')).toEqual('false');
      quill.enable();
      expect(quill.root.getAttribute('contenteditable')).toBeTruthy();
    });

    test('getBounds() index', () => {
      const { quill } = setup();
      expect(quill.getBounds(1)).toBeTruthy();
    });

    test('getBounds() range', () => {
      const { quill } = setup();
      expect(quill.getBounds(new Range(3, 4))).toBeTruthy();
    });

    test('getFormat()', () => {
      const { quill } = setup();
      const formats = quill.getFormat(5);
      expect(formats).toEqual({ italic: true });
    });

    test('getSelection()', () => {
      const { quill } = setup();
      expect(quill.getSelection()).toEqual(null);
      const range = new Range(1, 2);
      quill.setSelection(range);
      expect(quill.getSelection()).toEqual(range);
    });

    test('removeFormat()', () => {
      const { quill, oldDelta } = setup();
      quill.removeFormat(5, 1);
      const change = new Delta().retain(5).retain(1, { italic: null });
      expect(quill.root.innerHTML).toMatchInlineSnapshot(
        '"<p>0123<em>4</em>567</p>"',
      );
      expect(quill.emitter.emit).toHaveBeenCalledWith(
        Emitter.events.TEXT_CHANGE,
        change,
        oldDelta,
        Emitter.sources.API,
      );
    });

    test('updateContents() delta', () => {
      const { quill, oldDelta } = setup();
      const delta = new Delta().retain(5).insert('|');
      quill.updateContents(delta);
      expect(quill.root.innerHTML).toMatchInlineSnapshot(
        '"<p>0123<em>4</em>|<em>5</em>67</p>"',
      );
      expect(quill.emitter.emit).toHaveBeenCalledWith(
        Emitter.events.TEXT_CHANGE,
        delta,
        oldDelta,
        Emitter.sources.API,
      );
    });

    test('updateContents() ops array', () => {
      const { quill, oldDelta } = setup();
      const delta = new Delta().retain(5).insert('|');
      quill.updateContents(delta.ops);
      expect(quill.root.innerHTML).toMatchInlineSnapshot(
        '"<p>0123<em>4</em>|<em>5</em>67</p>"',
      );
      expect(quill.emitter.emit).toHaveBeenCalledWith(
        Emitter.events.TEXT_CHANGE,
        delta,
        oldDelta,
        Emitter.sources.API,
      );
    });
  });

  describe('events', () => {
    const setup = () => {
      const quill = new Quill(createContainer('<p>0123</p>'));
      quill.update();
      vitest.spyOn(quill.emitter, 'emit');
      const oldDelta = quill.getContents();
      return { quill, oldDelta };
    };

    test('api text insert', () => {
      const { quill, oldDelta } = setup();
      quill.insertText(2, '!');
      const delta = new Delta().retain(2).insert('!');
      expect(quill.emitter.emit).toHaveBeenCalledWith(
        Emitter.events.TEXT_CHANGE,
        delta,
        oldDelta,
        Emitter.sources.API,
      );
    });

    test('user text insert', async () => {
      const { quill, oldDelta } = setup();
      (quill.root.firstChild?.firstChild as Text).data = '01!23';
      const delta = new Delta().retain(2).insert('!');

      await new Promise((r) => setTimeout(r, 1));
      expect(quill.emitter.emit).toHaveBeenCalledWith(
        Emitter.events.TEXT_CHANGE,
        delta,
        oldDelta,
        Emitter.sources.USER,
      );
    });

    const editTest = (
      oldText: string,
      oldSelection: number | Range,
      newText: string,
      newSelection: number | Range,
      expectedDelta: Delta,
    ) => {
      return async () => {
        const { quill } = setup();
        quill.setText(`${oldText}\n`);
        // @ts-expect-error
        quill.setSelection(oldSelection);
        quill.update();
        const oldContents = quill.getContents();
        const textNode = quill.root.firstChild?.firstChild as Text;
        textNode.data = newText;
        if (typeof newSelection === 'number') {
          quill.selection.setNativeRange(textNode, newSelection);
        } else {
          quill.selection.setNativeRange(
            textNode,
            newSelection.index,
            textNode,
            newSelection.index + newSelection.length,
          );
        }
        await new Promise((r) => setTimeout(r, 1));
        const calls = (
          quill.emitter.emit as MockedFunction<typeof quill.emitter.emit>
        ).mock.calls;
        if (calls[calls.length - 1][1] === Emitter.events.SELECTION_CHANGE) {
          calls.pop();
        }
        const args = calls.pop();
        expect(args).toEqual([
          Emitter.events.TEXT_CHANGE,
          expectedDelta,
          oldContents,
          Emitter.sources.USER,
        ]);
      };
    };

    describe('insert a in aaaa', () => {
      test(
        'at index 0',
        editTest('aaaa', 0, 'aaaaa', 1, new Delta().insert('a')),
      );
      test(
        'at index 1',
        editTest('aaaa', 1, 'aaaaa', 2, new Delta().retain(1).insert('a')),
      );
      test(
        'at index 2',
        editTest('aaaa', 2, 'aaaaa', 3, new Delta().retain(2).insert('a')),
      );
      test(
        'at index 3',
        editTest('aaaa', 3, 'aaaaa', 4, new Delta().retain(3).insert('a')),
      );
    });

    describe('insert a in xaa', () => {
      test(
        'at index 1',
        editTest('xaa', 1, 'xaaa', 2, new Delta().retain(1).insert('a')),
      );
      test(
        'at index 2',
        editTest('xaa', 2, 'xaaa', 3, new Delta().retain(2).insert('a')),
      );
      test(
        'at index 3',
        editTest('xaa', 3, 'xaaa', 4, new Delta().retain(3).insert('a')),
      );
    });

    describe('insert aa in ax', () => {
      test(
        'at index 0',
        editTest('ax', 0, 'aaax', 2, new Delta().insert('aa')),
      );
      test(
        'at index 1',
        editTest('ax', 1, 'aaax', 3, new Delta().retain(1).insert('aa')),
      );
    });

    describe('delete a in xaa', () => {
      test(
        'at index 1',
        editTest('xaa', 2, 'xa', 1, new Delta().retain(1).delete(1)),
      );
      test(
        'at index 2',
        editTest('xaa', 3, 'xa', 2, new Delta().retain(2).delete(1)),
      );
    });

    describe('forward-delete a in xaa', () => {
      test(
        'at index 1',
        editTest('xaa', 1, 'xa', 1, new Delta().retain(1).delete(1)),
      );
      test(
        'at index 2',
        editTest('xaa', 2, 'xa', 2, new Delta().retain(2).delete(1)),
      );
    });

    test(
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

  describe('setContents()', () => {
    test('empty', () => {
      const quill = new Quill(createContainer(''));
      const delta = new Delta().insert('\n');
      quill.setContents(delta);
      expect(quill.getContents()).toEqual(delta);
      expect(quill.root.innerHTML).toMatchInlineSnapshot('"<p><br></p>"');
    });

    test('single line', () => {
      const quill = new Quill(createContainer(''));
      const delta = new Delta().insert('Hello World!\n');
      quill.setContents(delta);
      expect(quill.getContents()).toEqual(delta);
      expect(quill.root.innerHTML).toMatchInlineSnapshot(
        '"<p>Hello World!</p>"',
      );
    });

    test('multiple lines', () => {
      const quill = new Quill(createContainer(''));
      const delta = new Delta().insert('Hello\n\nWorld!\n');
      quill.setContents(delta);
      expect(quill.getContents()).toEqual(delta);
      expect(quill.root.innerHTML).toMatchInlineSnapshot(
        '"<p>Hello</p><p><br></p><p>World!</p>"',
      );
    });

    test('basic formats', () => {
      const quill = new Quill(createContainer(''));
      const delta = new Delta()
        .insert('Welcome')
        .insert('\n', { header: 1 })
        .insert('Hello\n')
        .insert('World')
        .insert('!', { bold: true })
        .insert('\n');
      quill.setContents(delta);
      expect(quill.getContents()).toEqual(delta);
      expect(quill.root.innerHTML).toMatchInlineSnapshot(
        '"<h1>Welcome</h1><p>Hello</p><p>World<strong>!</strong></p>"',
      );
    });

    test('array of operations', () => {
      const quill = new Quill(createContainer(''));
      const delta = new Delta()
        .insert('test')
        .insert('123', { bold: true })
        .insert('\n');
      quill.setContents(delta.ops);
      expect(quill.getContents()).toEqual(delta);
    });

    test('json', () => {
      const quill = new Quill(createContainer(''));
      const delta = new Delta().insert('test\n');
      quill.setContents(delta);
      expect(quill.getContents()).toEqual(new Delta(delta));
    });

    test('no trailing newline', () => {
      const quill = new Quill(createContainer('<h1>Welcome</h1>'));
      quill.setContents(new Delta().insert('0123'));
      expect(quill.getContents()).toEqual(new Delta().insert('0123\n'));
    });

    test('inline formatting', () => {
      const quill = new Quill(
        createContainer('<p><strong>Bold</strong></p><p>Not bold</p>'),
      );
      const contents = quill.getContents();
      const delta = quill.setContents(contents);
      expect(quill.getContents()).toEqual(contents);
      expect(delta).toEqual(contents.delete(contents.length()));
    });

    test('block embed', () => {
      const quill = new Quill(createContainer('<p>Hello World!</p>'));
      const contents = new Delta().insert({ video: '#' });
      quill.setContents(contents);
      expect(quill.getContents()).toEqual(contents);
    });
  });

  describe('getText()', () => {
    test('return all text by default', () => {
      const quill = new Quill(createContainer('<h1>Welcome</h1>'));
      expect(quill.getText()).toMatchInlineSnapshot(`
        "Welcome
        "
      `);
    });

    test('works when only provide index', () => {
      const quill = new Quill(createContainer('<h1>Welcome</h1>'));
      expect(quill.getText(2)).toMatchInlineSnapshot(`
        "lcome
        "
      `);
    });

    test('works when provide index and length', () => {
      const quill = new Quill(createContainer('<h1>Welcome</h1>'));
      expect(quill.getText(2, 3)).toMatchInlineSnapshot(`
        "lco"
      `);
    });

    test('works with range', () => {
      const quill = new Quill(createContainer('<h1>Welcome</h1>'));
      expect(quill.getText({ index: 1, length: 2 })).toMatchInlineSnapshot(
        '"el"',
      );
    });
  });

  describe('getSemanticHTML()', () => {
    test('return all html by default', () => {
      const quill = new Quill(createContainer('<h1>Welcome</h1>'));
      expect(quill.getSemanticHTML()).toMatchInlineSnapshot(`
        "<h1>Welcome</h1>"
      `);
    });

    test('works when only provide index', () => {
      const quill = new Quill(createContainer('<h1>Welcome</h1>'));
      expect(quill.getSemanticHTML(2)).toMatchInlineSnapshot(`
        "lcome"
      `);
    });

    test('works when provide index and length', () => {
      const quill = new Quill(createContainer('<h1>Welcome</h1>'));
      expect(quill.getSemanticHTML(2, 3)).toMatchInlineSnapshot(`
        "lco"
      `);
    });

    test('works with range', () => {
      const quill = new Quill(createContainer('<h1>Welcome</h1>'));
      expect(quill.getText({ index: 1, length: 2 })).toMatchInlineSnapshot(
        '"el"',
      );
    });
  });

  describe('setText()', () => {
    test('overwrite', () => {
      const quill = new Quill(createContainer('<h1>Welcome</h1>'));
      quill.setText('abc');
      expect(quill.root.innerHTML).toMatchInlineSnapshot('"<p>abc</p>"');
    });

    test('set to newline', () => {
      const quill = new Quill(createContainer('<h1>Welcome</h1>'));
      quill.setText('\n');
      expect(quill.root.innerHTML).toMatchInlineSnapshot('"<p><br></p>"');
    });

    test('multiple newlines', () => {
      const quill = new Quill(createContainer('<h1>Welcome</h1>'));
      quill.setText('\n\n');
      expect(quill.root.innerHTML).toMatchInlineSnapshot(
        '"<p><br></p><p><br></p>"',
      );
    });

    test('content with trailing newline', () => {
      const quill = new Quill(createContainer('<h1>Welcome</h1>'));
      quill.setText('abc\n');
      expect(quill.root.innerHTML).toMatchInlineSnapshot('"<p>abc</p>"');
    });

    test('return carriage', () => {
      const quill = new Quill(createContainer('<p>Test</p>'));
      quill.setText('\r');
      expect(quill.root.innerHTML).toMatchInlineSnapshot('"<p><br></p>"');
    });

    test('return carriage newline', () => {
      const quill = new Quill(createContainer('<p>Test</p>'));
      quill.setText('\r\n');
      expect(quill.root.innerHTML).toMatchInlineSnapshot('"<p><br></p>"');
    });
  });

  describe('expandConfig', () => {
    const testContainerId = 'testContainer';
    beforeEach(() => {
      const testContainer = document.createElement('div');
      testContainer.id = testContainerId;
      document.body.appendChild(testContainer);
    });

    test('user overwrite quill', () => {
      const config = expandConfig(`#${testContainerId}`, {
        placeholder: 'Test',
        readOnly: true,
      });
      expect(config.placeholder).toEqual('Test');
      expect(config.readOnly).toEqual(true);
    });

    test('convert css selectors', () => {
      const config = expandConfig(`#${testContainerId}`, {
        bounds: `#${testContainerId}`,
      });
      expect(config.bounds).toEqual(
        document.querySelector(`#${testContainerId}`),
      );
      expect(config.container).toEqual(
        document.querySelector(`#${testContainerId}`),
      );
    });

    test('convert module true to {}', () => {
      const config = expandConfig(`#${testContainerId}`, {
        modules: {
          syntax: true,
        },
      });
      expect(config.modules.syntax).toMatchObject({
        interval: 1000,
      });
    });

    describe('theme defaults', () => {
      test('for Snow', () => {
        const config = expandConfig(`#${testContainerId}`, {
          modules: {
            toolbar: true,
          },
          theme: 'snow',
        });
        expect(config.theme).toEqual(Snow);
        // @ts-expect-error
        expect(config.modules.toolbar.handlers.image).toEqual(
          Snow.DEFAULTS.modules.toolbar?.handlers?.image,
        );
      });

      test('for false', () => {
        const config = expandConfig(`#${testContainerId}`, {
          // @ts-expect-error
          theme: false,
        });
        expect(config.theme).toEqual(Theme);
      });

      test('for undefined', () => {
        const config = expandConfig(`#${testContainerId}`, {
          theme: undefined,
        });
        expect(config.theme).toEqual(Theme);
      });

      test('for null', () => {
        const config = expandConfig(`#${testContainerId}`, {
          // @ts-expect-error
          theme: null,
        });
        expect(config.theme).toEqual(Theme);
      });
    });

    test('quill < module < theme < user', () => {
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
      const config = expandConfig(`#${testContainerId}`, {
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

    test('toolbar default', () => {
      const config = expandConfig(`#${testContainerId}`, {
        modules: {
          toolbar: true,
        },
      });
      expect(config.modules.toolbar).toEqual(Toolbar.DEFAULTS);
    });

    test('toolbar disabled', () => {
      const config = expandConfig(`#${testContainerId}`, {
        modules: {
          toolbar: false,
        },
        theme: 'snow',
      });
      expect(config.modules.toolbar).toBe(undefined);
    });

    test('toolbar selector', () => {
      const config = expandConfig(`#${testContainerId}`, {
        modules: {
          toolbar: {
            container: `#${testContainerId}`,
          },
        },
      });
      expect(config.modules.toolbar).toEqual({
        container: `#${testContainerId}`,
        handlers: Toolbar.DEFAULTS.handlers,
      });
    });

    test('toolbar container shorthand', () => {
      const config = expandConfig(`#${testContainerId}`, {
        modules: {
          toolbar: document.querySelector(`#${testContainerId}`),
        },
      });
      expect(config.modules.toolbar).toEqual({
        container: document.querySelector(`#${testContainerId}`),
        handlers: Toolbar.DEFAULTS.handlers,
      });
    });

    test('toolbar container shorthand with theme options', () => {
      const config = expandConfig(`#${testContainerId}`, {
        modules: {
          toolbar: document.querySelector(`#${testContainerId}`),
        },
        theme: 'snow',
      });
      for (const [format, handler] of Object.entries(
        Snow.DEFAULTS.modules.toolbar!.handlers ?? {},
      )) {
        // @ts-expect-error
        expect(config.modules.toolbar.handlers[format]).toBe(handler);
      }
    });

    test('toolbar format array', () => {
      const config = expandConfig(`#${testContainerId}`, {
        modules: {
          toolbar: ['bold'],
        },
      });
      expect(config.modules.toolbar).toEqual({
        container: ['bold'],
        handlers: Toolbar.DEFAULTS.handlers,
      });
    });

    test('toolbar custom handler, default container', () => {
      const handler = () => {}; // eslint-disable-line func-style
      const config = expandConfig(`#${testContainerId}`, {
        modules: {
          toolbar: {
            handlers: {
              bold: handler,
            },
          },
        },
      });
      // @ts-expect-error
      expect(config.modules.toolbar.container).toEqual(null);
      // @ts-expect-error
      expect(config.modules.toolbar.handlers.bold).toEqual(handler);
      // @ts-expect-error
      expect(config.modules.toolbar.handlers.clean).toEqual(
        // @ts-expect-error
        Toolbar.DEFAULTS.handlers.clean,
      );
    });

    test('registry defaults to globalRegistry', () => {
      const config = expandConfig(`#${testContainerId}`, {});
      expect(config.registry).toBe(globalRegistry);
    });

    test('registry with undefined values', () => {
      const config = expandConfig(`#${testContainerId}`, {
        registry: undefined,
      });
      expect(config.registry).toBe(globalRegistry);
    });

    describe('formats', () => {
      test('null value allows all formats', () => {
        const config = expandConfig(`#${testContainerId}`, {
          formats: null,
        });

        expect(config.registry.query('cursor')).toBeTruthy();
        expect(config.registry.query('bold')).toBeTruthy();
      });

      test('undefined value allows all formats', () => {
        const config = expandConfig(`#${testContainerId}`, {
          formats: undefined,
        });

        expect(config.registry.query('cursor')).toBeTruthy();
        expect(config.registry.query('bold')).toBeTruthy();
      });

      test('always allows core formats', () => {
        const config = expandConfig(`#${testContainerId}`, {
          formats: ['bold'],
        });

        expect(config.registry.query('cursor')).toBeTruthy();
        expect(config.registry.query('break')).toBeTruthy();
      });

      test('limits allowed formats', () => {
        const config = expandConfig(`#${testContainerId}`, {
          formats: ['bold'],
        });

        expect(config.registry.query('italic')).toBeFalsy();
        expect(config.registry.query('bold')).toBeTruthy();
      });

      test('ignores unknown formats', () => {
        const name = 'my-unregistered-format';
        const config = expandConfig(`#${testContainerId}`, {
          formats: [name],
        });

        expect(config.registry.query(name)).toBeFalsy();
      });

      test('registers list container when there is a list', () => {
        expect(
          expandConfig(`#${testContainerId}`, {
            formats: ['bold'],
          }).registry.query('list-container'),
        ).toBeFalsy();

        expect(
          expandConfig(`#${testContainerId}`, {
            formats: ['list'],
          }).registry.query('list-container'),
        ).toBeTruthy();
      });

      test('provides both registry and formats', () => {
        const registry = new Registry();
        const config = expandConfig(`#${testContainerId}`, {
          registry,
          formats: ['bold'],
        });

        expect(config.registry).toBe(registry);
        expect(config.registry.query('bold')).toBeFalsy();
      });
    });
  });

  describe('overload', () => {
    test('(index:number, length:number)', () => {
      const [index, length, formats, source] = overload(0, 1);
      expect(index).toBe(0);
      expect(length).toBe(1);
      expect(formats).toEqual({});
      expect(source).toBe(Quill.sources.API);
    });

    test('(index:number, length:number, format:string, value:boolean, source:string)', () => {
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

    test('(index:number, length:number, format:string, value:string, source:string)', () => {
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

    test('(index:number, length:number, format:string, value:string)', () => {
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

    test('(index:number, length:number, format:object)', () => {
      const [index, length, formats, source] = overload(0, 1, { bold: true });
      expect(index).toBe(0);
      expect(length).toBe(1);
      expect(formats).toEqual({ bold: true });
      expect(source).toBe(Quill.sources.API);
    });

    test('(index:number, length:number, format:object, source:string)', () => {
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

    test('(index:number, length:number, source:string)', () => {
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

    test('(index:number, source:string)', () => {
      const [index, length, formats, source] = overload(0, Quill.sources.USER);
      expect(index).toBe(0);
      expect(length).toBe(0);
      expect(formats).toEqual({});
      expect(source).toBe(Quill.sources.USER);
    });

    test('(range:range)', () => {
      const [index, length, formats, source] = overload(new Range(0, 1));
      expect(index).toBe(0);
      expect(length).toBe(1);
      expect(formats).toEqual({});
      expect(source).toBe(Quill.sources.API);
    });

    test('(range:range, format:string, value:boolean, source:string)', () => {
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

    test('(range:range, format:string, value:string, source:string)', () => {
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

    test('(range:range, format:string, value:string)', () => {
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

    test('(range:range, format:object)', () => {
      const [index, length, formats, source] = overload(new Range(0, 1), {
        bold: true,
      });
      expect(index).toBe(0);
      expect(length).toBe(1);
      expect(formats).toEqual({ bold: true });
      expect(source).toBe(Quill.sources.API);
    });

    test('(range:range, format:object, source:string)', () => {
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

    test('(range:range, source:string)', () => {
      const [index, length, formats, source] = overload(
        new Range(0, 1),
        Quill.sources.USER,
      );
      expect(index).toBe(0);
      expect(length).toBe(1);
      expect(formats).toEqual({});
      expect(source).toBe(Quill.sources.USER);
    });

    test('(range:range)', () => {
      const [index, length, formats, source] = overload(new Range(0, 1));
      expect(index).toBe(0);
      expect(length).toBe(1);
      expect(formats).toEqual({});
      expect(source).toBe(Quill.sources.API);
    });

    test('(range:range, dummy:number)', () => {
      // @ts-expect-error
      const [index, length, formats, source] = overload(new Range(10, 1), 0);
      expect(index).toBe(10);
      expect(length).toBe(1);
      expect(formats).toEqual({});
      expect(source).toBe(Quill.sources.API);
    });

    test('(range:range, dummy:number, format:string, value:boolean)', () => {
      // @ts-expect-error
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

    test('(range:range, dummy:number, format:object, source:string)', () => {
      // @ts-expect-error
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

  describe('placeholder', () => {
    const setup = () => {
      const container = createContainer('<p></p>');
      const quill = new Quill(container, {
        placeholder: 'a great day to be a placeholder',
      });
      return { quill };
    };

    test('blank editor', () => {
      const { quill } = setup();
      expect(quill.root.dataset.placeholder).toEqual(
        'a great day to be a placeholder',
      );
      expect([...quill.root.classList]).toContain('ql-blank');
    });

    test('with text', () => {
      const { quill } = setup();
      quill.setText('test');
      expect([...quill.root.classList]).not.toContain('ql-blank');
    });

    test('formatted line', () => {
      const { quill } = setup();
      quill.formatLine(0, 1, 'list', 'ordered');
      expect([...quill.root.classList]).not.toContain('ql-blank');
    });
  });

  describe('scrollSelectionIntoView', () => {
    const createContents = (separator: string) =>
      new Array(200)
        .fill(0)
        .map((_, i) => `text ${i + 1}`)
        .join(separator);

    const viewportRatio = (element: Element): Promise<number> => {
      return new Promise((resolve) => {
        const observer = new IntersectionObserver((entries) => {
          resolve(entries[0].intersectionRatio);
          observer.disconnect();
        });
        observer.observe(element);
        // Firefox doesn't call IntersectionObserver callback unless
        // there are rafs.
        requestAnimationFrame(() => {});
      });
    };

    test('scroll upward', async () => {
      document.body.style.height = '500px';
      const container = document.body.appendChild(
        document.createElement('div'),
      );

      Object.assign(container.style, {
        height: '100px',
        overflow: 'scroll',
      });

      const editorContainer = container.appendChild(
        document.createElement('div'),
      );
      Object.assign(editorContainer.style, {
        height: '100px',
        overflow: 'scroll',
        border: '10px solid red',
      });

      const space = container.appendChild(document.createElement('div'));
      space.style.height = '800px';

      const quill = new Quill(editorContainer);

      const text = createContents('\n');
      quill.setContents(new Delta().insert(text));
      quill.setSelection({ index: text.indexOf('text 10'), length: 4 }, 'user');

      container.scrollTop = -500;

      expect(
        await viewportRatio(
          editorContainer.querySelector('p:nth-child(10)') as HTMLElement,
        ),
      ).toBeGreaterThan(0.9);
      expect(
        await viewportRatio(
          editorContainer.querySelector('p:nth-child(11)') as HTMLElement,
        ),
      ).toEqual(0);
    });

    test('scroll downward', async () => {
      document.body.style.height = '500px';
      const container = document.body.appendChild(
        document.createElement('div'),
      );

      Object.assign(container.style, {
        height: '100px',
        overflow: 'scroll',
      });

      const space = container.appendChild(document.createElement('div'));
      space.style.height = '80px';

      const editorContainer = container.appendChild(
        document.createElement('div'),
      );
      Object.assign(editorContainer.style, {
        height: '100px',
        overflow: 'scroll',
        border: '10px solid red',
      });

      const quill = new Quill(editorContainer);

      const text = createContents('\n');
      quill.setContents(new Delta().insert(text));
      quill.setSelection(
        { index: text.indexOf('text 100'), length: 4 },
        'user',
      );

      expect(
        await viewportRatio(
          editorContainer.querySelector('p:nth-child(100)') as HTMLElement,
        ),
      ).toBeGreaterThan(0.9);
      expect(
        await viewportRatio(
          editorContainer.querySelector('p:nth-child(101)') as HTMLElement,
        ),
      ).toEqual(0);
    });

    test('scroll-padding', async () => {
      const container = document.body.appendChild(
        document.createElement('div'),
      );
      const quill = new Quill(container);
      Object.assign(quill.root.style, {
        scrollPaddingBottom: '50px',
        height: '200px',
        overflow: 'auto',
      });
      const text = createContents('\n');
      quill.setContents(new Delta().insert(text));
      quill.setSelection({ index: text.indexOf('text 10'), length: 4 }, 'user');
      expect(
        await viewportRatio(
          container.querySelector('p:nth-child(10)') as HTMLElement,
        ),
      ).toBe(1);
      expect(
        await viewportRatio(
          container.querySelector('p:nth-child(11)') as HTMLElement,
        ),
      ).toBe(1);
      quill.root.style.scrollPaddingBottom = '0';
      quill.setSelection(1, 'user');
      quill.setSelection({ index: text.indexOf('text 10'), length: 4 }, 'user');
      expect(
        await viewportRatio(
          container.querySelector('p:nth-child(11)') as HTMLElement,
        ),
      ).toBe(0);
    });

    test('inline scroll', async () => {
      const container = document.body.appendChild(
        document.createElement('div'),
      );

      Object.assign(container.style, {
        width: '200px',
        display: 'flex',
        overflow: 'scroll',
      });

      const space = container.appendChild(document.createElement('div'));
      space.style.width = '80px';

      const editorContainer = container.appendChild(
        document.createElement('div'),
      );
      Object.assign(editorContainer.style, {
        width: '100px',
        overflow: 'scroll',
        border: '10px solid red',
      });

      const quill = new Quill(editorContainer);

      Object.assign(quill.root.style, {
        overflow: 'scroll',
        whiteSpace: 'nowrap',
      });

      const text = createContents(' ');
      const text100Index = text.indexOf('text 100');
      const delta = new Delta()
        .insert(text)
        .compose(new Delta().retain(text100Index).retain(8, { bold: true }));
      quill.setContents(delta);
      quill.setSelection({ index: text100Index, length: 8 }, 'user');

      expect(
        await viewportRatio(
          editorContainer.querySelector('strong') as HTMLElement,
        ),
      ).toBeGreaterThan(0.9);

      quill.setSelection(0, 'user');
      expect(
        await viewportRatio(
          editorContainer.querySelector('strong') as HTMLElement,
        ),
      ).toEqual(0);
    });
  });
});
