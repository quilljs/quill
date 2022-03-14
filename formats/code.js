import Block from '../blots/block';
import Break from '../blots/break';
import Cursor from '../blots/cursor';
import Inline from '../blots/inline';
import TextBlot, { escapeText } from '../blots/text';
import Container from '../blots/container';
import Quill from '../core/quill';

class CodeBlockContainer extends Container {
  static create(value) {
    const domNode = super.create(value);
    domNode.setAttribute('spellcheck', false);
    return domNode;
  }

  code(index, length) {
    return this.children
      .map(child => (child.length() <= 1 ? '' : child.domNode.innerText))
      .join('\n')
      .slice(index, index + length);
  }

  html(index, length) {
    // `\n`s are needed in order to support empty lines at the beginning and the end.
    // https://html.spec.whatwg.org/multipage/syntax.html#element-restrictions
    return `<pre>\n${escapeText(this.code(index, length))}\n</pre>`;
  }
}

class CodeBlock extends Block {
  static register(options) {
    Quill.register(CodeBlockContainer, options);
  }
}

class Code extends Inline {}
Code.blotName = 'code';
Code.tagName = 'CODE';

CodeBlock.blotName = 'code-block';
CodeBlock.className = 'ql-code-block';
CodeBlock.tagName = 'DIV';
CodeBlockContainer.blotName = 'code-block-container';
CodeBlockContainer.className = 'ql-code-block-container';
CodeBlockContainer.tagName = 'DIV';

CodeBlockContainer.allowedChildren = [CodeBlock];

CodeBlock.allowedChildren = [TextBlot, Break, Cursor];
CodeBlock.requiredContainer = CodeBlockContainer;
CodeBlock.TAB = '  ';

export { Code, CodeBlockContainer, CodeBlock as default };
