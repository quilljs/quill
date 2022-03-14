import Quill from './core';

import { AlignClass, AlignStyle } from './formats/align';
import {
  DirectionAttribute,
  DirectionClass,
  DirectionStyle,
} from './formats/direction';
import Indent from './formats/indent';

import Blockquote from './formats/blockquote';
import Header from './formats/header';
import List from './formats/list';

import { BackgroundClass, BackgroundStyle } from './formats/background';
import { ColorClass, ColorStyle } from './formats/color';
import { FontClass, FontStyle } from './formats/font';
import { SizeClass, SizeStyle } from './formats/size';
import LineHeight from './formats/lineheight';

import Bold from './formats/bold';
import Italic from './formats/italic';
import Link from './formats/link';
import Script from './formats/script';
import Strike from './formats/strike';
import Underline from './formats/underline';

import Formula from './formats/formula';
import Image from './formats/image';
import Video from './formats/video';

import CodeBlock, { Code as InlineCode } from './formats/code';

import Syntax from './modules/syntax';
import Table from './modules/table';
import Toolbar from './modules/toolbar';

import Icons from './ui/icons';
import Picker from './ui/picker';
import ColorPicker from './ui/color-picker';
import LineHeightPicker from './ui/line-height-picker';
import IconPicker from './ui/icon-picker';
import Tooltip from './ui/tooltip';

import BubbleTheme from './themes/bubble';
import SnowTheme from './themes/snow';

Quill.register(
  {
    'attributors/attribute/direction': DirectionAttribute,

    'attributors/class/align': AlignClass,
    'attributors/class/background': BackgroundClass,
    'attributors/class/color': ColorClass,
    'attributors/class/direction': DirectionClass,
    'attributors/class/font': FontClass,
    'attributors/class/line-height': LineHeight,
    'attributors/class/size': SizeClass,

    'attributors/style/align': AlignStyle,
    'attributors/style/background': BackgroundStyle,
    'attributors/style/color': ColorStyle,
    'attributors/style/direction': DirectionStyle,
    'attributors/style/font': FontStyle,
    'attributors/style/size': SizeStyle,
  },
  true,
);

Quill.register(
  {
    'formats/align': AlignClass,
    'formats/direction': DirectionClass,
    'formats/indent': Indent,

    'formats/background': BackgroundStyle,
    'formats/color': ColorStyle,
    'formats/font': FontClass,
    'formats/line-height': LineHeight,
    'formats/size': SizeClass,

    'formats/blockquote': Blockquote,
    'formats/code-block': CodeBlock,
    'formats/header': Header,
    'formats/list': List,

    'formats/bold': Bold,
    'formats/code': InlineCode,
    'formats/italic': Italic,
    'formats/link': Link,
    'formats/script': Script,
    'formats/strike': Strike,
    'formats/underline': Underline,

    'formats/formula': Formula,
    'formats/image': Image,
    'formats/video': Video,

    'modules/syntax': Syntax,
    'modules/table': Table,
    'modules/toolbar': Toolbar,

    'themes/bubble': BubbleTheme,
    'themes/snow': SnowTheme,

    'ui/icons': Icons,
    'ui/picker': Picker,
    'ui/icon-picker': IconPicker,
    'ui/color-picker': ColorPicker,
    'ui/line-height-picker': LineHeightPicker,
    'ui/tooltip': Tooltip,
  },
  true,
);

export default Quill;
