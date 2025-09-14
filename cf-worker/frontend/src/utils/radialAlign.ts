type C = { panzoomElId?: string; alignElId?: string; barSelector?: string };

export function initRadialAlignment(cfg: C = {}) {
  const panzoomEl = document.getElementById(cfg.panzoomElId ?? 'radial-panzoom')!;
  const alignEl = document.getElementById(cfg.alignElId ?? 'radial-align')!;
  const barSel = cfg.barSelector ?? '#radial-stage-bar .search-bar';

  let ro: ResizeObserver | null = null;
  let mo: MutationObserver | null = null;
  let idleHandle: number | undefined;

  function getBarCenterPx() {
    const bar = document.querySelector<HTMLElement>(barSel);
    if (!bar) throw new Error('search bar not found: ' + barSel);
    const r = bar.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  function findRootA(svg: SVGSVGElement): SVGGElement | null {
    return (
      (svg.querySelector('g[id="A"]') as SVGGElement) ||
      (svg.querySelector('g#flowchart-A') as SVGGElement) ||
      (svg.querySelector('g.node[id$="-A"]') as SVGGElement) ||
      (svg.querySelector('g[data-id="A"]') as SVGGElement) ||
      (svg.querySelector('g[data-node-id="A"]') as SVGGElement)
    );
  }
  function getCenter(el: Element) {
    const b = el.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  }

  function alignNow() {
    const svg = panzoomEl.querySelector('svg') as SVGSVGElement | null;
    if (!svg) return;
    const root = findRootA(svg);
    if (!root) return;

    const barC = getBarCenterPx();
    const rootC = getCenter(root);
    const dx = barC.x - rootC.x;
    const dy = barC.y - rootC.y;

    alignEl.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  function scheduleAlign() {
    // Let Mermaid/layout settle
    requestAnimationFrame(() => requestAnimationFrame(alignNow));
  }

  // Observe when Mermaid injects/updates the SVG
  mo = new MutationObserver(() => {
    scheduleAlign();
    const svg = panzoomEl.querySelector('svg') as SVGSVGElement | null;
    if (svg) {
      ro?.disconnect();
      ro = new ResizeObserver(() => scheduleAlign());
      ro.observe(svg);
    }
  });
  mo.observe(panzoomEl, { childList: true, subtree: true });

  // Realign on viewport/layout changes
  window.addEventListener('resize', scheduleAlign);
  window.addEventListener('orientationchange', scheduleAlign);
  if ('fonts' in document) (document as any).fonts.addEventListener('loadingdone', scheduleAlign);

  // Realign shortly after pan/zoom ends (works with native wheel/pointer)
  ['pointerup', 'wheel'].forEach(evt => {
    panzoomEl.addEventListener(evt, () => {
      clearTimeout(idleHandle);
      idleHandle = window.setTimeout(scheduleAlign, 120);
    });
  });

  // Run once in case content already mounted
  scheduleAlign();

  // Export helpers (optional): hide bar & reset transform for clean PNG
  function beforeExport() {
    const bar = document.querySelector<HTMLElement>(barSel);
    if (bar) bar.style.visibility = 'hidden';
    alignEl.style.transform = '';
  }
  function afterExport() {
    const bar = document.querySelector<HTMLElement>(barSel);
    if (bar) bar.style.visibility = '';
    scheduleAlign();
  }

  function destroy() {
    mo?.disconnect();
    ro?.disconnect();
    window.removeEventListener('resize', scheduleAlign);
    window.removeEventListener('orientationchange', scheduleAlign);
    if ('fonts' in document) (document as any).fonts.removeEventListener('loadingdone', scheduleAlign);
  }

  return { alignNow, scheduleAlign, beforeExport, afterExport, destroy };
}
