import Parchment from 'parchment';
import clone from 'clone';
import equal from 'deep-equal';
import BreakBlot from '../blots/break';
import Emitter from './emitter';
import logger from './logger';

let debug = logger('quill:selection');


class Range {
  constructor(index, length = 0) {
    this.index = index;
    this.length = length;
  }
}


class Selection {
  constructor(scroll, emitter) {
    this.emitter = emitter;
    this.scroll = scroll;
    this.root = this.scroll.domNode;
    this.cursor = Parchment.create('cursor', this);
    // savedRange is last non-null range
    this.lastRange = this.savedRange = new Range(0, 0);
    ['keyup', 'mouseup', 'touchend', 'touchleave', 'focus', 'blur'].forEach((eventName) => {
      this.root.addEventListener(eventName, (e) => {
        // When range used to be a selection and user click within the selection,
        // the range now being a cursor has not updated yet without setTimeout
        setTimeout(this.update.bind(this, Emitter.sources.USER), 100);
        e.preventDefault();
      });
    });
    this.emitter.on(Emitter.events.TEXT_CHANGE, (delta) => {
      if (delta.length() > 0) {
        setTimeout(this.update.bind(this, Emitter.sources.SILENT), 1);
      }
    });
    this.emitter.on(Emitter.events.SCROLL_BEFORE_UPDATE, () => {
      let native = this.getNativeRange();
      if (native == null) return;
      // TODO unclear if this has negative side effects
      this.emitter.once(Emitter.events.SCROLL_UPDATE, () => {
        try {
          // Check crash condition in FF https://bugzilla.mozilla.org/show_bug.cgi?id=1270235
          if (native.start.node.parentNode == null || native.end.node.parentNode == null) return;
          this.setNativeRange(native.start.node, native.start.offset, native.end.node, native.end.offset);
        } catch (ignored) {}
      });
    });
    this.update(Emitter.sources.SILENT);
  }

  focus() {
    if (this.hasFocus()) return;
    this.root.focus();
    this.setRange(this.savedRange);
  }

  format(format, value) {
    this.scroll.update();
    let nativeRange = this.getNativeRange();
    if (nativeRange == null || !nativeRange.native.collapsed || Parchment.query(format, Parchment.Scope.BLOCK)) return;
    if (nativeRange.start.node !== this.cursor.textNode) {
      let blot = Parchment.find(nativeRange.start.node, false);
      if (blot == null) return;
      // TODO Give blot ability to not split
      if (blot instanceof Parchment.Leaf) {
        let after = blot.split(nativeRange.start.offset);
        blot.parent.insertBefore(this.cursor, after);
      } else {
        blot.insertBefore(this.cursor, nativeRange.start.node);  // Should never happen
      }
      this.cursor.attach();
    }
    this.cursor.format(format, value);
    this.scroll.optimize();
    this.setNativeRange(this.cursor.textNode, this.cursor.textNode.data.length);
    this.update();
  }

  getBounds(index, length = 0) {
    let bounds, node, [leaf, offset] = this.scroll.leaf(index);
    if (leaf == null) return null;
    [node, offset] = leaf.position(offset, true);
    let range = document.createRange();
    if (length > 0) {
      range.setStart(node, offset);
      [leaf, offset] = this.scroll.leaf(index + length);
      if (leaf == null) return null;
      [node, offset] = leaf.position(offset, true);
      range.setEnd(node, offset);
      bounds = range.getBoundingClientRect();
    } else {
      let side = 'left';
      if (node instanceof Text) {
        if (offset < node.data.length) {
          range.setStart(node, offset);
          range.setEnd(node, offset + 1);
        } else {
          range.setStart(node, offset - 1);
          range.setEnd(node, offset);
          side = 'right';
        }
        var rect = range.getBoundingClientRect();
      } else {
        if (leaf instanceof BreakBlot) {
          var rect = leaf.parent.domNode.getBoundingClientRect();
        } else {
          var rect = leaf.domNode.getBoundingClientRect();
        }
        if (offset > 0) side = 'right';
      }
      bounds = {
        height: rect.height,
        left: rect[side],
        width: 0,
        top: rect.top
      };
    }
    let containerBounds = this.root.parentNode.getBoundingClientRect();
    return {
      left: bounds.left - containerBounds.left,
      right: bounds.left + bounds.width - containerBounds.left,
      top: bounds.top - containerBounds.top,
      bottom: bounds.top + bounds.height - containerBounds.top,
      height: bounds.height,
      width: bounds.width
    };
  }

  getNativeRange() {
    let selection = document.getSelection();
    if (selection == null || selection.rangeCount <= 0) return null;
    let nativeRange = selection.getRangeAt(0);
    if (nativeRange == null) return null;
    if (!contains(this.root, nativeRange.startContainer) ||
        (!nativeRange.collapsed && !contains(this.root, nativeRange.endContainer))) {
      return null;
    }
    let range = {
      start: { node: nativeRange.startContainer, offset: nativeRange.startOffset },
      end: { node: nativeRange.endContainer, offset: nativeRange.endOffset },
      native: nativeRange
    };
    [range.start, range.end].forEach(function(position) {
      let node = position.node, offset = position.offset;
      while (!(node instanceof Text) && node.childNodes.length > 0) {
        if (node.childNodes.length > offset) {
          node = node.childNodes[offset];
          offset = 0;
        } else if (node.childNodes.length === offset) {
          node = node.lastChild;
          offset = node instanceof Text ? node.data.length : node.childNodes.length + 1;
        } else {
          break;
        }
      }
      position.node = node, position.offset = offset;
    });
    debug.info('getNativeRange', range);
    return range;
  }

  getRange() {
    if (!this.hasFocus()) return [null, null];
    let range = this.getNativeRange();
    if (range == null) return [null, null];
    let positions = [[range.start.node, range.start.offset]];
    if (!range.native.collapsed) {
      positions.push([range.end.node, range.end.offset]);
    }
    let indexes = positions.map((position) => {
      let [node, offset] = position;
      let blot = Parchment.find(node, true);
      let index = blot.offset(this.scroll);
      if (offset === 0) {
        return index;
      } else if (blot instanceof Parchment.Container) {
        return index + blot.length();
      } else {
        return index + blot.index(node, offset);
      }
    });
    let start = Math.min(...indexes), end = Math.max(...indexes);
    return [new Range(start, end-start), range];
  }

  hasFocus() {
    return document.activeElement === this.root;
  }

  scrollIntoView(range = this.lastRange) {
    if (range == null) return;
    let bounds = this.getBounds(range.index, range.length);
    if (this.root.offsetHeight < bounds.bottom) {
      let [line, offset] = this.scroll.line(range.index + range.length);
      this.root.scrollTop = line.domNode.offsetTop + line.domNode.offsetHeight;
    } else if (bounds.top < 0) {
      let [line, offset] = this.scroll.line(range.index);
      this.root.scrollTop = line.domNode.offsetTop;
    }
  }

  setNativeRange(startNode, startOffset, endNode = startNode, endOffset = startOffset) {
    debug.info('setNativeRange', startNode, startOffset, endNode, endOffset);
    let selection = document.getSelection();
    if (selection == null) return;
    if (startNode != null) {
      if (!this.hasFocus()) this.root.focus();
      let nativeRange = this.getNativeRange();
      if (nativeRange == null ||
          startNode !== nativeRange.start.node || startOffset !== nativeRange.start.offset ||
          endNode !== nativeRange.end.node || endOffset !== nativeRange.end.offset) {
        let range = document.createRange();
        range.setStart(startNode, startOffset);
        range.setEnd(endNode, endOffset);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } else {
      selection.removeAllRanges();
      this.root.blur();
      document.body.focus();  // root.blur() not enough on IE11+Travis+SauceLabs (but not local VMs)
    }
  }

  setRange(range, source = Emitter.sources.API) {
    debug.info('setRange', range);
    if (range != null) {
      let indexes = range.collapsed ? [range.index] : [range.index, range.index + range.length];
      let args = [];
      let scrollLength = this.scroll.length();
      indexes.forEach((index, i) => {
        index = Math.min(scrollLength - 1, index);
        let node, [leaf, offset] = this.scroll.leaf(index);
        [node, offset] = leaf.position(offset, i !== 0);
        args.push(node, offset);
      });
      this.setNativeRange(...args);
    } else {
      this.setNativeRange(null);
    }
    this.update(source);
  }

  update(source = Emitter.sources.USER) {
    let nativeRange, oldRange = this.lastRange;
    [this.lastRange, nativeRange] = this.getRange();
    if (this.lastRange != null) {
      this.savedRange = this.lastRange;
    }
    if (!equal(oldRange, this.lastRange)) {
      if (!this.composing && nativeRange != null && nativeRange.native.collapsed && nativeRange.start.node !== this.cursor.textNode) {
        this.cursor.restore();
      }
      if (source === Emitter.sources.SILENT) return;
      this.emitter.emit(Emitter.events.SELECTION_CHANGE, clone(this.lastRange), source);
    }
  }
}


function contains(parent, descendant) {
  try {
    // Firefox inserts inaccessible nodes around video elements
    descendant.parentNode;
  } catch (e) {
    return false;
  }
  // IE11 has bug with Text nodes
  // https://connect.microsoft.com/IE/feedback/details/780874/node-contains-is-incorrect
  if (descendant instanceof Text) {
    descendant = descendant.parentNode;
  }
  return parent.contains(descendant);
}


export { Range, Selection as default };
