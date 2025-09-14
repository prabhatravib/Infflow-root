/**
 * Simple HTML overlay approach for central search functionality
 * This replaces the problematic SVG foreignObject approach
 */

export interface InjectOptions {
  defaultValue?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
}

/**
 * Create a fixed position HTML overlay search bar
 */
function createSearchOverlay(doc: Document, _element: SVGSVGElement | HTMLElement, _box: { x: number; y: number; width: number; height: number }, opts: InjectOptions) {
  // Create HTML overlay
  const overlay = doc.createElement('div');
  overlay.setAttribute('data-central-search-bar', 'true');
  
  // Calculate fixed position at screen center (not relative to any element)
  const calculateFixedPosition = () => {
    // Position search bar at screen center, accounting for search bar dimensions
    const searchBarWidth = 200;
    const searchBarHeight = 30;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Center the search bar on the screen
    const left = (viewportWidth - searchBarWidth) / 2;
    const top = (viewportHeight - searchBarHeight) / 2;
    
    // Ensure search bar stays within viewport bounds (with small margins)
    const finalLeft = Math.max(10, Math.min(left, viewportWidth - searchBarWidth - 10));
    const finalTop = Math.max(10, Math.min(top, viewportHeight - searchBarHeight - 10));
    
    return { left: finalLeft, top: finalTop };
  };
  
  // Set initial position
  const position = calculateFixedPosition();
  
  console.log('[central-search] Screen center positioning debug:', {
    calculatedPosition: position,
    viewportSize: { width: window.innerWidth, height: window.innerHeight },
    searchBarSize: { width: 200, height: 30 }
  });
  
  overlay.style.cssText = `
    position: fixed;
    left: ${position.left}px;
    top: ${position.top}px;
    width: 200px;
    height: 30px;
    display: flex;
    gap: 8px;
    align-items: center;
    z-index: 10000;
    pointer-events: auto;
    background: white;
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    padding: 4px;
    border: 2px solid #3b82f6;
    transition: all 0.2s ease;
  `;
  
  // Add resize and scroll listeners to update position
  const updatePosition = () => {
    const newPosition = calculateFixedPosition();
    overlay.style.left = `${newPosition.left}px`;
    overlay.style.top = `${newPosition.top}px`;
  };
  
  // Store listeners for cleanup
  const resizeListener = () => updatePosition();
  const scrollListener = () => updatePosition();
  
  window.addEventListener('resize', resizeListener);
  window.addEventListener('scroll', scrollListener);
  
  // Store cleanup function on the overlay element
  (overlay as any)._cleanup = () => {
    window.removeEventListener('resize', resizeListener);
    window.removeEventListener('scroll', scrollListener);
  };

  const input = doc.createElement('input');
  input.type = 'text';
  input.placeholder = 'Explore visually…';
  input.value = opts.defaultValue || '';
  input.setAttribute('data-central-search-input', 'true');
  input.style.cssText = `
    flex: 1;
    padding: 6px 10px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-size: 12px;
    outline: none;
    background: white;
  `;

  const button = doc.createElement('button');
  button.textContent = 'Search';
  button.style.cssText = `
    background: #3b82f6;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    font-weight: bold;
  `;

  overlay.appendChild(input);
  overlay.appendChild(button);
  
  // Add event handlers
  input.addEventListener('input', (e) => {
    if (opts.onChange) {
      opts.onChange((e.target as HTMLInputElement).value);
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      console.log('new search initiated');
      if (opts.onSubmit) {
        opts.onSubmit(input.value);
      }
    }
  });

  button.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('new search initiated');
    if (opts.onSubmit) {
      opts.onSubmit(input.value);
    }
  };

  return overlay;
}

/**
 * Inject the search overlay as a fixed position element
 */
export function injectSearchOverlay(element: SVGSVGElement | HTMLElement, opts: InjectOptions = {}) {
  if (!element) return null;

  // Check if overlay already exists globally (not just in SVG parent)
  const existingOverlay = document.querySelector('.central-search-overlay');
  if (existingOverlay) {
    // Clean up existing overlay first
    if ((existingOverlay as any)._cleanup) {
      (existingOverlay as any)._cleanup();
    }
    existingOverlay.remove();
  }

  // Create overlay positioned at the center of the element
  const dummyBox = { x: 0, y: 0, width: 0, height: 0 }; // Not used since we calculate center from element dimensions
  const overlay = createSearchOverlay(element.ownerDocument, element, dummyBox, opts);

  // Add to document body for fixed positioning
  overlay.className = 'central-search-overlay';
  document.body.appendChild(overlay);

  console.log('[central-search] Fixed position HTML overlay created and positioned at element center');
  return overlay;
}

/**
 * Setup central search listeners (replaces the old setupCentralSearchListeners)
 */
export function setupCentralSearchListeners(
  onChange: (value: string) => void,
  onSubmit: (value: string) => void
) {
  console.log('[central-search] Setting up HTML overlay listeners');
  
  // This will be called when the element is ready
  return {
    inject: (element: SVGSVGElement | HTMLElement, defaultValue?: string) => {
      return injectSearchOverlay(element, {
        defaultValue,
        onChange,
        onSubmit
      });
    }
  };
}
