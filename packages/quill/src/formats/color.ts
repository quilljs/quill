import { ClassAttributor, Scope, StyleAttributor } from 'parchment';

const ColorClass = new ClassAttributor('color', 'ql-color', {
  scope: Scope.INLINE,
});
const ColorStyle = new StyleAttributor('color', 'color', {
  scope: Scope.INLINE,
});

export { ColorClass, ColorStyle };
