import Delta from 'quill-delta';
import { ClassAttributor, Scope } from 'parchment';
import type { Blot, ScrollBlot } from 'parchment';
import Inline from '../blots/inline.js';
import Quill from '../core/quill.js';
import Module from '../core/module.js';
import { blockDelta } from '../blots/block.js';
import BreakBlot from '../blots/break.js';
import CursorBlot from '../blots/cursor.js';
import TextBlot, { escapeText } from '../blots/text.js';
import CodeBlock, { CodeBlockContainer } from '../formats/code.js';
import { traverse } from './clipboard.js';

const TokenAttributor = new ClassAttributor('code-token', 'hljs', {
  scope: Scope.INLINE,
});
class CodeToken extends Inline {
  static formats(node: Element, scroll: ScrollBlot) {
    while (node != null && node !== scroll.domNode) {
      if (node.classList && node.classList.contains(CodeBlock.className)) {
        // @ts-expect-error
        return super.formats(node, scroll);
      }
      // @ts-expect-error
      node = node.parentNode;
    }
    return undefined;
  }

  constructor(scroll: ScrollBlot, domNode: Node, value: unknown) {
    // @ts-expect-error
    super(scroll, domNode, value);
    TokenAttributor.add(this.domNode, value);
  }

  format(format: string, value: unknown) {
    if (format !== CodeToken.blotName) {
      super.format(format, value);
    } else if (value) {
      TokenAttributor.add(this.domNode, value);
    } else {
      TokenAttributor.remove(this.domNode);
      this.domNode.classList.remove(this.statics.className);
    }
  }

  optimize(...args: unknown[]) {
    // @ts-expect-error
    super.optimize(...args);
    if (!TokenAttributor.value(this.domNode)) {
      this.unwrap();
    }
  }
}
CodeToken.blotName = 'code-token';
CodeToken.className = 'ql-token';

class SyntaxCodeBlock extends CodeBlock {
  static create(value: unknown) {
    const domNode = super.create(value);
    if (typeof value === 'string') {
      domNode.setAttribute('data-language', value);
    }
    return domNode;
  }

  static formats(domNode: Node) {
    // @ts-expect-error
    return domNode.getAttribute('data-language') || 'plain';
  }

  static register() {} // Syntax module will register

  format(name: string, value: unknown) {
    if (name === this.statics.blotName && value) {
      // @ts-expect-error
      this.domNode.setAttribute('data-language', value);
    } else {
      super.format(name, value);
    }
  }

  replaceWith(name: string, value: unknown) {
    this.formatAt(0, this.length(), CodeToken.blotName, false);
    return super.replaceWith(name, value);
  }
}

class SyntaxCodeBlockContainer extends CodeBlockContainer {
  forceNext?: boolean;
  cachedText?: string | null;

  attach() {
    super.attach();
    this.forceNext = false;
    // @ts-expect-error
    this.scroll.emitMount(this);
  }

  format(name: string, value: unknown) {
    if (name === SyntaxCodeBlock.blotName) {
      this.forceNext = true;
      this.children.forEach((child) => {
        // @ts-expect-error
        child.format(name, value);
      });
    }
  }

  formatAt(index: number, length: number, name: string, value: unknown) {
    if (name === SyntaxCodeBlock.blotName) {
      this.forceNext = true;
    }
    super.formatAt(index, length, name, value);
  }

  highlight(
    highlight: (text: string, language: string) => Delta,
    forced = false,
  ) {
    if (this.children.head == null) return;
    const nodes = Array.from(this.domNode.childNodes).filter(
      (node) => node !== this.uiNode,
    );
    const text = `${nodes.map((node) => node.textContent).join('\n')}\n`;
    const language = SyntaxCodeBlock.formats(this.children.head.domNode);
    if (forced || this.forceNext || this.cachedText !== text) {
      if (text.trim().length > 0 || this.cachedText == null) {
        const oldDelta = this.children.reduce((delta, child) => {
          // @ts-expect-error
          return delta.concat(blockDelta(child, false));
        }, new Delta());
        const delta = highlight(text, language);
        oldDelta.diff(delta).reduce((index, { retain, attributes }) => {
          // Should be all retains
          if (!retain) return index;
          if (attributes) {
            Object.keys(attributes).forEach((format) => {
              if (
                [SyntaxCodeBlock.blotName, CodeToken.blotName].includes(format)
              ) {
                // @ts-expect-error
                this.formatAt(index, retain, format, attributes[format]);
              }
            });
          }
          // @ts-expect-error
          return index + retain;
        }, 0);
      }
      this.cachedText = text;
      this.forceNext = false;
    }
  }

  html(index: number, length: number) {
    const [codeBlock] = this.children.find(index);
    const language = codeBlock
      ? SyntaxCodeBlock.formats(codeBlock.domNode)
      : 'plain';

    return `<pre data-language="${language}">\n${escapeText(
      this.code(index, length),
    )}\n</pre>`;
  }

  optimize(context: Record<string, any>) {
    super.optimize(context);
    if (
      this.parent != null &&
      this.children.head != null &&
      this.uiNode != null
    ) {
      const language = SyntaxCodeBlock.formats(this.children.head.domNode);
      // @ts-expect-error
      if (language !== this.uiNode.value) {
        // @ts-expect-error
        this.uiNode.value = language;
      }
    }
  }
}
// @ts-expect-error
SyntaxCodeBlockContainer.allowedChildren = [SyntaxCodeBlock];
SyntaxCodeBlock.requiredContainer = SyntaxCodeBlockContainer;
SyntaxCodeBlock.allowedChildren = [CodeToken, CursorBlot, TextBlot, BreakBlot];

interface SyntaxOptions {
  interval: number;
  languages: { key: string; label: string }[];
  hljs: any;
}

const highlight = (lib: any, language: string, text: string) => {
  if (typeof lib.versionString === 'string') {
    const majorVersion = lib.versionString.split('.')[0];
    if (parseInt(majorVersion, 10) >= 11) {
      return lib.highlight(text, { language }).value;
    }
  }
  return lib.highlight(language, text).value;
};

class Syntax extends Module<SyntaxOptions> {
  static DEFAULTS: SyntaxOptions & { hljs: any };

  static register() {
    Quill.register(CodeToken, true);
    // @ts-expect-error
    Quill.register(SyntaxCodeBlock, true);
    Quill.register(SyntaxCodeBlockContainer, true);
  }

  languages: Record<string, true>;

  constructor(quill: Quill, options: Partial<SyntaxOptions>) {
    super(quill, options);
    if (this.options.hljs == null) {
      throw new Error(
        'Syntax module requires highlight.js. Please include the library on the page before Quill.',
      );
    }
    // @ts-expect-error Fix me later
    this.languages = this.options.languages.reduce(
      (memo: Record<string, unknown>, { key }) => {
        memo[key] = true;
        return memo;
      },
      {},
    );
    this.highlightBlot = this.highlightBlot.bind(this);
    this.initListener();
    this.initTimer();
  }

  initListener() {
    this.quill.on(Quill.events.SCROLL_BLOT_MOUNT, (blot: Blot) => {
      if (!(blot instanceof SyntaxCodeBlockContainer)) return;
      const select = this.quill.root.ownerDocument.createElement('select');
      // @ts-expect-error Fix me later
      this.options.languages.forEach(({ key, label }) => {
        const option = select.ownerDocument.createElement('option');
        option.textContent = label;
        option.setAttribute('value', key);
        select.appendChild(option);
      });
      select.addEventListener('change', () => {
        blot.format(SyntaxCodeBlock.blotName, select.value);
        this.quill.root.focus(); // Prevent scrolling
        this.highlight(blot, true);
      });
      if (blot.uiNode == null) {
        blot.attachUI(select);
        if (blot.children.head) {
          select.value = SyntaxCodeBlock.formats(blot.children.head.domNode);
        }
      }
    });
  }

  initTimer() {
    let timer: ReturnType<typeof setTimeout> | null = null;
    this.quill.on(Quill.events.SCROLL_OPTIMIZE, () => {
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => {
        this.highlight();
        timer = null;
      }, this.options.interval);
    });
  }

  highlight(blot: SyntaxCodeBlockContainer | null = null, force = false) {
    if (this.quill.selection.composing) return;
    this.quill.update(Quill.sources.USER);
    const range = this.quill.getSelection();
    const blots =
      blot == null
        ? this.quill.scroll.descendants(SyntaxCodeBlockContainer)
        : [blot];
    blots.forEach((container) => {
      container.highlight(this.highlightBlot, force);
    });
    this.quill.update(Quill.sources.SILENT);
    if (range != null) {
      this.quill.setSelection(range, Quill.sources.SILENT);
    }
  }

  highlightBlot(text: string, language = 'plain') {
    language = this.languages[language] ? language : 'plain';
    if (language === 'plain') {
      return escapeText(text)
        .split('\n')
        .reduce((delta, line, i) => {
          if (i !== 0) {
            delta.insert('\n', { [CodeBlock.blotName]: language });
          }
          return delta.insert(line);
        }, new Delta());
    }
    const container = this.quill.root.ownerDocument.createElement('div');
    container.classList.add(CodeBlock.className);
    container.innerHTML = highlight(this.options.hljs, language, text);
    return traverse(
      this.quill.scroll,
      container,
      [
        (node, delta) => {
          // @ts-expect-error
          const value = TokenAttributor.value(node);
          if (value) {
            return delta.compose(
              new Delta().retain(delta.length(), {
                [CodeToken.blotName]: value,
              }),
            );
          }
          return delta;
        },
      ],
      [
        (node, delta) => {
          return node.data.split('\n').reduce((memo, nodeText, i) => {
            if (i !== 0) memo.insert('\n', { [CodeBlock.blotName]: language });
            return memo.insert(nodeText);
          }, delta);
        },
      ],
      new WeakMap(),
    );
  }
}
Syntax.DEFAULTS = {
  hljs: (() => {
    return window.hljs;
  })(),
  interval: 1000,
  languages: [
    { key: 'plain', label: 'Plain' },
    { key: 'bash', label: 'Bash' },
    { key: 'cpp', label: 'C++' },
    { key: 'cs', label: 'C#' },
    { key: 'css', label: 'CSS' },
    { key: 'diff', label: 'Diff' },
    { key: 'xml', label: 'HTML/XML' },
    { key: 'java', label: 'Java' },
    { key: 'javascript', label: 'JavaScript' },
    { key: 'markdown', label: 'Markdown' },
    { key: 'php', label: 'PHP' },
    { key: 'python', label: 'Python' },
    { key: 'ruby', label: 'Ruby' },
    { key: 'sql', label: 'SQL' },
  ],
};

export { SyntaxCodeBlock as CodeBlock, CodeToken, Syntax as default };
