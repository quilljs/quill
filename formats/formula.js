import Embed from '../blots/embed';
import AsciiMathParser from '../ascii2tex/asciimath2tex';

const USE_ASCII_MATHS = true;

class Formula extends Embed {
  static create(value) {
    if (window.katex == null) {
      throw new Error('Formula module requires KaTeX.');
    }
    const node = super.create(value);
    if (typeof value === 'string') {
      let laTexValue = value;
      if (USE_ASCII_MATHS) laTexValue = this.asciiMathsParser.parse(value);
      window.katex.render(laTexValue, node, {
        throwOnError: false,
        errorColor: '#f00',
      });
      node.setAttribute('data-value', value);
    }
    return node;
  }

  static value(domNode) {
    return domNode.getAttribute('data-value');
  }

  html() {
    const { formula } = this.value();
    return `<span>${formula}</span>`;
  }
}

Formula.asciiMathsParser = new AsciiMathParser();
Formula.blotName = 'formula';
Formula.className = 'ql-formula';
Formula.tagName = 'SPAN';

export default Formula;
