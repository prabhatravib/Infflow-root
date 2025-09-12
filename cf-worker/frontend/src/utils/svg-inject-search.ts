/**
 * Inject a search bar into the SVG by replacing the visuals of node A
 * with an <foreignObject>. Keeps the outer <g> node and its transform
 * so edges remain intact.
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
 * Remove visual children of a node (rect, text, label, foreignObject, etc.)
 * but keep the outer <g> so links/edges stay attached.
 */
function clearNodeVisuals(node: SVGGElement) {
  const visuals = node.querySelectorAll('rect, text, .label, foreignObject, path, polygon, ellipse, circle');
  visuals.forEach(el => el.parentElement?.removeChild(el));
}

/**
 * Read node box from its primary rect if present, else fallback to bbox.
 * Returns coordinates in the node's local coordinate space.
 */
function getNodeBox(node: SVGGElement): { x: number; y: number; width: number; height: number } {
  const rect = node.querySelector('rect') as SVGRectElement | null;
  if (rect) {
    const width = Number(rect.getAttribute('width') || '0');
    const height = Number(rect.getAttribute('height') || '0');
    // Mermaid usually centers rects at (-w/2, -h/2)
    const xAttr = rect.getAttribute('x');
    const yAttr = rect.getAttribute('y');
    const x = xAttr !== null ? Number(xAttr) : -width / 2;
    const y = yAttr !== null ? Number(yAttr) : -height / 2;
    return { x, y, width, height };
  }

  // Fallback to bbox and center around (0,0)
  const bbox = node.getBBox();
  const width = bbox.width;
  const height = bbox.height;
  return { x: -width / 2, y: -height / 2, width, height };
}

/**
 * Build the foreignObject subtree with a minimal, theme-aware search bar.
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
  // Structure: wrapper div + input + button (avoid <form> to prevent navigation)
  const formLike = doc.createElementNS(XHTML_NS, 'div');
  formLike.setAttribute('class', 'msb-form');

  const input = doc.createElementNS(XHTML_NS, 'input');
  input.setAttribute('type', 'text');
  input.setAttribute('class', 'msb-input');
  input.setAttribute('placeholder', 'Explore visually…');
  input.setAttribute('autocomplete', 'off');
  if (opts.defaultValue) {
    // Set both attribute and property to ensure visible value and programmatic value match
    input.setAttribute('value', opts.defaultValue);
    try { (input as HTMLInputElement).value = opts.defaultValue; } catch {}
  }

  const button = doc.createElementNS(XHTML_NS, 'button');
  // Use explicit button type to avoid native form navigation
  button.setAttribute('type', 'button');
  button.setAttribute('class', 'msb-button');
  button.textContent = 'Search';
  
  formLike.appendChild(input);
  formLike.appendChild(button);
  container.appendChild(formLike);
  fo.appendChild(container);

  const triggerSubmit = () => {
    const val = (input as HTMLInputElement).value.trim();
    if (val && opts.onSubmit) {
      try {
        opts.onSubmit(val);
      } catch (err) {
        console.error('Search submit handler failed:', err);
      }
    }
  };
  // Hard-stop any accidental submit-like behaviors
  container.addEventListener('submit', (e: any) => {
    e.preventDefault();
    e.stopPropagation();
  }, true);
  // Intercept Enter key directly on the input
  input.addEventListener('keydown', (e: any) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      triggerSubmit();
    }
  });
  input.addEventListener('keypress', (e: any) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
    }
  });
  // Unified change handler across multiple events (input/change/keyup)
  const handleValueChange = (src?: any) => {
    try {
      const current = (input as HTMLInputElement).value || '';
      // Debug: surface event path and value for diagnosis
      try { console.debug('[central-search] value changed:', current, 'src:', src?.type); } catch {}

      if (opts.onChange) {
        try { opts.onChange(current); } catch (e) { console.error('onChange failed', e); }
      }
      // Also mirror into the URL immediately so the address bar updates live
      try {
        const url = new URL(window.location.href);
        if (current) url.searchParams.set('q', current); else url.searchParams.delete('q');
        // Do NOT force path during typing; only update query params
        window.history.replaceState(null, '', url.toString());
      } catch (uerr) {
        // ignore
      }
    } catch (err) {
      console.error('Search change handler failed:', err);
    }
  };

  // On value change, bubble to app state for sync
  input.addEventListener('input', (e: any) => handleValueChange(e));
  input.addEventListener('change', (e: any) => handleValueChange(e));
  input.addEventListener('keyup', (e: any) => {
    // ensure we read post-key value
    if (!e || e.key !== 'Enter') handleValueChange(e);
  });
  // Capture at container level as a safety net (some browsers retarget events inside foreignObject)
  container.addEventListener('input', (e: any) => handleValueChange(e), true);
  // And intercept button clicks
  button.addEventListener('click', (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    triggerSubmit();
  });

  return fo;
}

/**
 * Injects the search bar into node A. No-ops if not found.
 */
export function injectSearchBarIntoNodeA(svg: SVGSVGElement, opts: InjectOptions = {}) {
  if (!svg) return;

  const nodeA = findNodeA(svg);
  if (!nodeA) return;

  // If already injected, clear and re-inject to sync sizing/content
  const existing = nodeA.querySelector('foreignObject[data-search-bar]');
  if (existing) existing.parentElement?.removeChild(existing);

  const box = getNodeBox(nodeA);
  clearNodeVisuals(nodeA);

  const fo = buildSearchFO(svg.ownerDocument || document, box, opts);
  nodeA.appendChild(fo);
}

/**
 * Ensure the search bar exists; if present, just sync its value and callbacks
 * without tearing it down (prevents event loss while typing).
 */
export function ensureSearchBarInNodeA(svg: SVGSVGElement, opts: InjectOptions = {}) {
  if (!svg) return;
  const nodeA = findNodeA(svg);
  if (!nodeA) return;

  const existing = nodeA.querySelector('foreignObject[data-search-bar]');
  if (!existing) {
    // Not present — inject fresh
    const box = getNodeBox(nodeA);
    const fo = buildSearchFO(svg.ownerDocument || document, box, opts);
    nodeA.appendChild(fo);
    return;
  }

  // Already present — sync the input value
  try {
    const input = existing.querySelector('input.msb-input') as HTMLInputElement | null;
    if (input && typeof opts.defaultValue === 'string') {
      if (input.value !== opts.defaultValue) {
        input.value = opts.defaultValue;
        // Also reflect into URL via same logic
        try {
          const url = new URL(window.location.href);
          if (opts.defaultValue) url.searchParams.set('q', opts.defaultValue); else url.searchParams.delete('q');
          window.history.replaceState(null, '', url.toString());
        } catch {}
      }
    }
  } catch (e) {
    console.warn('ensureSearchBarInNodeA: failed to sync value', e);
  }
}

