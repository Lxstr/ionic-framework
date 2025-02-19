import { attachShadow, createEvent, h, Host, proxyCustomElement } from '@stencil/core/internal/client';
import { b as getIonMode } from './ionic-global.js';
import { r as raf, g as getElementRoot } from './helpers.js';
import { a as hapticSelectionStart, b as hapticSelectionChanged, h as hapticSelectionEnd } from './haptic.js';
import { c as createColorClasses } from './theme.js';

const pickerColumnInternalIosCss = ":host{padding-left:16px;padding-right:16px;padding-top:0px;padding-bottom:0px;height:200px;outline:none;font-size:22px;-webkit-scroll-snap-type:y mandatory;-ms-scroll-snap-type:y mandatory;scroll-snap-type:y mandatory;overflow-x:hidden;overflow-y:scroll;scrollbar-width:none;text-align:center}@supports ((-webkit-margin-start: 0) or (margin-inline-start: 0)) or (-webkit-margin-start: 0){:host{padding-left:unset;padding-right:unset;-webkit-padding-start:16px;padding-inline-start:16px;-webkit-padding-end:16px;padding-inline-end:16px}}:host::-webkit-scrollbar{display:none}:host .picker-item{height:34px;line-height:34px;text-overflow:ellipsis;white-space:nowrap;overflow:hidden;scroll-snap-align:center}:host .picker-item-empty{scroll-snap-align:none}:host(.picker-column-active) .picker-item.picker-item-active{color:var(--ion-color-base)}@media (any-hover: hover){:host(:focus){outline:none;background:rgba(var(--ion-color-base-rgb), 0.2)}}";

const pickerColumnInternalMdCss = ":host{padding-left:16px;padding-right:16px;padding-top:0px;padding-bottom:0px;height:200px;outline:none;font-size:22px;-webkit-scroll-snap-type:y mandatory;-ms-scroll-snap-type:y mandatory;scroll-snap-type:y mandatory;overflow-x:hidden;overflow-y:scroll;scrollbar-width:none;text-align:center}@supports ((-webkit-margin-start: 0) or (margin-inline-start: 0)) or (-webkit-margin-start: 0){:host{padding-left:unset;padding-right:unset;-webkit-padding-start:16px;padding-inline-start:16px;-webkit-padding-end:16px;padding-inline-end:16px}}:host::-webkit-scrollbar{display:none}:host .picker-item{height:34px;line-height:34px;text-overflow:ellipsis;white-space:nowrap;overflow:hidden;scroll-snap-align:center}:host .picker-item-empty{scroll-snap-align:none}:host(.picker-column-active) .picker-item.picker-item-active{color:var(--ion-color-base)}@media (any-hover: hover){:host(:focus){outline:none;background:rgba(var(--ion-color-base-rgb), 0.2)}}:host .picker-item-active{color:var(--ion-color-base)}";

const PickerColumnInternal = class extends HTMLElement {
  constructor() {
    super();
    this.__registerHost();
    attachShadow(this);
    this.ionChange = createEvent(this, "ionChange", 7);
    this.hapticsStarted = false;
    this.isColumnVisible = false;
    this.isActive = false;
    /**
     * A list of options to be displayed in the picker
     */
    this.items = [];
    /**
     * The color to use from your application's color palette.
     * Default options are: `"primary"`, `"secondary"`, `"tertiary"`, `"success"`, `"warning"`, `"danger"`, `"light"`, `"medium"`, and `"dark"`.
     * For more information on colors, see [theming](/docs/theming/basics).
     */
    this.color = 'primary';
    /**
     * If `true`, tapping the picker will
     * reveal a number input keyboard that lets
     * the user type in values for each picker
     * column. This is useful when working
     * with time pickers.
     *
     * @internal
     */
    this.numericInput = false;
    this.centerPickerItemInView = (target, smooth = true) => {
      this.el.scroll({
        // (Vertical offset from parent) - (three empty picker rows) + (half the height of the target to ensure the scroll triggers)
        top: target.offsetTop - (3 * target.clientHeight) + (target.clientHeight / 2),
        left: 0,
        behavior: smooth ? 'smooth' : undefined
      });
    };
    /**
     * When ionInputModeChange is emitted, each column
     * needs to check if it is the one being made available
     * for text entry.
     */
    this.inputModeChange = (ev) => {
      if (!this.numericInput) {
        return;
      }
      const { useInputMode, inputModeColumn } = ev.detail;
      /**
       * If inputModeColumn is undefined then this means
       * all numericInput columns are being selected.
       */
      const isColumnActive = inputModeColumn === undefined || inputModeColumn === this.el;
      if (!useInputMode || !isColumnActive) {
        this.isActive = false;
        return;
      }
      this.isActive = true;
    };
    /**
     * When the column scrolls, the component
     * needs to determine which item is centered
     * in the view and will emit an ionChange with
     * the item object.
     */
    this.initializeScrollListener = () => {
      const { el } = this;
      let timeout;
      let activeEl = this.activeItem;
      const scrollCallback = () => {
        raf(() => {
          if (timeout) {
            clearTimeout(timeout);
            timeout = undefined;
          }
          if (!this.hapticsStarted) {
            hapticSelectionStart();
            this.hapticsStarted = true;
          }
          /**
           * Select item in the center of the column
           * which is the month/year that we want to select
           */
          const bbox = el.getBoundingClientRect();
          const centerX = bbox.x + (bbox.width / 2);
          const centerY = bbox.y + (bbox.height / 2);
          const activeElement = el.shadowRoot.elementFromPoint(centerX, centerY);
          if (activeEl !== null) {
            activeEl.classList.remove(PICKER_COL_ACTIVE);
          }
          /**
           * If we are selecting a new value,
           * we need to run haptics again.
           */
          if (activeElement !== activeEl) {
            hapticSelectionChanged();
          }
          activeEl = activeElement;
          activeElement.classList.add(PICKER_COL_ACTIVE);
          timeout = setTimeout(() => {
            const dataIndex = activeElement.getAttribute('data-index');
            /**
             * If no value it is
             * possible we hit one of the
             * empty padding columns.
             */
            if (dataIndex === null) {
              return;
            }
            const index = parseInt(dataIndex, 10);
            const selectedItem = this.items[index];
            if (selectedItem.value !== this.value) {
              this.value = selectedItem.value;
              hapticSelectionEnd();
              this.hapticsStarted = false;
            }
          }, 250);
        });
      };
      /**
       * Wrap this in an raf so that the scroll callback
       * does not fire when component is initially shown.
       */
      raf(() => {
        el.addEventListener('scroll', scrollCallback);
        this.destroyScrollListener = () => {
          el.removeEventListener('scroll', scrollCallback);
        };
      });
    };
  }
  valueChange() {
    if (this.isColumnVisible) {
      /**
       * Only scroll the active item into view and emit the value
       * change, when the picker column is actively visible to the user.
       */
      const { items, value } = this;
      this.scrollActiveItemIntoView();
      const findItem = items.find(item => item.value === value);
      if (findItem) {
        this.ionChange.emit(findItem);
      }
    }
  }
  /**
   * Only setup scroll listeners
   * when the picker is visible, otherwise
   * the container will have a scroll
   * height of 0px.
   */
  componentWillLoad() {
    const visibleCallback = (entries) => {
      var _a;
      const ev = entries[0];
      if (ev.isIntersecting) {
        /**
         * Because this initial call to scrollActiveItemIntoView has to fire before
         * the scroll listener is set up, we need to manage the active class manually.
         */
        const oldActive = getElementRoot(this.el).querySelector(`.${PICKER_COL_ACTIVE}`);
        oldActive === null || oldActive === void 0 ? void 0 : oldActive.classList.remove(PICKER_COL_ACTIVE);
        this.scrollActiveItemIntoView();
        (_a = this.activeItem) === null || _a === void 0 ? void 0 : _a.classList.add(PICKER_COL_ACTIVE);
        this.initializeScrollListener();
        this.isColumnVisible = true;
      }
      else {
        if (this.destroyScrollListener) {
          this.destroyScrollListener();
          this.destroyScrollListener = undefined;
        }
        this.isColumnVisible = false;
      }
    };
    new IntersectionObserver(visibleCallback, { threshold: 0.01 }).observe(this.el);
    const parentEl = this.el.closest('ion-picker-internal');
    if (parentEl !== null) {
      parentEl.addEventListener('ionInputModeChange', (ev) => this.inputModeChange(ev));
    }
  }
  scrollActiveItemIntoView() {
    const activeEl = this.activeItem;
    if (activeEl) {
      this.centerPickerItemInView(activeEl, false);
    }
  }
  get activeItem() {
    return getElementRoot(this.el).querySelector(`.picker-item[data-value="${this.value}"]`);
  }
  render() {
    const { items, color, isActive, numericInput } = this;
    const mode = getIonMode(this);
    return (h(Host, { tabindex: 0, class: createColorClasses(color, {
        [mode]: true,
        ['picker-column-active']: isActive,
        ['picker-column-numeric-input']: numericInput
      }) }, h("div", { class: "picker-item picker-item-empty" }, "\u00A0"), h("div", { class: "picker-item picker-item-empty" }, "\u00A0"), h("div", { class: "picker-item picker-item-empty" }, "\u00A0"), items.map((item, index) => {
      return (h("div", { class: "picker-item", "data-value": item.value, "data-index": index, onClick: (ev) => {
          this.centerPickerItemInView(ev.target);
        } }, item.text));
    }), h("div", { class: "picker-item picker-item-empty" }, "\u00A0"), h("div", { class: "picker-item picker-item-empty" }, "\u00A0"), h("div", { class: "picker-item picker-item-empty" }, "\u00A0")));
  }
  get el() { return this; }
  static get watchers() { return {
    "value": ["valueChange"]
  }; }
  static get style() { return {
    ios: pickerColumnInternalIosCss,
    md: pickerColumnInternalMdCss
  }; }
};
const PICKER_COL_ACTIVE = 'picker-item-active';

const IonPickerColumnInternal = /*@__PURE__*/proxyCustomElement(PickerColumnInternal, [33,"ion-picker-column-internal",{"items":[16],"value":[1032],"color":[513],"numericInput":[4,"numeric-input"],"isActive":[32]}]);

export { IonPickerColumnInternal };
