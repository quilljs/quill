import Emitter from '../../../core/emitter';
import Selection, { Range } from '../../../core/selection';
import Cursor from '../../../blots/cursor';
import Scroll from '../../../blots/scroll';

describe('Scroll', function() {
  it('initialize empty document', function() {
    const scroll = this.initialize(Scroll, '');
    expect(scroll.domNode).toEqualHTML('<p><br></p>');
  });

  it('api change', function() {
    const scroll = this.initialize(Scroll, '<p>Hello World!</p>');
    spyOn(scroll.emitter, 'emit').and.callThrough();
    scroll.insertAt(5, '!');
    expect(scroll.emitter.emit).toHaveBeenCalledWith(
      Emitter.events.SCROLL_OPTIMIZE,
      jasmine.any(Array),
      jasmine.any(Object),
    );
  });

  it('user change', function(done) {
    const scroll = this.initialize(Scroll, '<p>Hello World!</p>');
    spyOn(scroll.emitter, 'emit').and.callThrough();
    scroll.domNode.firstChild.appendChild(document.createTextNode('!'));
    setTimeout(function() {
      expect(scroll.emitter.emit).toHaveBeenCalledWith(
        Emitter.events.SCROLL_OPTIMIZE,
        jasmine.any(Array),
        jasmine.any(Object),
      );
      expect(scroll.emitter.emit).toHaveBeenCalledWith(
        Emitter.events.SCROLL_UPDATE,
        Emitter.sources.USER,
        jasmine.any(Array),
      );
      done();
    }, 1);
  });

  it("don't emit if in read-only", function(done) {
    const scroll = this.initialize(Scroll, '<p>Hello World!</p>');
    scroll.enable(false);
    spyOn(scroll.emitter, 'emit').and.callThrough();
    scroll.domNode.firstChild.appendChild(document.createTextNode('!'));
    setTimeout(function() {
      expect(scroll.emitter.emit).not.toHaveBeenCalled();
      done();
    }, 1);
  });

  it('prevent dragstart', function() {
    const scroll = this.initialize(Scroll, '<p>Hello World!</p>');
    const dragstart = new Event('dragstart');
    spyOn(dragstart, 'preventDefault');
    scroll.domNode.dispatchEvent(dragstart);
    expect(dragstart.preventDefault).toHaveBeenCalled();
  });

  describe('leaf()', function() {
    it('text', function() {
      const scroll = this.initialize(Scroll, '<p>Tests</p>');
      const [leaf, offset] = scroll.leaf(2);
      expect(leaf.value()).toEqual('Tests');
      expect(offset).toEqual(2);
    });

    it('precise', function() {
      const scroll = this.initialize(
        Scroll,
        '<p><u>0</u><s>1</s><u>2</u><s>3</s><u>4</u></p>',
      );
      const [leaf, offset] = scroll.leaf(3);
      expect(leaf.value()).toEqual('2');
      expect(offset).toEqual(1);
    });

    it('newline', function() {
      const scroll = this.initialize(Scroll, '<p>0123</p><p>5678</p>');
      const [leaf, offset] = scroll.leaf(4);
      expect(leaf.value()).toEqual('0123');
      expect(offset).toEqual(4);
    });

    it('cursor', function() {
      const selection = this.initialize(Selection, '<p><u>0</u>1<u>2</u></p>');
      selection.setRange(new Range(2));
      selection.format('strike', true);
      const [leaf, offset] = selection.scroll.leaf(2);
      expect(leaf instanceof Cursor).toBe(true);
      expect(offset).toEqual(0);
    });

    it('beyond document', function() {
      const scroll = this.initialize(Scroll, '<p>Test</p>');
      const [leaf, offset] = scroll.leaf(10);
      expect(leaf).toEqual(null);
      expect(offset).toEqual(-1);
    });
  });
});
