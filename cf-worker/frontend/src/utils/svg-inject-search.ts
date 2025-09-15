/**
 * Inject a search bar into the SVG by replacing the visuals of node A
 * with an <foreignObject>. Uses a global event dispatcher for reliable communication.
 */

export type InjectOptions = {
  /** Initial value for the input */
  defaultValue?: string;
  /** Called when user submits (press Enter or clicks button) */
  onSubmit?: (query: string) => void;
  /** Called on each input change (for URL/state sync) */
  onChange?: (query: string) => void;
};

const SVG_NS = 'http://www.w3.org/2000/svg';
const XHTML_NS = 'http://www.w3.org/1999/xhtml';

// Global event dispatcher for reliable communication between SVG and React
const CENTRAL_SEARCH_EVENT = 'central-search-change';
const CENTRAL_SEARCH_SUBMIT_EVENT = 'central-search-submit';

// Store callbacks globally to ensure they persist
let globalOnChange: ((value: string) => void) | null = null;
let globalOnSubmit: ((value: string) => void) | null = null;

/**
 * Set up global event listeners for central search
 */
export function setupCentralSearchListeners(
  onChange: (value: string) => void,
  onSubmit: (value: string) => void
) {
  globalOnChange = onChange;
  globalOnSubmit = onSubmit;
  
  // Remove any existing listeners
  window.removeEventListener(CENTRAL_SEARCH_EVENT, handleCentralSearchChange as any);
  window.removeEventListener(CENTRAL_SEARCH_SUBMIT_EVENT, handleCentralSearchSubmit as any);
  
  // Add new listeners
  window.addEventListener(CENTRAL_SEARCH_EVENT, handleCentralSearchChange as any);
  window.addEventListener(CENTRAL_SEARCH_SUBMIT_EVENT, handleCentralSearchSubmit as any);
}

function handleCentralSearchChange(event: CustomEvent) {
  const value = event.detail.value;
  console.log('[central-search] Global change event received:', value);
  if (globalOnChange) {
    globalOnChange(value);
  }
}

function handleCentralSearchSubmit(event: CustomEvent) {
  const value = event.detail.value;
  console.log('new search initiated');
  console.log('[central-search] Global submit event received:', value);
  if (globalOnSubmit) {
    globalOnSubmit(value);
  }
}

/**
 * Try to locate the central node "A" in various Mermaid outputs.
 */
function findNodeA(svg: SVGSVGElement): SVGGElement | null {
  const selectors = [
    'g[id^="flowchart-A"]',
    '[data-id="A"]',
    '[id$="-A"]',
    '#A',
    '.node#A',
    '.node[id*="A"]',
  ];
  for (const sel of selectors) {
    const el = svg.querySelector(sel) as SVGGElement | null;
    if (el) return el;
  }

  // Fallback: find group whose text is exactly 'A'
  const groups = Array.from(svg.querySelectorAll('g')) as SVGGElement[];
  const byText = groups.find(g => (g.textContent || '').trim() === 'A');
  return byText || null;
}

/**
 * Remove visual children of a node
 */
function clearNodeVisuals(node: SVGGElement) {
  const visuals = node.querySelectorAll('rect, text, .label, foreignObject, path, polygon, ellipse, circle');
  visuals.forEach(el => el.parentElement?.removeChild(el));
}

/**
 * Read node box from its primary rect if present
 */
function getNodeBox(node: SVGGElement): { x: number; y: number; width: number; height: number } {
  const rect = node.querySelector('rect') as SVGRectElement | null;
  if (rect) {
    const width = Number(rect.getAttribute('width') || '0');
    const height = Number(rect.getAttribute('height') || '0');
    const xAttr = rect.getAttribute('x');
    const yAttr = rect.getAttribute('y');
    const x = xAttr !== null ? Number(xAttr) : -width / 2;
    const y = yAttr !== null ? Number(yAttr) : -height / 2;
    return { x, y, width, height };
  }

  const bbox = node.getBBox();
  const width = bbox.width;
  const height = bbox.height;
  return { x: -width / 2, y: -height / 2, width, height };
}

/**
 * Build the foreignObject with search bar
 */
function buildSearchFO(doc: Document, box: { x: number; y: number; width: number; height: number }, opts: InjectOptions) {
  // Create SVG foreignObject
  const fo = doc.createElementNS(SVG_NS, 'foreignObject');
  // Ensure minimum dimensions for the foreignObject
  const minWidth = 200;
  const minHeight = 50;
  const foWidth = Math.max(minWidth, box.width);
  const foHeight = Math.max(minHeight, box.height);
  
  fo.setAttribute('x', String(box.x));
  fo.setAttribute('y', String(box.y));
  fo.setAttribute('width', String(foWidth));
  fo.setAttribute('height', String(foHeight));
  
  console.log('[central-search] ForeignObject dimensions:', {
    boxX: box.x,
    boxY: box.y,
    boxWidth: box.width,
    boxHeight: box.height,
    foWidth,
    foHeight
  });
  fo.setAttribute('data-search-bar', 'true');
  fo.setAttribute('data-export-exclude', '');
  fo.setAttribute('style', 'overflow: visible; pointer-events: auto; z-index: 1000; position: relative; cursor: pointer;');

  const container = doc.createElementNS(XHTML_NS, 'div');
  container.setAttribute('xmlns', XHTML_NS);
  container.setAttribute('class', 'mermaid-search-bar');
  container.setAttribute('style', 'display: flex; align-items: center; gap: 8px; padding: 4px; pointer-events: auto; z-index: 1001; position: relative;');
  
  const formLike = doc.createElementNS(XHTML_NS, 'div');
  formLike.setAttribute('class', 'msb-form');

  const input = doc.createElementNS(XHTML_NS, 'input');
  input.setAttribute('type', 'text');
  input.setAttribute('class', 'msb-input');
  input.setAttribute('placeholder', 'Explore visually…');
  input.setAttribute('autocomplete', 'off');
  input.setAttribute('data-central-search-input', 'true');
  
  if (opts.defaultValue) {
    input.setAttribute('value', opts.defaultValue);
  }

  const button = doc.createElementNS(XHTML_NS, 'button');
  button.setAttribute('type', 'button');
  button.setAttribute('class', 'msb-button');
  button.setAttribute('style', 'background: #3b82f6 !important; color: white !important; border: none !important; padding: 8px 16px !important; border-radius: 6px !important; cursor: pointer !important; font-weight: bold !important; pointer-events: auto !important; position: relative !important; z-index: 9999 !important; display: inline-block !important; visibility: visible !important; opacity: 1 !important;');
  button.setAttribute('tabindex', '0');
  button.setAttribute('role', 'button');
  button.textContent = 'Search';
  
  formLike.appendChild(input);
  formLike.appendChild(button);
  container.appendChild(formLike);
  fo.appendChild(container);

  // Make the entire foreignObject clickable
  fo.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('new search initiated');
    dispatchSubmit();
  };

  // Also add to button as backup
  button.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('new search initiated');
    dispatchSubmit();
  };

  // Test if button is actually in the DOM and visible
  setTimeout(() => {
    const rect = button.getBoundingClientRect();
    console.log('[central-search] Button position and size:', {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      visible: rect.width > 0 && rect.height > 0,
      top: rect.top,
      left: rect.left,
      bottom: rect.bottom,
      right: rect.right
    });
    
    // Log the actual values for debugging
    console.log('[central-search] Button actual size values:', {
      width: rect.width,
      height: rect.height,
      isVisible: rect.width > 0 && rect.height > 0
    });
    
    // Check if button is actually visible using different methods
    const isVisibleByStyle = window.getComputedStyle(button).display !== 'none' && 
                           window.getComputedStyle(button).visibility !== 'hidden' &&
                           window.getComputedStyle(button).opacity !== '0';
    
    console.log('[central-search] Button visibility check:', {
      getBoundingClientRect: { width: rect.width, height: rect.height },
      computedStyle: {
        display: window.getComputedStyle(button).display,
        visibility: window.getComputedStyle(button).visibility,
        opacity: window.getComputedStyle(button).opacity
      },
      isVisibleByStyle,
      buttonText: button.textContent,
      buttonParent: button.parentElement?.tagName
    });
    
    // Test if button can be focused
    try {
      button.focus();
      console.log('[central-search] Button can be focused:', document.activeElement === button);
    } catch (e) {
      console.log('[central-search] Button focus failed:', e);
    }

    // Check if button is actually clickable by testing pointer events
    const computedStyle = window.getComputedStyle(button);
    console.log('[central-search] Button computed styles:', {
      pointerEvents: computedStyle.pointerEvents,
      display: computedStyle.display,
      visibility: computedStyle.visibility,
      opacity: computedStyle.opacity,
      position: computedStyle.position,
      zIndex: computedStyle.zIndex
    });

    // Test if the foreignObject container is the issue
    const foreignObject = button.closest('foreignObject');
    if (foreignObject) {
      const foRect = foreignObject.getBoundingClientRect();
      const foStyle = window.getComputedStyle(foreignObject);
      console.log('[central-search] ForeignObject info:', {
        position: { x: foRect.x, y: foRect.y, width: foRect.width, height: foRect.height },
        pointerEvents: foStyle.pointerEvents,
        overflow: foStyle.overflow,
        display: foStyle.display
      });
      
      // Log the actual foreignObject attributes
      console.log('[central-search] ForeignObject attributes:', {
        x: foreignObject.getAttribute('x'),
        y: foreignObject.getAttribute('y'),
        width: foreignObject.getAttribute('width'),
        height: foreignObject.getAttribute('height')
      });
    }

    // Add manual test function to window for debugging
    (window as any).testCentralSearchButton = () => {
      console.log('[central-search] Manual test: Attempting to click button...');
      try {
        button.click();
        console.log('[central-search] Manual test: Click successful!');
      } catch (e) {
        console.log('[central-search] Manual test: Click failed:', e);
      }
    };
    
    console.log('[central-search] Manual test available: Run testCentralSearchButton() in console to test button click');
    
    // Add SVG-level click listener as fallback
    const svg = button.closest('svg');
    if (svg) {
      svg.addEventListener('click', (e) => {
        const fo = button.closest('foreignObject');
        if (fo) {
          const foRect = fo.getBoundingClientRect();
          const isInBounds = e.clientX >= foRect.left && e.clientX <= foRect.right && 
                           e.clientY >= foRect.top && e.clientY <= foRect.bottom;
          if (isInBounds) {
            e.stopPropagation();
            dispatchSubmit();
          }
        }
      });
    }
  }, 100);

  // Set initial value after DOM insertion
  setTimeout(() => {
    if (opts.defaultValue) {
      (input as HTMLInputElement).value = opts.defaultValue;
    }
  }, 0);

  // Dispatch custom events instead of calling callbacks directly
  const dispatchChange = () => {
    const value = (input as HTMLInputElement).value || '';
    console.log('[central-search] Dispatching change event with value:', value);
    window.dispatchEvent(new CustomEvent(CENTRAL_SEARCH_EVENT, {
      detail: { value }
    }));
  };

  const dispatchSubmit = () => {
    const value = (input as HTMLInputElement).value.trim();
    if (value) {
      console.log('[central-search] Dispatching submit event with value:', value);
      window.dispatchEvent(new CustomEvent(CENTRAL_SEARCH_SUBMIT_EVENT, {
        detail: { value }
      }));
    }
  };

  // Attach event listeners
  let inputTimeout: number | null = null;
  
  input.addEventListener('input', () => {
    // Debounce the input events slightly
    if (inputTimeout) clearTimeout(inputTimeout);
    inputTimeout = window.setTimeout(() => {
      dispatchChange();
    }, 50);
  });
  
  input.addEventListener('change', () => {
    dispatchChange();
  });
  
  input.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      dispatchSubmit();
    }
  });
  
  button.addEventListener('click', () => {
    dispatchSubmit();
  });

  // Add hover effects to make button more interactive
  button.addEventListener('mouseenter', () => {
    button.setAttribute('style', 'background: #1d4ed8 !important; color: white !important; border: none !important; padding: 8px 16px !important; border-radius: 6px !important; cursor: pointer !important; font-weight: bold !important; pointer-events: auto !important; position: relative !important; z-index: 9999 !important; display: inline-block !important; visibility: visible !important; opacity: 1 !important;');
  });

  button.addEventListener('mouseleave', () => {
    button.setAttribute('style', 'background: #3b82f6 !important; color: white !important; border: none !important; padding: 8px 16px !important; border-radius: 6px !important; cursor: pointer !important; font-weight: bold !important; pointer-events: auto !important; position: relative !important; z-index: 9999 !important; display: inline-block !important; visibility: visible !important; opacity: 1 !important;');
  });

  // Add keyboard event as fallback
  button.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      console.log('[central-search] Button activated via keyboard:', e.key);
      dispatchSubmit();
    }
  });

  return fo;
}

/**
 * Inject the search bar into node A
 */
export function injectSearchBarIntoNodeA(svg: SVGSVGElement, opts: InjectOptions = {}) {
  if (!svg) return;

  const nodeA = findNodeA(svg);
  if (!nodeA) return;

  // Remove existing if present
  const existing = nodeA.querySelector('foreignObject[data-search-bar]');
  if (existing) existing.parentElement?.removeChild(existing);

  const box = getNodeBox(nodeA);
  clearNodeVisuals(nodeA);

  const fo = buildSearchFO(svg.ownerDocument || document, box, opts);
  nodeA.appendChild(fo);
}

/**
 * Update the value of the central search input
 */
export function updateCentralSearchValue(svg: SVGSVGElement, value: string) {
  const input = svg.querySelector('input[data-central-search-input]') as HTMLInputElement;
  if (input && input.value !== value) {
    input.value = value;
  }
}

/**
 * Ensure the search bar exists and is synced
 */
export function ensureSearchBarInNodeA(svg: SVGSVGElement, opts: InjectOptions = {}) {
  if (!svg) return;
  const nodeA = findNodeA(svg);
  if (!nodeA) return;

  const existing = nodeA.querySelector('foreignObject[data-search-bar]');
  if (!existing) {
    // Not present - inject fresh
    const box = getNodeBox(nodeA);
    const fo = buildSearchFO(svg.ownerDocument || document, box, opts);
    clearNodeVisuals(nodeA);
    nodeA.appendChild(fo);
  } else {
    // Just update the value
    updateCentralSearchValue(svg, opts.defaultValue || '');
  }
}

/**
 * Remove the central node A completely from the SVG
 * This includes the node itself and all its connections
 */
export function removeCentralNodeA(svg: SVGSVGElement) {
  if (!svg) {
    console.log('[remove-node-a] No SVG provided');
    return;
  }

  console.log('[remove-node-a] Starting removal process...');
  console.log('[remove-node-a] SVG element:', svg);

  const nodeA = findNodeA(svg);
  if (!nodeA) {
    console.log('[remove-node-a] Node A not found in SVG');
    // Let's try to find all possible nodes to debug
    const allGroups = svg.querySelectorAll('g');
    console.log('[remove-node-a] All groups found:', allGroups.length);
    allGroups.forEach((group, index) => {
      console.log(`[remove-node-a] Group ${index}:`, {
        id: group.id,
        textContent: group.textContent?.trim(),
        className: group.className
      });
    });
    return;
  }

  console.log('[remove-node-a] Found node A:', nodeA);
  console.log('[remove-node-a] Node A details:', {
    id: nodeA.id,
    textContent: nodeA.textContent?.trim(),
    className: nodeA.className
  });

  // Find all connections/edges that involve node A
  const edges = svg.querySelectorAll('path[id*="flowchart-A"], path[id*="-A-"], .edge[id*="A"], path[id*="A-"], path[id*="-A"]');
  console.log(`[remove-node-a] Found ${edges.length} edges connected to node A`);
  
  // Remove all edges connected to node A
  edges.forEach((edge, index) => {
    console.log(`[remove-node-a] Removing edge ${index}:`, edge);
    edge.parentElement?.removeChild(edge);
  });

  // Remove the node A itself
  console.log('[remove-node-a] Removing node A itself...');
  nodeA.parentElement?.removeChild(nodeA);
  
  console.log('[remove-node-a] Successfully removed central node A and its connections');
}