class PremiumLoadMore extends HTMLElement {
  constructor() {
    super();
    this.button = this.querySelector('button');
    this.grid = document.getElementById('product-grid');
    this.loadingDiv = this.querySelector('.load-more-spinner');
    
    if (!this.button || !this.grid) return;

    this.button.addEventListener('click', this.loadMore.bind(this));
  }

  async loadMore() {
    const url = this.button.getAttribute('data-next-url');
    if (!url) return;

    this.button.style.display = 'none';
    if(this.loadingDiv) this.loadingDiv.style.display = 'block';

    try {
      const response = await fetch(url);
      const text = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');

      // Setup new products
      const newGrid = doc.getElementById('product-grid');
      const newItems = newGrid.querySelectorAll('.grid__item');
      
      newItems.forEach(item => {
        // preserve staggered animation logic for new items
        this.grid.appendChild(item);
      });

      // Find new load more button
      const newLoadMore = doc.querySelector('premium-load-more button');
      
      if (newLoadMore && newLoadMore.getAttribute('data-next-url')) {
        this.button.setAttribute('data-next-url', newLoadMore.getAttribute('data-next-url'));
        this.button.style.display = 'inline-flex';
      } else {
        this.button.style.display = 'none';
        const endedText = document.createElement('p');
        endedText.className = 'load-more-ended';
        endedText.innerText = "You've viewed all products";
        this.appendChild(endedText);
      }

    } catch (e) {
      console.error('Error loading more products', e);
      this.button.style.display = 'inline-flex';
    } finally {
      if(this.loadingDiv) this.loadingDiv.style.display = 'none';
    }
  }
}

customElements.define('premium-load-more', PremiumLoadMore);
