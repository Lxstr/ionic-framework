import { attachShadow, h, Host, proxyCustomElement } from '@stencil/core/internal/client';
import { c as config, b as getIonMode } from './ionic-global.js';
import { r as raf, t as transitionEndAsync, a as addEventListener, b as removeEventListener, g as getElementRoot } from './helpers.js';

const accordionIosCss = ":host{display:block;position:relative;width:100%;background-color:var(--ion-background-color, #ffffff);overflow:hidden;z-index:0}:host(.accordion-expanding) ::slotted(ion-item[slot=header]),:host(.accordion-expanded) ::slotted(ion-item[slot=header]){--border-width:0px}:host(.accordion-animated){-webkit-transition:all 300ms cubic-bezier(0.25, 0.8, 0.5, 1);transition:all 300ms cubic-bezier(0.25, 0.8, 0.5, 1)}:host(.accordion-animated) #content{-webkit-transition:max-height 300ms cubic-bezier(0.25, 0.8, 0.5, 1);transition:max-height 300ms cubic-bezier(0.25, 0.8, 0.5, 1)}#content{overflow:hidden;will-change:max-height}:host(.accordion-collapsing) #content{max-height:0 !important}:host(.accordion-collapsed) #content{display:none}:host(.accordion-expanding) #content{max-height:0}:host(.accordion-disabled) #header,:host(.accordion-readonly) #header,:host(.accordion-disabled) #content,:host(.accordion-readonly) #content{pointer-events:none}:host(.accordion-disabled) #header,:host(.accordion-disabled) #content{opacity:0.4}@media (prefers-reduced-motion: reduce){:host,#content{-webkit-transition:none !important;transition:none !important}}:host(.accordion-next) ::slotted(ion-item[slot=header]){--border-width:0.55px 0px 0.55px 0px}";

const accordionMdCss = ":host{display:block;position:relative;width:100%;background-color:var(--ion-background-color, #ffffff);overflow:hidden;z-index:0}:host(.accordion-expanding) ::slotted(ion-item[slot=header]),:host(.accordion-expanded) ::slotted(ion-item[slot=header]){--border-width:0px}:host(.accordion-animated){-webkit-transition:all 300ms cubic-bezier(0.25, 0.8, 0.5, 1);transition:all 300ms cubic-bezier(0.25, 0.8, 0.5, 1)}:host(.accordion-animated) #content{-webkit-transition:max-height 300ms cubic-bezier(0.25, 0.8, 0.5, 1);transition:max-height 300ms cubic-bezier(0.25, 0.8, 0.5, 1)}#content{overflow:hidden;will-change:max-height}:host(.accordion-collapsing) #content{max-height:0 !important}:host(.accordion-collapsed) #content{display:none}:host(.accordion-expanding) #content{max-height:0}:host(.accordion-disabled) #header,:host(.accordion-readonly) #header,:host(.accordion-disabled) #content,:host(.accordion-readonly) #content{pointer-events:none}:host(.accordion-disabled) #header,:host(.accordion-disabled) #content{opacity:0.4}@media (prefers-reduced-motion: reduce){:host,#content{-webkit-transition:none !important;transition:none !important}}";

const Accordion = class extends HTMLElement {
  constructor() {
    super();
    this.__registerHost();
    attachShadow(this);
    this.updateListener = () => this.updateState(false);
    this.state = 1 /* Collapsed */;
    this.isNext = false;
    this.isPrevious = false;
    /**
     * The value of the accordion. Defaults to an autogenerated
     * value.
     */
    this.value = `ion-accordion-${accordionIds++}`;
    /**
     * If `true`, the accordion cannot be interacted with.
     */
    this.disabled = false;
    /**
     * If `true`, the accordion cannot be interacted with,
     * but does not alter the opacity.
     */
    this.readonly = false;
    /**
     * The toggle icon to use. This icon will be
     * rotated when the accordion is expanded
     * or collapsed.
     */
    this.toggleIcon = 'chevron-down';
    /**
     * The slot inside of `ion-item` to
     * place the toggle icon. Defaults to `'end'`.
     */
    this.toggleIconSlot = 'end';
    this.setItemDefaults = () => {
      const ionItem = this.getSlottedHeaderIonItem();
      if (!ionItem) {
        return;
      }
      /**
       * For a11y purposes, we make
       * the ion-item a button so users
       * can tab to it and use keyboard
       * navigation to get around.
       */
      ionItem.button = true;
      ionItem.detail = false;
      /**
       * By default, the lines in an
       * item should be full here, but
       * only do that if a user has
       * not explicitly overridden them
       */
      if (ionItem.lines === undefined) {
        ionItem.lines = 'full';
      }
    };
    this.getSlottedHeaderIonItem = () => {
      const { headerEl } = this;
      if (!headerEl) {
        return;
      }
      /**
       * Get the first ion-item
       * slotted in the header slot
       */
      const slot = headerEl.querySelector('slot');
      if (!slot) {
        return;
      }
      // This is not defined in unit tests
      const ionItem = slot.assignedElements && slot.assignedElements().find(el => el.tagName === 'ION-ITEM');
      return ionItem;
    };
    this.setAria = (expanded = false) => {
      const ionItem = this.getSlottedHeaderIonItem();
      if (!ionItem) {
        return;
      }
      /**
       * Get the native <button> element inside of
       * ion-item because that is what will be focused
       */
      const root = getElementRoot(ionItem);
      const button = root.querySelector('button');
      if (!button) {
        return;
      }
      button.setAttribute('aria-expanded', `${expanded}`);
    };
    this.slotToggleIcon = () => {
      const ionItem = this.getSlottedHeaderIonItem();
      if (!ionItem) {
        return;
      }
      const { toggleIconSlot, toggleIcon } = this;
      /**
       * Check if there already is a toggle icon.
       * If so, do not add another one.
       */
      const existingToggleIcon = ionItem.querySelector('.ion-accordion-toggle-icon');
      if (existingToggleIcon) {
        return;
      }
      const iconEl = document.createElement('ion-icon');
      iconEl.slot = toggleIconSlot;
      iconEl.lazy = false;
      iconEl.classList.add('ion-accordion-toggle-icon');
      iconEl.icon = toggleIcon;
      iconEl.setAttribute('aria-hidden', 'true');
      ionItem.appendChild(iconEl);
    };
    this.expandAccordion = (initialUpdate = false) => {
      if (initialUpdate) {
        this.state = 4 /* Expanded */;
        return;
      }
      if (this.state === 4 /* Expanded */) {
        return;
      }
      const { contentEl, contentElWrapper } = this;
      if (contentEl === undefined || contentElWrapper === undefined) {
        return;
      }
      if (this.currentRaf !== undefined) {
        cancelAnimationFrame(this.currentRaf);
      }
      if (this.shouldAnimate()) {
        raf(() => {
          this.state = 8 /* Expanding */;
          this.currentRaf = raf(async () => {
            const contentHeight = contentElWrapper.offsetHeight;
            const waitForTransition = transitionEndAsync(contentEl, 2000);
            contentEl.style.setProperty('max-height', `${contentHeight}px`);
            await waitForTransition;
            this.state = 4 /* Expanded */;
            contentEl.style.removeProperty('max-height');
          });
        });
      }
      else {
        this.state = 4 /* Expanded */;
      }
    };
    this.collapseAccordion = (initialUpdate = false) => {
      if (initialUpdate) {
        this.state = 1 /* Collapsed */;
        return;
      }
      if (this.state === 1 /* Collapsed */) {
        return;
      }
      const { contentEl } = this;
      if (contentEl === undefined) {
        return;
      }
      if (this.currentRaf !== undefined) {
        cancelAnimationFrame(this.currentRaf);
      }
      if (this.shouldAnimate()) {
        this.currentRaf = raf(async () => {
          const contentHeight = contentEl.offsetHeight;
          contentEl.style.setProperty('max-height', `${contentHeight}px`);
          raf(async () => {
            const waitForTransition = transitionEndAsync(contentEl, 2000);
            this.state = 2 /* Collapsing */;
            await waitForTransition;
            this.state = 1 /* Collapsed */;
            contentEl.style.removeProperty('max-height');
          });
        });
      }
      else {
        this.state = 1 /* Collapsed */;
      }
    };
    /**
     * Helper function to determine if
     * something should animate.
     * If prefers-reduced-motion is set
     * then we should not animate, regardless
     * of what is set in the config.
     */
    this.shouldAnimate = () => {
      if (typeof window === 'undefined') {
        return false;
      }
      const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) {
        return false;
      }
      const animated = config.get('animated', true);
      if (!animated) {
        return false;
      }
      if (this.accordionGroupEl && !this.accordionGroupEl.animated) {
        return false;
      }
      return true;
    };
    this.updateState = async (initialUpdate = false) => {
      const accordionGroup = this.accordionGroupEl;
      const accordionValue = this.value;
      if (!accordionGroup) {
        return;
      }
      const value = accordionGroup.value;
      const shouldExpand = (Array.isArray(value)) ? value.includes(accordionValue) : value === accordionValue;
      if (shouldExpand) {
        this.expandAccordion(initialUpdate);
        this.isNext = this.isPrevious = false;
      }
      else {
        this.collapseAccordion(initialUpdate);
        /**
         * When using popout or inset,
         * the collapsed accordion items
         * may need additional border radius
         * applied. Check to see if the
         * next or previous accordion is selected.
         */
        const nextAccordion = this.getNextSibling();
        const nextAccordionValue = nextAccordion && nextAccordion.value;
        if (nextAccordionValue !== undefined) {
          this.isPrevious = (Array.isArray(value)) ? value.includes(nextAccordionValue) : value === nextAccordionValue;
        }
        const previousAccordion = this.getPreviousSibling();
        const previousAccordionValue = previousAccordion && previousAccordion.value;
        if (previousAccordionValue !== undefined) {
          this.isNext = (Array.isArray(value)) ? value.includes(previousAccordionValue) : value === previousAccordionValue;
        }
      }
    };
    this.getNextSibling = () => {
      if (!this.el) {
        return;
      }
      const nextSibling = this.el.nextElementSibling;
      if ((nextSibling === null || nextSibling === void 0 ? void 0 : nextSibling.tagName) !== 'ION-ACCORDION') {
        return;
      }
      return nextSibling;
    };
    this.getPreviousSibling = () => {
      if (!this.el) {
        return;
      }
      const previousSibling = this.el.previousElementSibling;
      if ((previousSibling === null || previousSibling === void 0 ? void 0 : previousSibling.tagName) !== 'ION-ACCORDION') {
        return;
      }
      return previousSibling;
    };
  }
  connectedCallback() {
    const accordionGroupEl = this.accordionGroupEl = this.el && this.el.closest('ion-accordion-group');
    if (accordionGroupEl) {
      this.updateState(true);
      addEventListener(accordionGroupEl, 'ionChange', this.updateListener);
    }
  }
  disconnectedCallback() {
    const accordionGroupEl = this.accordionGroupEl;
    if (accordionGroupEl) {
      removeEventListener(accordionGroupEl, 'ionChange', this.updateListener);
    }
  }
  componentDidLoad() {
    this.setItemDefaults();
    this.slotToggleIcon();
    /**
     * We need to wait a tick because we
     * just set ionItem.button = true and
     * the button has not have been rendered yet.
     */
    raf(() => {
      /**
       * Set aria label on button inside of ion-item
       * once the inner content has been rendered.
       */
      const expanded = this.state === 4 /* Expanded */ || this.state === 8 /* Expanding */;
      this.setAria(expanded);
    });
  }
  toggleExpanded() {
    const { accordionGroupEl, value, state } = this;
    if (accordionGroupEl) {
      /**
       * Because the accordion group may or may
       * not allow multiple accordions open, we
       * need to request the toggling of this
       * accordion and the accordion group will
       * make the decision on whether or not
       * to allow it.
       */
      const expand = state === 1 /* Collapsed */ || state === 2 /* Collapsing */;
      accordionGroupEl.requestAccordionToggle(value, expand);
    }
  }
  render() {
    const { disabled, readonly } = this;
    const mode = getIonMode(this);
    const expanded = this.state === 4 /* Expanded */ || this.state === 8 /* Expanding */;
    const headerPart = expanded ? 'header expanded' : 'header';
    const contentPart = expanded ? 'content expanded' : 'content';
    this.setAria(expanded);
    return (h(Host, { class: {
        [mode]: true,
        'accordion-expanding': this.state === 8 /* Expanding */,
        'accordion-expanded': this.state === 4 /* Expanded */,
        'accordion-collapsing': this.state === 2 /* Collapsing */,
        'accordion-collapsed': this.state === 1 /* Collapsed */,
        'accordion-next': this.isNext,
        'accordion-previous': this.isPrevious,
        'accordion-disabled': disabled,
        'accordion-readonly': readonly,
        'accordion-animated': config.getBoolean('animated', true)
      } }, h("div", { onClick: () => this.toggleExpanded(), id: "header", part: headerPart, "aria-controls": "content", ref: headerEl => this.headerEl = headerEl }, h("slot", { name: "header" })), h("div", { id: "content", part: contentPart, role: "region", "aria-labelledby": "header", ref: contentEl => this.contentEl = contentEl }, h("div", { id: "content-wrapper", ref: contentElWrapper => this.contentElWrapper = contentElWrapper }, h("slot", { name: "content" })))));
  }
  static get delegatesFocus() { return true; }
  get el() { return this; }
  static get style() { return {
    ios: accordionIosCss,
    md: accordionMdCss
  }; }
};
let accordionIds = 0;

const IonAccordion = /*@__PURE__*/proxyCustomElement(Accordion, [49,"ion-accordion",{"value":[1],"disabled":[4],"readonly":[4],"toggleIcon":[1,"toggle-icon"],"toggleIconSlot":[1,"toggle-icon-slot"],"state":[32],"isNext":[32],"isPrevious":[32]}]);

export { IonAccordion };