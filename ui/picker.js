import Quill from '../core/quill';
import Keyboard from '../modules/keyboard';
import DropdownIcon from '../assets/icons/dropdown.svg';

let optionsCounter = 0;

function toggleAriaAttribute(element, attribute) {
  element.setAttribute(attribute, !(element.getAttribute(attribute) === 'true'));
}

class Picker {
  constructor(select) {
    this.select = select;
    this.container = document.createElement('span');
    this.buildPicker();
    this.select.style.display = 'none';
    this.select.parentNode.insertBefore(this.container, this.select);

    this.label.addEventListener('mousedown', () => {
      this.togglePicker();
    });
    this.label.addEventListener('keydown', (event) => {
      switch(event.keyCode) {
        // Allows the "Enter" key to open the picker
        case Keyboard.keys.ENTER:
          this.togglePicker();
          break;

        // Allows the "Escape" key to close the picker
        case Keyboard.keys.ESCAPE:
          this.escape();
          event.preventDefault();
          break;
        default:
      }
    });
    this.select.addEventListener('change', this.update.bind(this));
  }

  togglePicker() {
    this.container.classList.toggle('ql-expanded');
    // Toggle aria-expanded and aria-hidden to make the picker accessible
    toggleAriaAttribute(this.label, 'aria-expanded');
    toggleAriaAttribute(this.options, 'aria-hidden');
  }

  buildItem(option) {
    let item = document.createElement('span');
    item.tabIndex = '0';
    item.setAttribute('role', 'button');

    item.classList.add('ql-picker-item');
    if (option.hasAttribute('value')) {
      item.setAttribute('data-value', option.getAttribute('value'));
    }
    if (option.textContent) {
      item.setAttribute('data-label', option.textContent);
    }
    item.addEventListener('click', () => {
      this.selectItem(item, true);
    });
    item.addEventListener('keydown', (event) => {
      switch(event.keyCode) {
        // Allows the "Enter" key to select an item
        case Keyboard.keys.ENTER:
          this.selectItem(item, true);
          event.preventDefault();
          break;

        // Allows the "Escape" key to close the picker
        case Keyboard.keys.ESCAPE:
          this.escape();
          event.preventDefault();
          break;
        default:
      }
    });

    return item;
  }

  buildLabel() {
    let label = document.createElement('span');
    label.classList.add('ql-picker-label');
    // Security: Blessed HTML is imported from a trusted file.
    label.innerHTML = Quill.import('core/security').blessHTML(DropdownIcon);
    label.tabIndex = '0';
    label.setAttribute('role', 'button');
    label.setAttribute('aria-expanded', 'false');
    this.container.appendChild(label);
    return label;
  }

  buildOptions() {
    let options = document.createElement('span');
    options.classList.add('ql-picker-options');

    // Don't want screen readers to read this until options are visible
    options.setAttribute('aria-hidden', 'true');
    options.tabIndex = '-1';

    // Need a unique id for aria-controls
    options.id = `ql-picker-options-${optionsCounter}`;
    optionsCounter += 1;
    this.label.setAttribute('aria-controls', options.id);

    this.options = options;

    [].slice.call(this.select.options).forEach((option) => {
      let item = this.buildItem(option);
      options.appendChild(item);
      if (option.selected === true) {
        this.selectItem(item);
      }
    });
    this.container.appendChild(options);
  }

  buildPicker() {
    [].slice.call(this.select.attributes).forEach((item) => {
      this.container.setAttribute(item.name, item.value);
    });
    this.container.classList.add('ql-picker');
    this.label = this.buildLabel();
    this.buildOptions();
  }

  escape() {
    // Close menu and return focus to trigger label
    this.close();
    // Need setTimeout for accessibility to ensure that the browser executes
    // focus on the next process thread and after any DOM content changes
    setTimeout(() => this.label.focus(), 1);
  }

  close() {
    this.container.classList.remove('ql-expanded');
    this.label.setAttribute('aria-expanded', 'false');
    this.options.setAttribute('aria-hidden', 'true');
  }

  selectItem(item, trigger = false) {
    let selected = this.container.querySelector('.ql-selected');
    if (item === selected) return;
    if (selected != null) {
      selected.classList.remove('ql-selected');
    }
    if (item == null) return;
    item.classList.add('ql-selected');
    this.select.selectedIndex = [].indexOf.call(item.parentNode.children, item);
    if (item.hasAttribute('data-value')) {
      this.label.setAttribute('data-value', item.getAttribute('data-value'));
    } else {
      this.label.removeAttribute('data-value');
    }
    if (item.hasAttribute('data-label')) {
      this.label.setAttribute('data-label', item.getAttribute('data-label'));
    } else {
      this.label.removeAttribute('data-label');
    }
    if (trigger) {
      if (typeof Event === 'function') {
        this.select.dispatchEvent(new Event('change'));
      } else if (typeof Event === 'object') {     // IE11
        let event = document.createEvent('Event');
        event.initEvent('change', true, true);
        this.select.dispatchEvent(event);
      }
      this.close();
    }
  }

  update() {
    let option;
    if (this.select.selectedIndex > -1) {
      let item = this.container.querySelector('.ql-picker-options').children[this.select.selectedIndex];
      option = this.select.options[this.select.selectedIndex];
      this.selectItem(item);
    } else {
      this.selectItem(null);
    }
    let isActive = option != null && option !== this.select.querySelector('option[selected]');
    this.label.classList.toggle('ql-active', isActive);
  }
}


export default Picker;
