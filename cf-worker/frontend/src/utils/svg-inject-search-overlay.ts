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
function createSearchOverlay(
  doc: Document,
  svg: SVGSVGElement,
  _container: HTMLElement, // kept for signature stability; not used now
  box: { x: number; y: number; width: number; height: number },
  opts: InjectOptions
) {
  // Create HTML overlay
  const overlay = doc.createElement('div');

  // Helper to compute overlay position centered over node A
  const positionOverlay = () => {
    const nodeRect = (svg.querySelector('[data-id="A"]') || svg) as Element;
    const nodeBBox = (nodeRect as any).getBoundingClientRect();
    const overlayWidth = 280;
    const overlayHeight = 40;

    // Fixed positioning relative to viewport to avoid React DOM wipes
    const left = nodeBBox.left + nodeBBox.width / 2 - overlayWidth / 2;
    const top = nodeBBox.top + nodeBBox.height / 2 - overlayHeight / 2;

    overlay.style.left = `${Math.round(left)}px`;
    overlay.style.top = `${Math.round(top)}px`;
    overlay.style.width = `${overlayWidth}px`;
    overlay.style.height = `${overlayHeight}px`;

    // Debug
    console.log('[central-search] Overlay positioned:', {
      nodeBBox: {
        left: nodeBBox.left,
        top: nodeBBox.top,
        width: nodeBBox.width,
        height: nodeBBox.height,
      },
      final: { left: overlay.style.left, top: overlay.style.top },
    });
  };

  // Base overlay styles
  overlay.style.cssText = `
    position: fixed;
    display: flex;
    gap: 8px;
    align-items: center;
    z-index: 10000;
    pointer-events: auto;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 14px rgba(0,0,0,0.12);
    padding: 6px;
    border: 2px solid #3b82f6;
  `;
  overlay.setAttribute('data-export-exclude', '');

  const input = doc.createElement('input');
  input.type = 'text';
  input.placeholder = 'Explore visually…';
  input.value = opts.defaultValue || '';
  input.style.cssText = `
    flex: 1;
    padding: 8px 10px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 13px;
    outline: none;
    background: white;
  `;

  const button = doc.createElement('button');
  button.textContent = 'Search';
  button.style.cssText = `
    background: #3b82f6;
    color: white;
    border: none;
    padding: 8px 14px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
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

  // Initial position
  positionOverlay();

  // Reposition on resize/scroll (and slight delay after layout)
  const reposition = () => requestAnimationFrame(positionOverlay);
  window.addEventListener('resize', reposition);
  window.addEventListener('scroll', reposition, true);

  // Mutation observer to adjust if the SVG layout changes
  const mo = new MutationObserver(() => reposition());
  mo.observe(svg, { attributes: true, childList: true, subtree: true });

  // Cleanup hook if removed
  overlay.addEventListener('DOMNodeRemoved', () => {
    window.removeEventListener('resize', reposition);
    window.removeEventListener('scroll', reposition, true);
    mo.disconnect();
  });

  return overlay;
}

/**
 * Find the central node (node A) in the SVG
 */
function findNodeA(svg: SVGSVGElement): Element | null {
  const selectors = [
    '[data-id="A"]',
    'g[id^="flowchart-A"]',
    '#A',
    '.node#A',
    '.node[id*="-A"], [id$="-A"]'
  ];
  for (const sel of selectors) {
    const el = svg.querySelector(sel);
    if (el) return el;
  }
  return null;
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

  const nodeA = findNodeA(svg);
  if (!nodeA) {
    console.log('[central-search] Node A not found');
    // If there's an existing overlay, keep it instead of removing
    return document.querySelector('.central-search-overlay') as HTMLElement | null;
  }

  const box = getNodeBox(nodeA);
  const container = (svg.parentElement?.parentElement as HTMLElement) || (svg.parentElement as HTMLElement) || undefined;
  const existingOverlay = document.querySelector('.central-search-overlay');
  const overlay = createSearchOverlay(svg.ownerDocument, svg, container || (svg.parentElement as HTMLElement), box, opts);

  // Add to the SVG's parent container
  overlay.className = 'central-search-overlay';
  // Append to document body so React re-renders of Mermaid container don't remove it
  document.body.appendChild(overlay);

  // Remove the old overlay now that the new one exists
  if (existingOverlay && existingOverlay !== overlay) {
    try { existingOverlay.remove(); } catch {}
  }
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
