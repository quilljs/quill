import Quill from '../quill.js';
import CodeBlock from '../formats/code';

Quill.register(CodeBlock, true); // Syntax version will otherwise be registered

import './helpers/unit.js';

import './unit/blots/scroll.js';
import './unit/blots/block.js';
import './unit/blots/block-embed.js';
import './unit/blots/inline.js';

import './unit/core/editor';
import './unit/core/security';
import './unit/core/selection';
import './unit/core/quill';

import './unit/formats/color';
import './unit/formats/link';
import './unit/formats/script';
import './unit/formats/align';
import './unit/formats/code';
import './unit/formats/header';
import './unit/formats/indent';
import './unit/formats/list';
import './unit/formats/bold';

import './unit/modules/clipboard';
import './unit/modules/history';
import './unit/modules/keyboard';
import './unit/modules/toolbar';

import './unit/ui/picker';
import './unit/theme/base/tooltip';


export default Quill;
