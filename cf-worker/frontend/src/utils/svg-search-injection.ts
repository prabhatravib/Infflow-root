/**
 * Search bar creation and injection functionality for SVG elements.
 * Handles building the search bar UI and injecting it into SVG nodes.
 */

import { dispatchCentralSearchChange, dispatchCentralSearchSubmit } from './svg-search-events';
import { findNodeA, clearNodeVisuals, getNodeBox, updateCentralSearchValue, SVG_NAMESPACES } from './svg-search-dom';

export type InjectOptions = {
  /** Initial value for the input */
  defaultValue?: string;
  /** Called when user submits (press Enter or clicks button) */
  onSubmit?: (query: string) => void;
  /** Called on each input change (for URL/state sync) */
  onChange?: (query: string) => void;
};

/**
 * Build the foreignObject with search bar
 */
function buildSearchFO(doc: Document, box: { x: number; y: number; width: number; height: number }, opts: InjectOptions) {
  // Create SVG foreignObject
  const fo = doc.createElementNS(SVG_NAMESPACES.SVG, 'foreignObject');
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

  const container = doc.createElementNS(SVG_NAMESPACES.XHTML, 'div');
  container.setAttribute('xmlns', SVG_NAMESPACES.XHTML);
  container.setAttribute('class', 'mermaid-search-bar');
  container.setAttribute('style', 'display: flex; align-items: center; gap: 8px; padding: 4px; pointer-events: auto; z-index: 1001; position: relative;');
  
  const formLike = doc.createElementNS(SVG_NAMESPACES.XHTML, 'div');
  formLike.setAttribute('class', 'msb-form');

  const input = doc.createElementNS(SVG_NAMESPACES.XHTML, 'input');
  input.setAttribute('type', 'text');
  input.setAttribute('class', 'msb-input');
  input.setAttribute('placeholder', 'Explore visually…');
  input.setAttribute('autocomplete', 'off');
  input.setAttribute('data-central-search-input', 'true');
  
  if (opts.defaultValue) {
    input.setAttribute('value', opts.defaultValue);
  }

  const button = doc.createElementNS(SVG_NAMESPACES.XHTML, 'button');
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
    dispatchCentralSearchSubmit((input as HTMLInputElement).value.trim());
  };

  // Also add to button as backup
  button.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('new search initiated');
    dispatchCentralSearchSubmit((input as HTMLInputElement).value.trim());
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
            dispatchCentralSearchSubmit((input as HTMLInputElement).value.trim());
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

  // Attach event listeners
  let inputTimeout: number | null = null;
  
  input.addEventListener('input', () => {
    // Debounce the input events slightly
    if (inputTimeout) clearTimeout(inputTimeout);
    inputTimeout = window.setTimeout(() => {
      dispatchCentralSearchChange((input as HTMLInputElement).value || '');
    }, 50);
  });
  
  input.addEventListener('change', () => {
    dispatchCentralSearchChange((input as HTMLInputElement).value || '');
  });
  
  input.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      dispatchCentralSearchSubmit((input as HTMLInputElement).value.trim());
    }
  });
  
  button.addEventListener('click', () => {
    dispatchCentralSearchSubmit((input as HTMLInputElement).value.trim());
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
      dispatchCentralSearchSubmit((input as HTMLInputElement).value.trim());
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