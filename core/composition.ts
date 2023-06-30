import Embed from '../blots/embed';
import Scroll from '../blots/scroll';
import Emitter from './emitter';
import Module from './module';

class Composition extends Module {
  isComposing = false;

  private scroll: Scroll;
  private emitter: Emitter;

  constructor(quill, options) {
    super(quill, options);
    this.scroll = quill.scroll;
    this.emitter = quill.emitter;

    this.scroll.domNode.addEventListener('compositionstart', event => {
      if (!this.isComposing) {
        this.handleCompositionStart(event);
      }
    });

    this.scroll.domNode.addEventListener('compositionend', event => {
      if (this.isComposing) {
        this.handleCompositionEnd(event);
      }
    });
  }

  private handleCompositionStart(event: CompositionEvent) {
    const blot =
      event.target instanceof Node
        ? this.scroll.find(event.target, true)
        : null;

    if (blot && !(blot instanceof Embed)) {
      this.emitter.emit(Emitter.events.COMPOSITION_BEFORE_START, event);
      this.scroll.batchStart();
      this.emitter.emit(Emitter.events.COMPOSITION_START, event);
      this.isComposing = true;
    }
  }

  private handleCompositionEnd(event: CompositionEvent) {
    this.emitter.emit(Emitter.events.COMPOSITION_BEFORE_END, event);
    this.scroll.batchEnd();
    this.emitter.emit(Emitter.events.COMPOSITION_END, event);
    this.isComposing = false;
  }
}

export default Composition;
