import { ClassAttributor, Scope } from 'parchment';

const config = {
  scope: Scope.BLOCK,
  whitelist: ['1', '1.15', '1.5', '2', '2.5', '3'],
};

class LineHeightClass extends ClassAttributor {
  add(node, value) {
    if (!this.canAdd(node, value)) return false;
    this.remove(node);
    const underscoredValue = value.replace('.', '_');
    node.classList.add(`${this.keyName}-${underscoredValue}`);
    return true;
  }
}

const LineHeight = new LineHeightClass('line-height', 'ql-line-height', config);

export default LineHeight;
