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
  if (!rootNode) return;

  const searchBar = document.querySelector('[data-central-search-bar]');
  if (!searchBar) return;

  const hostRect = hostEl.getBoundingClientRect();
  const searchRect = (searchBar as HTMLElement).getBoundingClientRect();
  const targetScreen = {
    x: searchRect.left + searchRect.width / 2,
    y: searchRect.top + searchRect.height / 2,
  };

  // Current screen matrix for user→screen. Fallback to identity-like if missing
  const screenCTM = (svg as any).getScreenCTM?.();
  if (!screenCTM) return;
  const inv = screenCTM.inverse();

  // Compute root center in user coords via element bbox
  const rootBBox = (rootNode as any).getBBox();
  const rootCenterUser = {
    x: rootBBox.x + rootBBox.width / 2,
    y: rootBBox.y + rootBBox.height / 2,
  };

  // Compute content bbox in screen space to deduce extents and current size
  const contentBBox = (wrapper as any).getBBox();
  const cornersUser = [
    { x: contentBBox.x, y: contentBBox.y },
    { x: contentBBox.x + contentBBox.width, y: contentBBox.y },
    { x: contentBBox.x, y: contentBBox.y + contentBBox.height },
    { x: contentBBox.x + contentBBox.width, y: contentBBox.y + contentBBox.height },
  ];
  const cornersScreen = cornersUser.map((p) => new DOMPoint(p.x, p.y).matrixTransform(screenCTM));
  const contentScreenLeft = Math.min(...cornersScreen.map((p) => p.x));
  const contentScreenRight = Math.max(...cornersScreen.map((p) => p.x));
  const contentScreenTop = Math.min(...cornersScreen.map((p) => p.y));
  const contentScreenBottom = Math.max(...cornersScreen.map((p) => p.y));
  const contentWidthScreen = contentScreenRight - contentScreenLeft;
  const contentHeightScreen = contentScreenBottom - contentScreenTop;

  // Root center in screen space
  const rootCenterScreen = new DOMPoint(rootCenterUser.x, rootCenterUser.y).matrixTransform(screenCTM);

  // Extents from root to each side in screen space
  const EPS = 0.001;
  const dxLeft = Math.max(EPS, rootCenterScreen.x - contentScreenLeft);
  const dxRight = Math.max(EPS, contentScreenRight - rootCenterScreen.x);
  const dyTop = Math.max(EPS, rootCenterScreen.y - contentScreenTop);
  const dyBottom = Math.max(EPS, contentScreenBottom - rootCenterScreen.y);

  // Available space from target to host edges with padding
  const padX = Math.max(0, hostRect.width * paddingPercent);
  const padY = Math.max(0, hostRect.height * paddingPercent);

  const avLeft = Math.max(EPS, (targetScreen.x - (hostRect.left + padX)));
  const avRight = Math.max(EPS, ((hostRect.right - padX) - targetScreen.x));
  const avTop = Math.max(EPS, (targetScreen.y - (hostRect.top + padY)));
  const avBottom = Math.max(EPS, ((hostRect.bottom - padY) - targetScreen.y));

  // Fit scale w.r.t. each side from root alignment perspective; do not upscale beyond 1
  const scaleBySides = Math.min(
    avLeft / dxLeft,
    avRight / dxRight,
    avTop / dyTop,
    avBottom / dyBottom,
    1
  );
  const scale = Math.max(minScale, scaleBySides);

  // Compute target in user space and apply transform: translate(tx,ty) scale(s)
  const targetUser = new DOMPoint(targetScreen.x, targetScreen.y).matrixTransform(inv);
  const tx = targetUser.x - scale * rootCenterUser.x;
  const ty = targetUser.y - scale * rootCenterUser.y;

  wrapper.setAttribute('transform', `translate(${tx}, ${ty}) scale(${scale})`);
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
