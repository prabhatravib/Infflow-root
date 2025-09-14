/**
 * Align a radial (flowchart-style) diagram so that the central node (A)
 * sits directly under the sticky header search bar, while keeping the
 * entire diagram visible within the host container with percentage padding.
 *
 * - Applies a wrapper <g> transform preserved by SVG→PNG export
 * - Recomputes on resize/scroll and DOM mutations
 */

export interface RadialAlignOptions {
  paddingPercent?: number; // e.g., 0.05 for 5%
  minScale?: number;       // e.g., 0.6
}

/**
 * Public API: sets up alignment and returns a cleanup function
 */
export function setupRadialAlignment(
  svg: SVGSVGElement,
  hostEl: HTMLElement,
  opts: RadialAlignOptions = {}
): () => void {
  const paddingPercent = opts.paddingPercent ?? 0.05;
  const minScale = opts.minScale ?? 0.6;

  const wrapper = ensureWrapper(svg);

  const align = () => requestAnimationFrame(() => {
    try {
      realign(svg, hostEl, wrapper, paddingPercent, minScale);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[radial-align] alignment failed:', e);
    }
  });

  // Initial attempts (handle late font/layout)
  align();
  setTimeout(align, 50);
  setTimeout(align, 150);
  // After fonts load (if supported)
  (document as any).fonts?.ready?.then?.(() => align());

  // Observers and listeners
  const roHost = new ResizeObserver(() => align());
  roHost.observe(hostEl);
  const roSvg = new ResizeObserver(() => align());
  roSvg.observe(svg);

  const mo = new MutationObserver(() => align());
  mo.observe(svg, { attributes: true, childList: true, subtree: true });

  const onResize = () => align();
  const onScroll = () => align();
  window.addEventListener('resize', onResize);
  window.addEventListener('scroll', onScroll, true);

  return () => {
    try {
      roHost.disconnect();
      roSvg.disconnect();
      mo.disconnect();
    } catch {}
    window.removeEventListener('resize', onResize);
    window.removeEventListener('scroll', onScroll, true);
  };
}

/** Find or create a wrapper <g> used to apply alignment transform */
function ensureWrapper(svg: SVGSVGElement): SVGGElement {
  const NS = 'http://www.w3.org/2000/svg';
  let wrapper = svg.querySelector('#infflow-align-wrapper') as SVGGElement | null;
  if (wrapper) return wrapper;

  wrapper = document.createElementNS(NS, 'g');
  wrapper.setAttribute('id', 'infflow-align-wrapper');

  // Move all children except <defs> and the wrapper itself under the wrapper
  const toMove: ChildNode[] = [];
  svg.childNodes.forEach((n) => {
    if (n === wrapper) return;
    if ((n as Element).tagName && (n as Element).tagName.toLowerCase() === 'defs') return;
    toMove.push(n);
  });
  // Append wrapper first, just after any <defs>
  const defs = svg.querySelector('defs');
  if (defs && defs.nextSibling) {
    svg.insertBefore(wrapper, defs.nextSibling);
  } else if (defs) {
    svg.appendChild(wrapper);
  } else {
    svg.appendChild(wrapper);
  }
  toMove.forEach((n) => wrapper!.appendChild(n));
  return wrapper!;
}

/** Recompute and apply transform to keep root under sticky search and fit to host */
function realign(
  svg: SVGSVGElement,
  hostEl: HTMLElement,
  wrapper: SVGGElement,
  paddingPercent: number,
  minScale: number
) {
  const rootNode = findRootNode(svg);
  const bar = document.querySelector('[data-central-search-bar]') as HTMLElement;
  if (!rootNode || !bar) return;

  // viewport inside the host
  const hostRect = hostEl.getBoundingClientRect();
  const vpW = hostRect.width;
  const vpH = hostRect.height;

  // content bbox (wrapper space)
  const content = (wrapper as any).getBBox();
  const padW = content.width * paddingPercent;
  const padH = content.height * paddingPercent;
  const scale = Math.max(
    minScale,
    Math.min((vpW) / (content.width + 2 * padW), (vpH) / (content.height + 2 * padH))
  );

  // root center (wrapper space)
  const r = (rootNode as any).getBBox();
  const rootCenter = { x: r.x + r.width / 2, y: r.y + r.height / 2 };

  // target point: center of the fixed overlay (screen space) → wrapper space
  const targetScreen = {
    x: bar.getBoundingClientRect().left + bar.offsetWidth / 2,
    y: bar.getBoundingClientRect().top + bar.offsetHeight / 2
  };
  const toWrapper = (wrapper.getScreenCTM() as DOMMatrix).inverse();
  const target = new DOMPoint(targetScreen.x, targetScreen.y).matrixTransform(toWrapper);

  // include scale in the translation
  const tx = target.x - rootCenter.x * scale;
  const ty = target.y - rootCenter.y * scale;

  wrapper.setAttribute('transform', `matrix(${scale} 0 0 ${scale} ${tx} ${ty})`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.removeAttribute('viewBox'); // avoid Mermaid auto-fit fighting us
}

/** Attempt to find the central root node (A) */
function findRootNode(svg: SVGSVGElement): Element | null {
  const selectors = [
    '[data-id="A"]',
    'g[id^="flowchart-A"]',
    '#A',
    '.node#A',
    '.node[id*="-A"], [id$="-A"]',
  ];
  for (const sel of selectors) {
    const el = svg.querySelector(sel);
    if (el) return el;
  }
  return null;
}
