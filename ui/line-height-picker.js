import Picker from './picker';

class LineHeightPicker extends Picker {
  constructor(select, label) {
    super(select);
    this.label.innerHTML = label;
  }
}

export default LineHeightPicker;
