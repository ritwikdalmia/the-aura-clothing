/**
 * The Aura - Custom Functionality
 * Wishlist & Quick Add Logic
 */

// Wishlist Logic
function getWishlist() {
    return JSON.parse(localStorage.getItem('aura_wishlist') || '[]');
}

function saveWishlist(wishlist) {
    localStorage.setItem('aura_wishlist', JSON.stringify(wishlist));
    document.dispatchEvent(new CustomEvent('aura:wishlist:updated', { detail: { wishlist } }));
}

function toggleWishlist(button, productId) {
    let wishlist = getWishlist();
    const index = wishlist.indexOf(productId);
    
    if (index > -1) {
        wishlist.splice(index, 1);
        button.classList.remove('active');
    } else {
        wishlist.push(productId);
        button.classList.add('active');
    }
    
    saveWishlist(wishlist);
}

// Update UI on load
document.addEventListener('DOMContentLoaded', () => {
    const wishlist = getWishlist();
    document.querySelectorAll('.na-wishlist').forEach(button => {
        // Extract ID from onclick or data attribute
        const onclickAttr = button.getAttribute('onclick');
        const match = onclickAttr.match(/'([^']+)'/);
        if (match && wishlist.includes(match[1])) {
            button.classList.add('active');
        }
    });
});

// Quick Add Logic
async function openQuickAdd(productUrl) {
    document.body.classList.add('loading-quick-add');
    
    try {
        // Fetch the dedicated quick-add section
        const response = await fetch(`${productUrl}?section_id=product-quick-add`);
        if (!response.ok) throw new Error('Failed to load product');
        
        const html = await response.text();
        // Section rendering API returns JSON with an 'html' property or raw HTML depending on the request headers
        // Here we expect the HTML content directly if we didn't specify section-rendering
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        // Extract the content from the section wrapper
        const content = doc.getElementById('shopify-section-product-quick-add') || doc.body;
        
        showModal(content.innerHTML);
        initQvVariants(); // Initialize variant selection logic
    } catch (error) {
        console.error('Quick Add Error:', error);
    } finally {
        document.body.classList.remove('loading-quick-add');
    }
}

function showModal(content) {
    let modal = document.getElementById('na-quick-add-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'na-quick-add-modal';
        modal.innerHTML = `
            <div class="na-modal-overlay"></div>
            <div class="na-modal-content">
                <button class="na-modal-close" aria-label="Close modal">&times;</button>
                <div class="na-modal-body"></div>
            </div>
        `;
        document.body.appendChild(modal);
        
        modal.querySelector('.na-modal-overlay').addEventListener('click', () => modal.classList.remove('active'));
        modal.querySelector('.na-modal-close').addEventListener('click', () => modal.classList.remove('active'));
    }
    
    modal.querySelector('.na-modal-body').innerHTML = content;
    modal.classList.add('active');
}

// Variant Selection & Modal Helpers
function initQvVariants() {
    const modal = document.getElementById('na-quick-add-modal');
    if (!modal) return;

    const optionPills = modal.querySelectorAll('.na-qv-option');
    optionPills.forEach(pill => {
        pill.addEventListener('click', function() {
            const wrapper = this.closest('.na-qv-option-wrapper');
            wrapper.querySelectorAll('.na-qv-option').forEach(p => p.classList.remove('active'));
            this.classList.add('active');
            updateQvVariant();
        });
    });
}

function updateQvVariant() {
    const modal = document.getElementById('na-quick-add-modal');
    const selectedOptions = Array.from(modal.querySelectorAll('.na-qv-option.active')).map(p => p.dataset.value);
    
    // Find matching variant
    const variant = window.qvVariants.find(v => {
        return v.options.every((opt, idx) => opt === selectedOptions[idx]);
    });

    if (variant) {
        // Update Price
        const priceContainer = modal.querySelector('.na-qv-price');
        if (priceContainer) priceContainer.innerText = formatMoney(variant.price);
        
        // Update Image if available
        if (variant.featured_image) {
            const img = modal.querySelector('.na-quick-view-media img');
            if (img) img.src = variant.featured_image.src;
        }

        // Update Button Variant ID
        const addBtn = modal.querySelector('.na-qv-add-btn');
        const buyBtn = modal.querySelector('.na-qv-buy-btn');
        if (addBtn) addBtn.dataset.variantId = variant.id;
        if (buyBtn) buyBtn.dataset.variantId = variant.id;

        // Update Availability
        if (addBtn) {
            addBtn.disabled = !variant.available;
            addBtn.innerText = variant.available ? 'Add to cart' : 'Sold out';
        }
    }
}

function updateQvQty(btn, delta) {
    const input = btn.closest('.na-qv-qty-input').querySelector('.na-qv-qty-val');
    let val = parseInt(input.value) + delta;
    if (val < 1) val = 1;
    input.value = val;
}

async function addQvToCart(btn) {
    const variantId = btn.dataset.variantId;
    const qty = btn.closest('.na-quick-view-info').querySelector('.na-qv-qty-val').value;
    
    btn.classList.add('loading');
    btn.innerText = 'Adding...';

    try {
        const response = await fetch('/cart/add.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: [{ id: variantId, quantity: qty }] })
        });
        
        if (response.ok) {
            // Close modal and refresh cart drawer
            document.getElementById('na-quick-add-modal').classList.remove('active');
            // Dispatch event to refresh cart drawer (Shopify Dawn default)
            document.documentElement.dispatchEvent(new CustomEvent('cart:refresh', { bubbles: true }));
            // Or specifically for Dawn's cart-drawer component:
            const cartDrawer = document.querySelector('cart-drawer');
            if (cartDrawer) {
                const responseJson = await response.json();
                cartDrawer.renderContents(responseJson);
            }
        }
    } catch (error) {
        console.error('Add to Cart Error:', error);
    } finally {
        btn.classList.remove('loading');
        btn.innerText = 'Add to cart';
    }
}

function buyQvNow(btn) {
    const variantId = btn.dataset.variantId;
    const qty = btn.closest('.na-quick-view-info').querySelector('.na-qv-qty-val').value;
    window.location.href = `/cart/${variantId}:${qty}`;
}

function formatMoney(cents) {
    // Simple money formatter for INR (assumes currency is handled by Shopify globally)
    // You might want to use Shopify's native formatMoney if available
    return 'Rs. ' + (cents / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}
