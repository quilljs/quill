import Parchment from 'parchment';
import Embed from '../blots/embed';


class Break extends Embed {
  length() {
    return 0;
  }

  value() {
    return '';
  }
}
Break.blotName = 'break';
Break.tagName = 'BR';


export default Break;
