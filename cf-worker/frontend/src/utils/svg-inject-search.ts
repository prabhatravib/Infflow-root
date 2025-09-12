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
  const fo = doc.createElementNS(SVG_NS, 'foreignObject');
  fo.setAttribute('x', String(box.x));
  fo.setAttribute('y', String(box.y));
  fo.setAttribute('width', String(Math.max(200, box.width)));
  fo.setAttribute('height', String(Math.max(40, box.height)));
  fo.setAttribute('data-search-bar', 'true');
  fo.setAttribute('data-export-exclude', '');
  fo.setAttribute('style', 'overflow: visible; pointer-events: auto;');

  const container = doc.createElementNS(XHTML_NS, 'div');
  container.setAttribute('xmlns', XHTML_NS);
  container.setAttribute('class', 'mermaid-search-bar');
  
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
  button.textContent = 'Search';
  
  formLike.appendChild(input);
  formLike.appendChild(button);
  container.appendChild(formLike);
  fo.appendChild(container);

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