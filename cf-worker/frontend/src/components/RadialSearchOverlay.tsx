import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { SearchBar } from "./SearchBar";

type Props = {
  enabled: boolean;                 // true only for radial
  svgRef: React.RefObject<SVGSVGElement>;
  hostRef: React.RefObject<HTMLElement>; // the positioned wrapper around the SVG
  lastQuery: string;
  onSubmit: (q: string) => void;    // same handler as normal search
};

export default function RadialSearchOverlay({ enabled, svgRef, hostRef, lastQuery, onSubmit }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [barWidth, setBarWidth] = useState<number>(360);

  console.log('🔍 RadialSearchOverlay: Component rendered, enabled:', enabled, 'lastQuery:', lastQuery);

  const findRoot = () => {
    const svg = svgRef.current;
    if (!svg) {
      console.log('🔍 RadialSearchOverlay: No SVG ref');
      return null;
    }

    console.log('🔍 RadialSearchOverlay: Searching for root node, lastQuery:', lastQuery);

    // 1) try Mermaid's common id forms for node A
    let g: SVGGElement | null =
      (svg.querySelector('[data-id="A"]') as SVGGElement) ||
      (svg.querySelector('[id$="-A"]') as SVGGElement) ||
      (svg.querySelector('#A') as SVGGElement) ||
      (svg.querySelector('[id*="A"]') as SVGGElement);

    console.log('🔍 RadialSearchOverlay: Found by ID:', g);
    
    // Also try to find by class or other attributes
    if (!g) {
      g = svg.querySelector('.node[id*="A"]') as SVGGElement;
      console.log('🔍 RadialSearchOverlay: Found by class+ID:', g);
    }

    // 2) fallback: label text equals lastQuery
    if (!g) {
      const allGroups = Array.from(svg.querySelectorAll('g'));
      console.log('🔍 RadialSearchOverlay: All groups:', allGroups.length);
      
      // Log all group IDs and text content for debugging
      allGroups.forEach((group, index) => {
        console.log(`🔍 RadialSearchOverlay: Group ${index}:`, {
          id: group.id,
          className: group.className,
          textContent: group.textContent?.trim(),
          tagName: group.tagName
        });
      });
      
      g = allGroups.find(
        el => (el.textContent || '').trim() === lastQuery.trim()
      ) as SVGGElement | null;
      
      console.log('🔍 RadialSearchOverlay: Found by text:', g);
    }
    
    if (g) {
      console.log('🔍 RadialSearchOverlay: Root node found:', g.textContent);
    } else {
      console.log('🔍 RadialSearchOverlay: No root node found');
    }
    
    return g;
  };

  const hideRootVisuals = (g: SVGGElement | null, hide: boolean) => {
    if (!g) return;
    g.querySelectorAll('rect, text, foreignObject').forEach(el => {
      (el as SVGElement).style.opacity = hide ? "0" : "1";
    });
  };

  const place = () => {
    console.log('🔍 RadialSearchOverlay: place() called, enabled:', enabled, 'overlayRef:', !!overlayRef.current, 'hostRef:', !!hostRef.current);
    
    if (!enabled || !overlayRef.current || !hostRef.current) {
      console.log('🔍 RadialSearchOverlay: place() early return');
      return;
    }

    const svg = svgRef.current;
    const hostRect = hostRef.current.getBoundingClientRect();
    const root = findRoot();
    
    console.log('🔍 RadialSearchOverlay: place() - svg:', !!svg, 'root:', !!root);
    
    if (!svg || !root) {
      console.log('🔍 RadialSearchOverlay: place() - missing svg or root');
      return;
    }

    // keep edges intact but hide the node visuals
    hideRootVisuals(root, true);

    // measure in CSS pixels (no pan/zoom used)
    const r = (root as any).getBoundingClientRect();
    const cx = r.left - hostRect.left + r.width / 2;
    const cy = r.top - hostRect.top + r.height / 2;

    const barWrap = overlayRef.current.querySelector<HTMLElement>("[data-bar]");
    if (!barWrap) return;

    // match bar width to node width (desktop only per requirement)
    setBarWidth(r.width);
    // position
    barWrap.style.left = `${Math.round(cx - r.width / 2)}px`;
    barWrap.style.top = `${Math.round(cy - barWrap.offsetHeight / 2)}px`;
  };

  useLayoutEffect(() => { if (enabled) requestAnimationFrame(place); }, [enabled, lastQuery]);

  useEffect(() => {
    if (!enabled) return;
    const onResize = () => place();
    window.addEventListener("resize", onResize);

    // react to mermaid re-render
    const obs = new MutationObserver(place);
    if (svgRef.current) obs.observe(svgRef.current, { childList: true, subtree: true, attributes: true });

    return () => {
      window.removeEventListener("resize", onResize);
      obs.disconnect();
      // restore visuals if we unmount
      hideRootVisuals(findRoot(), false);
    };
  }, [enabled, svgRef.current]);

  if (!enabled) {
    console.log('🔍 RadialSearchOverlay: Not enabled, returning null');
    return null;
  }

  console.log('🔍 RadialSearchOverlay: Rendering overlay with barWidth:', barWidth);

  return (
    <div
      ref={overlayRef}
      className="radial-overlay"
      style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 5, filter: "drop-shadow(0 0 6px rgba(255,255,255,0.9))" }}
    >
      <div data-bar style={{ position: "absolute", pointerEvents: "auto" }}>
        <SearchBar
          size="compact"                // your "results page" style
          width={barWidth}              // match node width
          defaultValue={lastQuery}
          onSubmit={onSubmit}
          autoFocus={false}
        />
      </div>
    </div>
  );
}
