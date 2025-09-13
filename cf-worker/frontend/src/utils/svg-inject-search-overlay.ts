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
 * Create a simple HTML overlay search bar
 */
function createSearchOverlay(doc: Document, svg: SVGSVGElement, _box: { x: number; y: number; width: number; height: number }, opts: InjectOptions) {
  // Create HTML overlay
  const overlay = doc.createElement('div');
  // Get the SVG's position and dimensions on the page
  const svgRect = svg.getBoundingClientRect();
  
  // SVG viewBox and dimensions
  const viewBox = svg.viewBox.baseVal;
  const svgWidth = svgRect.width;
  const svgHeight = svgRect.height;
  
  // Calculate the center of the entire SVG instead of just the node
  const svgCenterX = viewBox.width / 2;
  const svgCenterY = viewBox.height / 2;
  
  // Convert SVG center coordinates to screen coordinates
  const scaleX = svgWidth / viewBox.width;
  const scaleY = svgHeight / viewBox.height;
  
  const screenX = (svgCenterX - viewBox.x) * scaleX;
  const screenY = (svgCenterY - viewBox.y) * scaleY;
  
  // Position relative to the SVG container - center the search bar in the middle of the flowchart
  const left = screenX - 100; // Center the 200px wide overlay
  const top = screenY - 15;   // Center the 30px high overlay
  
  // Ensure the search bar is visible within the SVG container bounds
  const maxLeft = svgWidth - 200; // 200px is the overlay width
  const maxTop = svgHeight - 30;  // 30px is the overlay height
  const finalLeft = Math.max(0, Math.min(left, maxLeft));
  const finalTop = Math.max(0, Math.min(top, maxTop));
  
  console.log('[central-search] Positioning debug (centered):', {
    svgCenter: { x: svgCenterX, y: svgCenterY },
    screenPos: { x: screenX, y: screenY },
    calculatedPos: { left, top },
    finalPos: { left: finalLeft, top: finalTop },
    viewBox: { x: viewBox.x, y: viewBox.y, width: viewBox.width, height: viewBox.height },
    svgSize: { width: svgWidth, height: svgHeight },
    scale: { x: scaleX, y: scaleY }
  });
  
  overlay.style.cssText = `
    position: absolute;
    left: ${finalLeft}px;
    top: ${finalTop}px;
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
  `;

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
 * Inject the search overlay into the SVG container
 */
export function injectSearchOverlay(svg: SVGSVGElement, opts: InjectOptions = {}) {
  if (!svg) return null;

  // Check if overlay already exists
  const existingOverlay = svg.parentElement?.querySelector('.central-search-overlay');
  if (existingOverlay) {
    // Just update the value if overlay exists
    const input = existingOverlay.querySelector('input');
    if (input && opts.defaultValue !== undefined && input.value !== opts.defaultValue) {
      input.value = opts.defaultValue;
    }
    console.log('[central-search] Updated existing HTML overlay value');
    return existingOverlay;
  }

  // Create overlay positioned at the center of the SVG (no need to find Node A)
  const dummyBox = { x: 0, y: 0, width: 0, height: 0 }; // Not used since we calculate center from SVG dimensions
  const overlay = createSearchOverlay(svg.ownerDocument, svg, dummyBox, opts);

  // Add to the SVG's parent container
  overlay.className = 'central-search-overlay';
  svg.parentElement?.appendChild(overlay);

  console.log('[central-search] HTML overlay created and positioned at SVG center');
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
  
  // This will be called when the SVG is ready
  return {
    inject: (svg: SVGSVGElement, defaultValue?: string) => {
      return injectSearchOverlay(svg, {
        defaultValue,
        onChange,
        onSubmit
      });
    }
  };
}
