import Delta from 'quill-delta';
import Quill from '../core/quill';
import Emitter from '../core/emitter';
import Module from '../core/module';
import { Range } from '../modules/selection';

interface UploaderOptions {
  mimetypes: string[];
  handler: (this: { quill: Quill }, range: Range, files: File[]) => void;
}

class Uploader extends Module<UploaderOptions> {
  constructor(quill: Quill, options: Partial<UploaderOptions>) {
    super(quill, options);
    quill.root.addEventListener('drop', e => {
      e.preventDefault();
      let native: ReturnType<typeof document.createRange>;
      if (document.caretRangeFromPoint) {
        native = document.caretRangeFromPoint(e.clientX, e.clientY);
        // @ts-expect-error
      } else if (document.caretPositionFromPoint) {
        // @ts-expect-error
        const position = document.caretPositionFromPoint(e.clientX, e.clientY);
        native = document.createRange();
        native.setStart(position.offsetNode, position.offset);
        native.setEnd(position.offsetNode, position.offset);
      } else {
        return;
      }
      const normalized = quill.selection.normalizeNative(native);
      const range = quill.selection.normalizedToRange(normalized);
      this.upload(range, e.dataTransfer.files);
    });
  }

  upload(range: Range, files: FileList | File[]) {
    const uploads = [];
    Array.from(files).forEach(file => {
      if (file && this.options.mimetypes.includes(file.type)) {
        uploads.push(file);
      }
    });
    if (uploads.length > 0) {
      this.options.handler.call(this, range, uploads);
    }
  }
}

Uploader.DEFAULTS = {
  mimetypes: ['image/png', 'image/jpeg'],
  handler(range: Range, files: File[]) {
    const promises = files.map(file => {
      return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = e => {
          resolve(e.target.result);
        };
        reader.readAsDataURL(file);
      });
    });
    Promise.all(promises).then(images => {
      const update = images.reduce((delta: Delta, image) => {
        return delta.insert({ image });
      }, new Delta().retain(range.index).delete(range.length));
      this.quill.updateContents(update, Emitter.sources.USER);
      this.quill.setSelection(
        range.index + images.length,
        Emitter.sources.SILENT,
      );
    });
  },
};

export default Uploader;
