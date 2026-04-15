// create a container and set the full-size image as its background
function createOverlay(image) {
  const overlayImage = document.createElement('img');
  overlayImage.setAttribute('src', `${image.src}`);
  overlay = document.createElement('div');
  prepareOverlay(overlay, overlayImage);

  image.style.opacity = '50%';
  toggleLoadingSpinner(image);

  overlayImage.onload = () => {
    toggleLoadingSpinner(image);
    image.parentElement.insertBefore(overlay, image);
    image.style.opacity = '100%';
  };

  return overlay;
}

function prepareOverlay(container, image) {
  container.setAttribute('class', 'image-magnify-full-size');
  container.setAttribute('aria-hidden', 'true');
  container.style.backgroundImage = `url('${image.src}')`;
  container.style.backgroundColor = 'var(--gradient-background)';
  container.style.backgroundRepeat = 'no-repeat';
}

function toggleLoadingSpinner(image) {
  const loadingSpinner = image.parentElement.parentElement.querySelector(`.loading__spinner`);
  loadingSpinner.classList.toggle('hidden');
}

function moveWithHover(image, event, zoomRatio, currentOverlay) {
  // calculate pointer position
  const ratio = image.height / image.width;
  const targetElement = event.target;
  const container = targetElement.getBoundingClientRect();
  
  let clientX = event.clientX;
  let clientY = event.clientY;
  
  if (event.touches && event.touches.length > 0) {
    clientX = event.touches[0].clientX;
    clientY = event.touches[0].clientY;
  }

  const xPosition = clientX - container.left;
  const yPosition = clientY - container.top;
  
  // Clamp boundaries to prevent panning past the image edges
  const xPercentCalc = Math.max(0, Math.min(100, xPosition / (image.clientWidth / 100)));
  const yPercentCalc = Math.max(0, Math.min(100, yPosition / ((image.clientWidth * ratio) / 100)));
  
  const xPercent = `${xPercentCalc}%`;
  const yPercent = `${yPercentCalc}%`;

  // determine what to show in the frame
  currentOverlay.style.backgroundPosition = `${xPercent} ${yPercent}`;
  currentOverlay.style.backgroundSize = `${image.width * zoomRatio}px`;
}

function magnify(image, zoomRatio) {
  const overlay = createOverlay(image);
  const gallery = image.closest('media-gallery');
  
  if (gallery && typeof gallery.pauseAutoSlide === 'function') {
    gallery.pauseAutoSlide();
  }
  
  const removeOverlay = () => {
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    if (gallery && typeof gallery.playAutoSlide === 'function') {
      gallery.playAutoSlide();
    }
  };
  
  overlay.onclick = removeOverlay;
  overlay.onmouseleave = removeOverlay;
  
  overlay.onmousemove = (event) => moveWithHover(image, event, zoomRatio, overlay);
  
  overlay.ontouchmove = (event) => {
    event.preventDefault(); // Prevents slider swipe or page scroll while zooming
    moveWithHover(image, event, zoomRatio, overlay);
  };
  
  return overlay;
}

function enableZoomOnHover(zoomRatio) {
  const images = document.querySelectorAll('.image-magnify-hover');
  images.forEach((image) => {
    image.onclick = (event) => {
      // Prevent creating multiple overlays if one already exists for this image
      if (image.parentElement.querySelector('.image-magnify-full-size')) return;
      
      const createdOverlay = magnify(image, zoomRatio);
      moveWithHover(image, event, zoomRatio, createdOverlay);
    };
  });
}

enableZoomOnHover(2);
