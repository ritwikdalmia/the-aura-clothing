
/* ============================================================================
   The Aura Premium Functionality (na-functionality.js)
   ========================================================================== */

// 1. Open Quick Add Modal
let qvCarouselInterval;

async function openQuickAdd(productUrl) {
    const modal = document.getElementById('naQuickAddModal');
    const content = modal.querySelector('.na-modal-content-inner');
    
    // Show modal & loading state
    modal.style.display = 'flex';
    content.innerHTML = '<div style="padding: 5rem; text-align: center;">Loading Boutique Experience...</div>';
    
    try {
        const separator = productUrl.includes('?') ? '&' : '?';
        const response = await fetch(`${productUrl}${separator}section_id=product-quick-add`);
        const html = await response.text();
        content.innerHTML = html;
        
        // Initialize variant logic
        initQuickAddVariants(content);
        
        // Start Carousel
        startQvCarousel(content);
    } catch (e) {
        content.innerHTML = '<div style="padding: 5rem; text-align: center;">Error loading products. Please try again.</div>';
    }
}

// 2. Variant Swapping Logic
function initQuickAddVariants(container) {
    const options = container.querySelectorAll('.na-qv-option');
    options.forEach(opt => {
        opt.addEventListener('click', function() {
            const wrapper = this.closest('.na-qv-option-wrapper');
            wrapper.querySelectorAll('.na-qv-option').forEach(o => o.classList.remove('active'));
            this.classList.add('active');
            
            updateProductVariant(container);
        });
    });
}

function updateProductVariant(container) {
    const selectedOptions = Array.from(container.querySelectorAll('.na-qv-option.active')).map(o => o.dataset.value);
    
    // Parse variants from hidden JSON script tag
    const variantDataTag = container.querySelector('#naQvVariantData');
    if (!variantDataTag) return;
    
    const variants = JSON.parse(variantDataTag.textContent);
    
    const matchedVariant = variants.find(v => {
        return v.options.every((opt, index) => opt === selectedOptions[index]);
    });
    
    if (matchedVariant) {
        // Update price
        container.querySelector('.na-qv-price').innerText = formatMoney(matchedVariant.price);
        
        // Update Add to Cart Button
        const addBtn = container.querySelector('.na-qv-add-btn');
        addBtn.dataset.variantId = matchedVariant.id;
        addBtn.disabled = !matchedVariant.available;
        addBtn.innerText = matchedVariant.available ? 'Add to cart' : 'Sold Out';
        
        // Update Buy Now
        container.querySelector('.na-qv-buy-btn').dataset.variantId = matchedVariant.id;
        
        if (matchedVariant.available) {
            container.querySelector('.na-qv-buy-btn').disabled = false;
            container.querySelector('.na-qv-buy-btn').style.display = 'block';
        } else {
            container.querySelector('.na-qv-buy-btn').disabled = true;
            container.querySelector('.na-qv-buy-btn').style.display = 'none';
        }
        
        // Update Image if variant has featured media
        if (matchedVariant.featured_media) {
           const img = container.querySelector('#naQvImage-product-quick-add');
           if (img) img.src = matchedVariant.featured_media.preview_image.src;
        }
    }
}

// 3. Cart Logic
function updateQvQty(btn, delta) {
    const input = btn.closest('.na-qv-qty-input').querySelector('.na-qv-qty-val');
    let val = parseInt(input.value) + delta;
    if (val < 1) val = 1;
    input.value = val;
}

async function addQvToCart(btn) {
    const variantId = btn.dataset.variantId;
    const qtyInput = btn.closest('.na-modal-body').querySelector('.na-qv-qty-val');
    const qty = qtyInput ? qtyInput.value : 1;
    const originalText = btn.innerText;
    
    btn.innerHTML = '<span class="na-loader"></span> Adding...';
    btn.disabled = true;

    // Get the cart drawer instance to request updated sections
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

        if (!response.ok) {
            throw new Error(data.description || data.message || 'Error adding to cart');
        }
        
        // Success feedback
        btn.innerText = 'Added!';
        
        // Trigger the drawer refresh immediately
        if (cartDrawer && typeof cartDrawer.renderContents === 'function') {
            cartDrawer.renderContents(data);
        }
        
        // Close modal after a short delay
        setTimeout(() => {
            closeNaModal();
            btn.innerText = originalText;
            btn.disabled = false;
        }, 1000);
        
    } catch (e) {
        alert(e.message);
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

// 4. Modal Utilities
function closeNaModal() {
    document.getElementById('naQuickAddModal').style.display = 'none';
    stopQvCarousel();
}

async function buyQvNow(btn) {
    const variantId = btn.dataset.variantId;
    const qty = btn.closest('.na-modal-body').querySelector('.na-qv-qty-val').value;
    
    btn.innerText = 'Processing...';
    btn.disabled = true;

    try {
        const formData = {
            'items': [{
                'id': variantId,
                'quantity': qty
            }]
        };

        await fetch(window.Shopify.routes.root + 'cart/clear.js', { method: 'POST' });
        await fetch(window.Shopify.routes.root + 'cart/add.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        window.location.href = window.shopUrl + '/checkout';
    } catch (e) {
        alert('Checkout failed. Please try again.');
        btn.innerText = 'Buy it now';
        btn.disabled = false;
    }
}

function formatMoney(cents) {
    return '₹' + (cents / 100).toLocaleString('en-IN');
}

// Global listeners
document.addEventListener('click', (e) => {
    if (e.target.id === 'naQuickAddModal') closeNaModal();
});

// 5. Carousel Logic
function startQvCarousel(container) {
    stopQvCarousel();
    const slides = container.querySelectorAll('.na-qv-slide');
    if (slides.length <= 1) return;

    let current = 0;
    qvCarouselInterval = setInterval(() => {
        slides[current].classList.remove('active');
        current = (current + 1) % slides.length;
        slides[current].classList.add('active');
    }, 3000);
}

function stopQvCarousel() {
    if (qvCarouselInterval) {
        clearInterval(qvCarouselInterval);
        qvCarouselInterval = null;
    }
}
