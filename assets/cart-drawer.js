class CartDrawer extends HTMLElement {
  constructor() {
    super();

    this.addEventListener('keyup', (evt) => evt.code === 'Escape' && this.close());
    this.querySelector('#CartDrawer-Overlay').addEventListener('click', this.close.bind(this));
    this.setHeaderCartIconAccessibility();

    // THE AURA PREMIUM: Auto-open Drawer if redirected from /cart
    if (window.location.search.includes('cart_drawer=open')) {
      this.open();
      // Clean up the URL state
      const newUrl = window.location.pathname + window.location.search.replace(/[?&]cart_drawer=open/, '').replace(/^&/, '?').replace(/\?$/, '');
      window.history.replaceState({}, '', newUrl);
    }
  }

  setHeaderCartIconAccessibility() {
    const cartIconSelector = '#cart-icon-bubble, .header__icon--cart, [href="/cart"]';
    
    // Delegate click and keydown to document body to catch icons even if header re-renders
    document.body.addEventListener('click', (event) => {
      const cartLink = event.target.closest(cartIconSelector);
      if (!cartLink) return;
      
      // Don't intercept if it's meant to be a normal link (unlikely but safe)
      if (cartLink.classList.contains('no-drawer')) return;

      event.preventDefault();
      this.open(cartLink);
    });

    document.body.addEventListener('keydown', (event) => {
      const cartLink = event.target.closest(cartIconSelector);
      if (!cartLink || event.code.toUpperCase() !== 'SPACE') return;

      event.preventDefault();
      this.open(cartLink);
    });
  }

  open(triggeredBy) {
    if (triggeredBy) this.setActiveElement(triggeredBy);
    const cartDrawerNote = this.querySelector('[id^="Details-"] summary');
    if (cartDrawerNote && !cartDrawerNote.hasAttribute('role')) this.setSummaryAccessibility(cartDrawerNote);
    
    // THE AURA PREMIUM: Announcement Bar Offset Logic (Consistent with Wishlist/Compare)
    const announcementBar = document.querySelector('.shopify-section-announcement-bar, .announcement-bar, [class*="announcement"], #shopify-section-announcement-bar');
    const drawerInner = this.querySelector('.drawer__inner');
    if (drawerInner) {
        let topOffset = 0;
        if (announcementBar) {
            topOffset = announcementBar.offsetHeight;
        }
        drawerInner.style.top = `${topOffset}px`;
        drawerInner.style.height = `calc(100vh - ${topOffset}px)`;
    }

    // here the animation doesn't seem to always get triggered. A timeout seem to help
    setTimeout(() => {
      this.classList.add('animate', 'active');
    });

    this.addEventListener(
      'transitionend',
      () => {
        const containerToTrapFocusOn = this.classList.contains('is-empty')
          ? this.querySelector('.drawer__inner-empty')
          : document.getElementById('CartDrawer');
        const focusElement = this.querySelector('.drawer__inner') || this.querySelector('.drawer__close');
        trapFocus(containerToTrapFocusOn, focusElement);
      },
      { once: true }
    );

    document.body.classList.add('overflow-hidden');
  }

  close() {
    this.classList.remove('active');
    removeTrapFocus(this.activeElement);
    document.body.classList.remove('overflow-hidden');
  }

  setSummaryAccessibility(cartDrawerNote) {
    cartDrawerNote.setAttribute('role', 'button');
    cartDrawerNote.setAttribute('aria-expanded', 'false');

    if (cartDrawerNote.nextElementSibling.getAttribute('id')) {
      cartDrawerNote.setAttribute('aria-controls', cartDrawerNote.nextElementSibling.id);
    }

    cartDrawerNote.addEventListener('click', (event) => {
      event.currentTarget.setAttribute('aria-expanded', !event.currentTarget.closest('details').hasAttribute('open'));
    });

    cartDrawerNote.parentElement.addEventListener('keyup', onKeyUpEscape);
  }

  renderContents(parsedState) {
    this.classList.remove('is-empty');
    if (this.querySelector('cart-drawer-items')) {
      this.querySelector('cart-drawer-items').classList.remove('is-empty');
    }
    this.productId = parsedState.id;
    this.getSectionsToRender().forEach((section) => {
      const sectionElement = section.selector
        ? document.querySelector(section.selector)
        : document.getElementById(section.id);

      if (!sectionElement) return;
      sectionElement.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.id], section.selector);
    });

    setTimeout(() => {
      this.querySelector('#CartDrawer-Overlay').addEventListener('click', this.close.bind(this));
      this.open();
    });
  }

  getSectionInnerHTML(html, selector = '.shopify-section') {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector).innerHTML;
  }

  getSectionsToRender() {
    return [
      {
        id: 'cart-drawer',
        selector: '#CartDrawer',
      },
      {
        id: 'cart-icon-bubble',
      },
    ];
  }

  getSectionDOM(html, selector = '.shopify-section') {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector);
  }

  setActiveElement(element) {
    this.activeElement = element;
  }
}

customElements.define('cart-drawer', CartDrawer);

class CartDrawerItems extends CartItems {
  getSectionsToRender() {
    return [
      {
        id: 'CartDrawer',
        section: 'cart-drawer',
        selector: '.drawer__inner',
      },
      {
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
        selector: '.shopify-section',
      },
    ];
  }
}

customElements.define('cart-drawer-items', CartDrawerItems);
