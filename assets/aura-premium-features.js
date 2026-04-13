/**
 * Aura Premium Features - Wishlist & Compare
 * Handles localStorage and UI updates for premium features.
 */

const AuraFeatures = {
  WISHLIST_KEY: 'aura_wishlist',
  COMPARE_KEY: 'aura_compare',
  COMPARE_DETAILS_KEY: 'aura_compare_details',

  /**
   * Helper: Format Money
   * Fixes 'Shopify.formatMoney is not a function' errors.
   */
  formatMoney(cents, format) {
    if (typeof cents === 'string') cents = cents.replace('.', '');
    let value = '';
    const placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
    const formatString = format || '₹{{amount}}'; // Default format

    function formatWithDelimiters(number, precision, thousands, decimal) {
      precision = precision || 2;
      thousands = thousands || ',';
      decimal = decimal || '.';

      if (isNaN(number) || number == null) return '0';

      number = (number / 100.0).toFixed(precision);

      const parts = number.split('.');
      const dollars = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands);
      const centsPart = parts[1] ? (decimal + parts[1]) : '';

      return dollars + centsPart;
    }

    const match = formatString.match(placeholderRegex);
    if (!match) return cents;

    switch (match[1]) {
      case 'amount':
        value = formatWithDelimiters(cents, 2);
        break;
      case 'amount_no_decimals':
        value = formatWithDelimiters(cents, 0);
        break;
      case 'amount_with_comma_separator':
        value = formatWithDelimiters(cents, 2, '.', ',');
        break;
      case 'amount_no_decimals_with_comma_separator':
        value = formatWithDelimiters(cents, 0, '.', ',');
        break;
      default:
        value = formatWithDelimiters(cents, 2);
    }

    return formatString.replace(placeholderRegex, value);
  },

  init() {
    this.updateBadges();
    this.bindEvents();
    console.log('Aura Premium Features Initialized');
  },

  getWishlist() {
    return JSON.parse(localStorage.getItem(this.WISHLIST_KEY)) || [];
  },

  getCompareList() {
    return JSON.parse(localStorage.getItem(this.COMPARE_KEY)) || [];
  },

  getCompareDetails() {
    return JSON.parse(localStorage.getItem(this.COMPARE_DETAILS_KEY)) || {};
  },

  toggleWishlist(handle) {
    let list = this.getWishlist();
    const index = list.indexOf(handle);
    if (index > -1) {
      list.splice(index, 1);
      this.notify('Removed from Wishlist');
    } else {
      list.push(handle);
      this.notify('Added to Wishlist');
    }
    localStorage.setItem(this.WISHLIST_KEY, JSON.stringify(list));
    this.updateBadges();
    document.dispatchEvent(new CustomEvent('aura:wishlist:updated', { detail: { list } }));
    return index === -1; // returns true if added
  },

  toggleCompare(handle, specs) {
    let list = this.getCompareList();
    let details = this.getCompareDetails();
    const index = list.indexOf(handle);
    if (index > -1) {
      list.splice(index, 1);
      delete details[handle];
      this.notify('Removed from Compare');
    } else {
      if (list.length >= 4) {
        this.notify('You can only compare up to 4 products');
        return false;
      }
      list.push(handle);
      if (specs) {
        details[handle] = specs;
      }
      this.notify('Added to Compare');
    }
    localStorage.setItem(this.COMPARE_KEY, JSON.stringify(list));
    localStorage.setItem(this.COMPARE_DETAILS_KEY, JSON.stringify(details));
    this.updateBadges();
    document.dispatchEvent(new CustomEvent('aura:compare:updated', { detail: { list } }));
    return index === -1;
  },

  updateBadges() {
    const wishlistCount = this.getWishlist().length;
    const compareCount = this.getCompareList().length;

    document.querySelectorAll('.aura-wishlist-count').forEach(el => {
      el.textContent = wishlistCount;
      el.style.display = wishlistCount > 0 ? 'flex' : 'none';
    });

    document.querySelectorAll('.aura-compare-count').forEach(el => {
      el.textContent = compareCount;
      el.style.display = compareCount > 0 ? 'flex' : 'none';
    });

    // Update button states
    this.updateButtonStates();
  },

  updateButtonStates() {
    const wishlist = this.getWishlist();
    const compare = this.getCompareList();

    document.querySelectorAll('[data-aura-wishlist]').forEach(btn => {
      const handle = btn.getAttribute('data-aura-wishlist');
      if (wishlist.includes(handle)) {
        btn.classList.add('is-active');
      } else {
        btn.classList.remove('is-active');
      }
    });

    document.querySelectorAll('[data-aura-compare]').forEach(btn => {
      const handle = btn.getAttribute('data-aura-compare');
      if (compare.includes(handle)) {
        btn.classList.add('is-active');
      } else {
        btn.classList.remove('is-active');
      }
    });
  },

  bindEvents() {
    document.addEventListener('click', (e) => {
      const wishlistBtn = e.target.closest('[data-aura-wishlist]');
      if (wishlistBtn) {
        e.preventDefault();
        const handle = wishlistBtn.getAttribute('data-aura-wishlist');
        this.toggleWishlist(handle);
      }

      const compareBtn = e.target.closest('[data-aura-compare]');
      if (compareBtn) {
        e.preventDefault();
        const handle = compareBtn.getAttribute('data-aura-compare');
        const specs = compareBtn.getAttribute('data-aura-specs');
        this.toggleCompare(handle, specs);
      }
    });
  },

  notify(message) {
    // Simple toast notification - can be expanded later
    const toast = document.createElement('div');
    toast.className = 'aura-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('is-visible'), 100);
    setTimeout(() => {
      toast.classList.remove('is-visible');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
};

window.AuraFeatures = AuraFeatures;
document.addEventListener('DOMContentLoaded', () => AuraFeatures.init());
