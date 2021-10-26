import Quill from '../core/quill';
import Picker from './picker';


class IconPicker extends Picker {
  constructor(select, icons) {
    super(select);
    this.container.classList.add('ql-icon-picker');
    [].forEach.call(this.container.querySelectorAll('.ql-picker-item'), (item) => {
      item.innerHTML = icons[item.getAttribute('data-value') || ''];
    });
    this.defaultItem = this.container.querySelector('.ql-selected');
    this.selectItem(this.defaultItem);
  }

  selectItem(item, trigger) {
    super.selectItem(item, trigger);
    item = item || this.defaultItem;
    // Security: Blessed HTML is already part of the DOM.
    this.label.innerHTML = Quill.import('core/security').blessHTML(item.innerHTML);
  }
}


export default IconPicker;
