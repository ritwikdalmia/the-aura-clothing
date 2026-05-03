/**
 * Aura Premium Core - Unified Feature Logic
 * Handles Wishlist, Compare, Quick Add, and UI Utilities.
 */

window.AuraFeatures = window.AuraFeatures || {
  // Config
  KEYS: {
    WISHLIST: 'aura_wishlist',
    COMPARE: 'aura_compare',
    COMPARE_DETAILS: 'aura_compare_details'
  },

  /**
   * Shared Utility: Format Money
   */
  formatMoney(cents, format = '₹{{amount}}') {
    if (typeof cents === 'string') cents = cents.replace('.', '');
    const placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
    
    const formatWithDelimiters = (number, precision = 2, thousands = ',', decimal = '.') => {
      if (isNaN(number) || number == null) return '0';
      number = (number / 100.0).toFixed(precision);
      const parts = number.split('.');
      const dollars = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands);
      const centsPart = parts[1] ? (decimal + parts[1]) : '';
      return dollars + centsPart;
    };

    const match = format.match(placeholderRegex);
    if (!match) return cents;

    let value = '';
    switch (match[1]) {
      case 'amount': value = formatWithDelimiters(cents, 2); break;
      case 'amount_no_decimals': value = formatWithDelimiters(cents, 0); break;
      case 'amount_with_comma_separator': value = formatWithDelimiters(cents, 2, '.', ','); break;
      case 'amount_no_decimals_with_comma_separator': value = formatWithDelimiters(cents, 0, '.', ','); break;
      default: value = formatWithDelimiters(cents, 2);
    }

    return format.replace(placeholderRegex, value);
  },

  // --- WISHLIST & COMPARE ---
  
  getStorage(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || (key.includes('details') ? {} : []);
    } catch (e) {
      return key.includes('details') ? {} : [];
    }
  },

  getWishlist() {
    return this._cache.wishlist || this.getStorage(this.KEYS.WISHLIST);
  },

  getCompareList() {
    return this._cache.compare || this.getStorage(this.KEYS.COMPARE);
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
    localStorage.setItem(this.KEYS.WISHLIST, JSON.stringify(list));
    this._cache.wishlist = list;
    this.updateUI();
    document.dispatchEvent(new CustomEvent('aura:wishlist:updated', { detail: { list } }));
  },

  toggleCompare(handle, specs) {
    let list = this.getCompareList();
    let details = this.getStorage(this.KEYS.COMPARE_DETAILS);
    const index = list.indexOf(handle);
    
    if (index > -1) {
      list.splice(index, 1);
      delete details[handle];
      this.notify('Removed from Compare');
    } else {
      if (list.length >= 2) {
        this.notify('You can only compare up to 2 products');
        return;
      }
      list.push(handle);
      if (specs) details[handle] = specs;
      this.notify('Added to Compare');
    }
    
    localStorage.setItem(this.KEYS.COMPARE, JSON.stringify(list));
    localStorage.setItem(this.KEYS.COMPARE_DETAILS, JSON.stringify(details));
    this._cache.compare = list;
    this.updateUI();
    document.dispatchEvent(new CustomEvent('aura:compare:updated', { detail: { list } }));
  },

  updateBadges() {
    this.updateUI();
  },

  clearWishlist() {
    localStorage.removeItem(this.KEYS.WISHLIST);
    this._cache.wishlist = [];
    this.notify('Wishlist Cleared');
    this.updateUI();
    document.dispatchEvent(new CustomEvent('aura:wishlist:updated', { detail: { list: [] } }));
  },

  clearCompare() {
    localStorage.removeItem(this.KEYS.COMPARE);
    localStorage.removeItem(this.KEYS.COMPARE_DETAILS);
    this._cache.compare = [];
    this.notify('Comparison Cleared');
    this.updateUI();
    document.dispatchEvent(new CustomEvent('aura:compare:updated', { detail: { list: [] } }));
  },

  // --- QUICK ADD ---

  async openQuickAdd(productUrl, triggerEl = null) {
    const modal = document.getElementById('naQuickAddModal');
    if (!modal) return;

    // Show loading state on trigger if provided
    let originalTriggerHtml = '';
    if (triggerEl) {
      originalTriggerHtml = triggerEl.innerHTML;
      triggerEl.innerHTML = '<span class="aura-loader" style="width:14px; height:14px; border-width:2px;"></span>';
      triggerEl.classList.add('is-loading');
      triggerEl.disabled = true;
    }
    
    const content = modal.querySelector('.na-modal-content-inner');
    modal.style.display = 'flex';
    content.innerHTML = `
      <div class="aura-loader-container">
        <span class="aura-loader"></span>
        <div style="margin-top:1.5rem;">Unveiling Boutique Experience...</div>
      </div>
    `;
    
    try {
      const separator = productUrl.includes('?') ? '&' : '?';
      const response = await fetch(`${productUrl}${separator}section_id=product-quick-add`);
      if (!response.ok) throw new Error('Failed to load product details');
      const html = await response.text();
      content.innerHTML = html;
      this.initQuickAddLogic(content);
    } catch (e) {
      content.innerHTML = `
        <div style="padding: 4rem; text-align: center;">
          <h2 style="color: var(--aura-brand-gold); margin-bottom: 1rem;">Oops!</h2>
          <p>Something went wrong while loading the product. Please try again.</p>
          <button class="aura-btn-premium" style="margin-top: 2rem; background: var(--aura-brand-dark); color: #fff; padding: 1rem 3rem;" onclick="location.reload()">Reload Page</button>
        </div>
      `;
      this.notify(e.message);
    } finally {
      if (triggerEl) {
        triggerEl.innerHTML = originalTriggerHtml;
        triggerEl.classList.remove('is-loading');
        triggerEl.disabled = false;
      }
    }
  },

  initQuickAddLogic(container) {
    container.querySelectorAll('.na-qv-option').forEach(opt => {
      opt.addEventListener('click', (e) => {
        const wrapper = e.target.closest('.na-qv-option-wrapper');
        wrapper.querySelectorAll('.na-qv-option').forEach(o => o.classList.remove('active'));
        e.target.classList.add('active');
        this.updateQuickAddVariant(container);
      });
    });

    const slides = container.querySelectorAll('.na-qv-slide');
    if (slides.length > 1) {
      let current = 0;
      this.qvInterval = setInterval(() => {
        slides[current].classList.remove('active');
        current = (current + 1) % slides.length;
        slides[current].classList.add('active');
      }, 3000);
    }
  },

  updateQuickAddVariant(container) {
    const selected = Array.from(container.querySelectorAll('.na-qv-option.active')).map(o => o.dataset.value);
    const dataTag = container.querySelector('#naQvVariantData');
    if (!dataTag) return;
    
    const variants = JSON.parse(dataTag.textContent);
    const variant = variants.find(v => v.options.every((opt, i) => opt === selected[i]));
    
    if (variant) {
      container.querySelector('.na-qv-price').innerText = this.formatMoney(variant.price);
      const addBtn = container.querySelector('.na-qv-add-btn');
      addBtn.dataset.variantId = variant.id;
      addBtn.disabled = !variant.available;
      addBtn.innerText = variant.available ? 'Add to cart' : 'Sold Out';
      
      const buyBtn = container.querySelector('.na-qv-buy-btn');
      buyBtn.dataset.variantId = variant.id;
      buyBtn.style.display = variant.available ? 'block' : 'none';
      
      if (variant.featured_media) {
        const img = container.querySelector('#naQvImage-product-quick-add');
        if (img) img.src = variant.featured_media.preview_image.src;
      }
    }
  },

  updateQvQty(btn, delta) {
    const input = btn.closest('.na-qv-qty-input').querySelector('.na-qv-qty-val');
    let val = parseInt(input.value) + delta;
    if (val < 1) val = 1;
    input.value = val;
  },

  async addQvToCart(btn) {
    const variantId = btn.dataset.variantId;
    const qtyInput = btn.closest('.na-modal-body').querySelector('.na-qv-qty-val');
    const qty = qtyInput ? qtyInput.value : 1;
    const originalText = btn.innerHTML;
    
    btn.innerHTML = '<span class="aura-loader"></span> Adding...';
    btn.disabled = true;

    const cartDrawer = document.querySelector('cart-drawer');
    const sections = cartDrawer ? cartDrawer.getSectionsToRender().map((section) => section.id) : [];

    try {
      const response = await fetch(window.Shopify.routes.root + 'cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          items: [{ id: variantId, quantity: qty }],
          sections: sections,
          sections_url: window.location.pathname
        })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.description || data.message || 'Error adding to cart');
      
      btn.innerText = 'Added!';
      if (cartDrawer && typeof cartDrawer.renderContents === 'function') cartDrawer.renderContents(data);
      
      setTimeout(() => {
        const modal = document.getElementById('naQuickAddModal');
        if (modal) modal.style.display = 'none';
        btn.innerHTML = originalText;
        btn.disabled = false;
      }, 1000);
    } catch (e) {
      this.notify(e.message);
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  },

  async buyQvNow(btn) {
    const variantId = btn.dataset.variantId;
    const qtyInput = btn.closest('.na-modal-body').querySelector('.na-qv-qty-val');
    const qty = qtyInput ? qtyInput.value : 1;
    
    btn.innerText = 'Processing...';
    btn.disabled = true;

    try {
      await fetch(window.Shopify.routes.root + 'cart/clear.js', { method: 'POST' });
      await fetch(window.Shopify.routes.root + 'cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [{ id: variantId, quantity: qty }] })
      });
      window.location.href = window.shopUrl + '/checkout';
    } catch (e) {
      this.notify('Checkout failed. Please try again.');
      btn.innerText = 'Buy it now';
      btn.disabled = false;
    }
  },

  // --- SYSTEM INITIALIZATION ---
  
  _cache: {
    wishlist: null,
    compare: null
  },

  init() {
    this._cache.wishlist = this.getStorage(this.KEYS.WISHLIST);
    this._cache.compare = this.getStorage(this.KEYS.COMPARE);
    
    this.updateUI();
    this.bindEvents();
  },

  updateUI() {
    const wishlist = this._cache.wishlist || [];
    const compare = this._cache.compare || [];

    requestAnimationFrame(() => {
      document.querySelectorAll('.aura-wishlist-count').forEach(el => {
        el.textContent = wishlist.length;
        el.style.display = wishlist.length > 0 ? 'flex' : 'none';
      });
      document.querySelectorAll('.aura-compare-count').forEach(el => {
        el.textContent = compare.length;
        el.style.display = compare.length > 0 ? 'flex' : 'none';
      });

      document.querySelectorAll('[data-aura-wishlist]').forEach(btn => {
        btn.classList.toggle('is-active', wishlist.includes(btn.dataset.auraWishlist));
      });
      document.querySelectorAll('[data-aura-compare]').forEach(btn => {
        btn.classList.toggle('is-active', compare.includes(btn.dataset.auraCompare));
      });
    });
  },

  bindEvents() {
    document.addEventListener('click', (e) => {
      const wishlistBtn = e.target.closest('[data-aura-wishlist]');
      if (wishlistBtn) {
        e.preventDefault();
        this.toggleWishlist(wishlistBtn.dataset.auraWishlist);
      }

      const compareBtn = e.target.closest('[data-aura-compare]');
      if (compareBtn) {
        e.preventDefault();
        this.toggleCompare(compareBtn.dataset.auraCompare, compareBtn.dataset.auraSpecs);
      }

      const quickAddBtn = e.target.closest('[data-aura-quick-add]');
      if (quickAddBtn) {
        e.preventDefault();
        this.openQuickAdd(quickAddBtn.dataset.auraQuickAdd);
      }
      
      const qtyMinus = e.target.closest('[data-aura-qty-minus]');
      if (qtyMinus) this.updateQvQty(qtyMinus, -1);

      const qtyPlus = e.target.closest('[data-aura-qty-plus]');
      if (qtyPlus) this.updateQvQty(qtyPlus, 1);

      const addToCart = e.target.closest('[data-aura-add-to-cart]');
      if (addToCart) this.addQvToCart(addToCart);

      const buyNow = e.target.closest('[data-aura-buy-now]');
      if (buyNow) this.buyQvNow(buyNow);

      if (e.target.id === 'naQuickAddModal' || e.target.closest('.na-modal-close')) {
        const modal = document.getElementById('naQuickAddModal');
        if (modal) {
          modal.style.display = 'none';
          if (this.qvInterval) clearInterval(this.qvInterval);
        }
      }
    });
  },

  notify(message) {
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
window.Aura = AuraFeatures; // Backward compatibility

// Global Aliases
window.openQuickAdd = (url) => AuraFeatures.openQuickAdd(url);
window.formatMoney = (cents, format) => AuraFeatures.formatMoney(cents, format);
window.updateQvQty = (btn, delta) => AuraFeatures.updateQvQty(btn, delta);
window.addQvToCart = (btn) => AuraFeatures.addQvToCart(btn);
window.buyQvNow = (btn) => AuraFeatures.buyQvNow(btn);

document.addEventListener('DOMContentLoaded', () => AuraFeatures.init());
