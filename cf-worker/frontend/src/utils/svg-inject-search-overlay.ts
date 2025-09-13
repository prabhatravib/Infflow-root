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
function createSearchOverlay(doc: Document, svg: SVGSVGElement, box: { x: number; y: number; width: number; height: number }, opts: InjectOptions) {
  // Create HTML overlay
  const overlay = doc.createElement('div');
  // Get the SVG's position and dimensions on the page
  const svgRect = svg.getBoundingClientRect();
  const svgParent = svg.parentElement;
  
  // SVG viewBox and dimensions
  const viewBox = svg.viewBox.baseVal;
  const svgWidth = svgRect.width;
  const svgHeight = svgRect.height;
  
  // Convert SVG coordinates to screen coordinates
  const scaleX = svgWidth / viewBox.width;
  const scaleY = svgHeight / viewBox.height;
  
  // Calculate the center of the node in SVG coordinates
  const nodeCenterX = box.x + box.width/2;
  const nodeCenterY = box.y + box.height/2;
  
  // Convert to screen coordinates
  const screenX = (nodeCenterX - viewBox.x) * scaleX;
  const screenY = (nodeCenterY - viewBox.y) * scaleY;
  
  // Position relative to the SVG container
  const left = screenX - 100; // Center the 200px wide overlay
  const top = screenY - 15;   // Center the 30px high overlay
  
  console.log('[central-search] Positioning debug:', {
    nodeBox: box,
    nodeCenter: { x: nodeCenterX, y: nodeCenterY },
    screenPos: { x: screenX, y: screenY },
    finalPos: { left, top },
    viewBox: { x: viewBox.x, y: viewBox.y, width: viewBox.width, height: viewBox.height },
    svgSize: { width: svgWidth, height: svgHeight },
    scale: { x: scaleX, y: scaleY }
  });
  
  overlay.style.cssText = `
    position: absolute;
    left: ${left}px;
    top: ${top}px;
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
 * Find the central node (node A) in the SVG
 */
function findNodeA(svg: SVGSVGElement): Element | null {
  return svg.querySelector('[data-id="A"]') || svg.querySelector('#flowchart-A-88') || null;
}

/**
 * Get the bounding box of a node
 */
function getNodeBox(node: Element): { x: number; y: number; width: number; height: number } {
  const bbox = (node as any).getBBox();
  return {
    x: bbox.x,
    y: bbox.y,
    width: bbox.width,
    height: bbox.height
  };
}

/**
 * Inject the search overlay into the SVG container
 */
export function injectSearchOverlay(svg: SVGSVGElement, opts: InjectOptions = {}) {
  if (!svg) return null;

  // Remove any existing overlay
  const existingOverlay = svg.parentElement?.querySelector('.central-search-overlay');
  if (existingOverlay) {
    existingOverlay.remove();
  }

  const nodeA = findNodeA(svg);
  if (!nodeA) {
    console.log('[central-search] Node A not found');
    return null;
  }

  const box = getNodeBox(nodeA);
  const overlay = createSearchOverlay(svg.ownerDocument, svg, box, opts);

  // Add to the SVG's parent container
  overlay.className = 'central-search-overlay';
  svg.parentElement?.appendChild(overlay);

  console.log('[central-search] HTML overlay created and positioned');
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
