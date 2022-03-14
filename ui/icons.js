import alignLeftIcon from '../assets/icons/align-left.svg';
import alignCenterIcon from '../assets/icons/align-center.svg';
import alignRightIcon from '../assets/icons/align-right.svg';
import alignJustifyIcon from '../assets/icons/align-justify.svg';
import backgroundIcon from '../assets/icons/background.svg';
import blockquoteIcon from '../assets/icons/blockquote.svg';
import boldIcon from '../assets/icons/bold.svg';
import cleanIcon from '../assets/icons/clean.svg';
import codeIcon from '../assets/icons/code.svg';
import colorIcon from '../assets/icons/color.svg';
import directionLeftToRightIcon from '../assets/icons/direction-ltr.svg';
import directionRightToLeftIcon from '../assets/icons/direction-rtl.svg';
import formulaIcon from '../assets/icons/formula.svg';
import headerIcon from '../assets/icons/header.svg';
import header2Icon from '../assets/icons/header-2.svg';
import italicIcon from '../assets/icons/italic.svg';
import imageIcon from '../assets/icons/image.svg';
import indentIcon from '../assets/icons/indent.svg';
import outdentIcon from '../assets/icons/outdent.svg';
import lineHeightIcon from '../assets/icons/line-height.svg';
import linkIcon from '../assets/icons/link.svg';
import listBulletIcon from '../assets/icons/list-bullet.svg';
import listCheckIcon from '../assets/icons/list-check.svg';
import listOrderedIcon from '../assets/icons/list-ordered.svg';
import subscriptIcon from '../assets/icons/subscript.svg';
import superscriptIcon from '../assets/icons/superscript.svg';
import strikeIcon from '../assets/icons/strike.svg';
import tableIcon from '../assets/icons/table.svg';
import underlineIcon from '../assets/icons/underline.svg';
import videoIcon from '../assets/icons/video.svg';

export default {
  align: {
    '': alignLeftIcon,
    center: alignCenterIcon,
    right: alignRightIcon,
    justify: alignJustifyIcon,
  },
  background: backgroundIcon,
  blockquote: blockquoteIcon,
  bold: boldIcon,
  clean: cleanIcon,
  code: codeIcon,
  'code-block': codeIcon,
  color: colorIcon,
  direction: {
    '': directionLeftToRightIcon,
    rtl: directionRightToLeftIcon,
  },
  formula: formulaIcon,
  header: {
    '1': headerIcon,
    '2': header2Icon,
  },
  italic: italicIcon,
  image: imageIcon,
  indent: {
    '+1': indentIcon,
    '-1': outdentIcon,
  },
  lineHeight: lineHeightIcon,
  link: linkIcon,
  list: {
    bullet: listBulletIcon,
    check: listCheckIcon,
    ordered: listOrderedIcon,
  },
  script: {
    sub: subscriptIcon,
    super: superscriptIcon,
  },
  strike: strikeIcon,
  table: tableIcon,
  underline: underlineIcon,
  video: videoIcon,
};
