import Quill from './core/quill';

import Block, { BlockEmbed } from './blots/block';
import Break from './blots/break';
import Container from './blots/container';
import Cursor from './blots/cursor';
import Embed from './blots/embed';
import Inline from './blots/inline';
import Scroll from './blots/scroll';
import TextBlot from './blots/text';

import Selection from './modules/selection';
import Clipboard from './modules/clipboard';
import History from './modules/history';
import Keyboard from './modules/keyboard';
import Uploader from './modules/uploader';
import Delta, { Op, OpIterator, AttributeMap } from 'quill-delta';

export { Delta, Op, OpIterator, AttributeMap };

Quill.register({
  'blots/block': Block,
  'blots/block/embed': BlockEmbed,
  'blots/break': Break,
  'blots/container': Container,
  'blots/cursor': Cursor,
  'blots/embed': Embed,
  'blots/inline': Inline,
  'blots/scroll': Scroll,
  'blots/text': TextBlot,

  'modules/selection': Selection,
  'modules/clipboard': Clipboard,
  'modules/history': History,
  'modules/keyboard': Keyboard,
  'modules/uploader': Uploader,
});

export default Quill;
