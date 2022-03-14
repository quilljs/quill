/* eslint-disable */

import Quill from '../quill.js';
import CodeBlock, { CodeBlockContainer } from '../formats/code';

import './helpers/unit';

import './unit/blots/scroll';
import './unit/blots/block';
import './unit/blots/block-embed';
import './unit/blots/inline';

import './unit/core/editor';
import './unit/core/selection';
import './unit/core/quill';
import './unit/core/theme';

import './unit/formats/color';
import './unit/formats/link';
import './unit/formats/script';
import './unit/formats/align';
import './unit/formats/code';
import './unit/formats/header';
import './unit/formats/indent';
import './unit/formats/list';
import './unit/formats/bold';
import './unit/formats/table';

import './unit/modules/clipboard';
import './unit/modules/history';
import './unit/modules/keyboard';
import './unit/modules/syntax';
import './unit/modules/table';
import './unit/modules/toolbar';

import './unit/ui/picker';
import './unit/theme/base/tooltip';

// Syntax version will otherwise be registered
Quill.register(CodeBlock, true);

export default Quill;
