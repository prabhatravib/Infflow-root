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

  const findANode = () => {
    const svg = svgRef.current;
    if (!svg) {
      console.log('🔍 RadialSearchOverlay: No SVG ref');
      return null;
    }

    console.log('🔍 RadialSearchOverlay: Searching for node A, lastQuery:', lastQuery);

    // Try multiple selectors for node A
    let node: SVGGElement | null =
      (svg.querySelector('g[id^="flowchart-A"]') as SVGGElement) ||
      (svg.querySelector('[data-id="A"]') as SVGGElement) ||
      (svg.querySelector('[id$="-A"]') as SVGGElement) ||
      (svg.querySelector('#A') as SVGGElement) ||
      (svg.querySelector('[id*="A"]') as SVGGElement);

    console.log('🔍 RadialSearchOverlay: Found by ID:', node);
    
    // Also try to find by class or other attributes
    if (!node) {
      node = svg.querySelector('.node[id*="A"]') as SVGGElement;
      console.log('🔍 RadialSearchOverlay: Found by class+ID:', node);
    }

    // Fallback: label text equals lastQuery
    if (!node) {
      const allGroups = Array.from(svg.querySelectorAll('g'));
      console.log('🔍 RadialSearchOverlay: All groups:', allGroups.length);
      
      node = allGroups.find(
        el => (el.textContent || '').trim() === lastQuery.trim()
      ) as SVGGElement | null;
      
      console.log('🔍 RadialSearchOverlay: Found by text:', node);
    }
    
    if (node) {
      console.log('🔍 RadialSearchOverlay: Node A found:', node.textContent);
    } else {
      console.log('🔍 RadialSearchOverlay: No node A found');
    }
    
    return node;
  };

  // Hide node A in the SVG (keeps layout)
  useEffect(() => {
    if (!enabled || !svgRef.current) return;
    
    const hideNodeA = () => {
      const nodeA = findANode();
      if (nodeA) {
        nodeA.querySelectorAll('rect, .label, text, foreignObject').forEach(el => {
          (el as HTMLElement).style.opacity = "0";
        });
      }
    };

    hideNodeA();
    
    // Also hide on mutations
    const observer = new MutationObserver(hideNodeA);
    observer.observe(svgRef.current, { childList: true, subtree: true, attributes: true });
    
    return () => {
      observer.disconnect();
      // Restore visuals when unmounting
      const nodeA = findANode();
      if (nodeA) {
        nodeA.querySelectorAll('rect, .label, text, foreignObject').forEach(el => {
          (el as HTMLElement).style.opacity = "1";
        });
      }
    };
  }, [enabled, svgRef.current, lastQuery]);

  useEffect(() => {
    if (!enabled || !hostRef.current || !svgRef.current || !overlayRef.current) return;

    const position = () => {
      const host = hostRef.current!;
      const overlay = overlayRef.current!;
      const nodeA = findANode();
      
      console.log('🔍 RadialSearchOverlay: position() called, nodeA:', !!nodeA);
      
      if (!nodeA) {
        console.log('🔍 RadialSearchOverlay: No nodeA found in position()');
        return;
      }
      
      const nodeRect = nodeA.getBoundingClientRect();
      const hostRect = host.getBoundingClientRect();
      
      console.log('🔍 RadialSearchOverlay: nodeRect:', nodeRect);
      console.log('🔍 RadialSearchOverlay: hostRect:', hostRect);
      
      // Position overlay relative to host container
      const left = nodeRect.left - hostRect.left;
      const top = nodeRect.top - hostRect.top;
      
      console.log('🔍 RadialSearchOverlay: Calculated position - left:', left, 'top:', top, 'width:', nodeRect.width, 'height:', nodeRect.height);
      
      overlay.style.left = `${left}px`;
      overlay.style.top = `${top}px`;
      overlay.style.width = `${nodeRect.width}px`;
      overlay.style.height = `${nodeRect.height}px`;
      
      // Update bar width to match node width (ensure minimum width)
      const width = Math.max(nodeRect.width, 200);
      setBarWidth(width);
      
      console.log('🔍 RadialSearchOverlay: Overlay positioned with width:', width);
    };

    // Set up observers
    const roHost = new ResizeObserver(position);
    const roSvg = new ResizeObserver(position);
    
    roHost.observe(hostRef.current);
    roSvg.observe(svgRef.current);

    const mo = new MutationObserver(position);
    mo.observe(svgRef.current, { attributes: true, childList: true, subtree: true });

    // Event listeners
    window.addEventListener("resize", position);
    window.visualViewport?.addEventListener("resize", position);

    // Initial positioning
    position();
    
    return () => {
      roHost.disconnect();
      roSvg.disconnect();
      mo.disconnect();
      window.removeEventListener("resize", position);
      window.visualViewport?.removeEventListener("resize", position);
    };
  }, [enabled, lastQuery]);

  // Immediate positioning after render
  useLayoutEffect(() => {
    if (!enabled || !hostRef.current || !svgRef.current || !overlayRef.current) return;
    
    const position = () => {
      const host = hostRef.current!;
      const overlay = overlayRef.current!;
      const nodeA = findANode();
      
      if (!nodeA) return;
      
      const nodeRect = nodeA.getBoundingClientRect();
      const hostRect = host.getBoundingClientRect();
      
      const left = nodeRect.left - hostRect.left;
      const top = nodeRect.top - hostRect.top;
      
      overlay.style.left = `${left}px`;
      overlay.style.top = `${top}px`;
      overlay.style.width = `${nodeRect.width}px`;
      overlay.style.height = `${nodeRect.height}px`;
      
      const width = Math.max(nodeRect.width, 200);
      setBarWidth(width);
    };
    
    position();
  }, [enabled, lastQuery]);

  if (!enabled) {
    console.log('🔍 RadialSearchOverlay: Not enabled, returning null');
    return null;
  }

  console.log('🔍 RadialSearchOverlay: Rendering overlay with barWidth:', barWidth);

  return (
    <div
      ref={overlayRef}
      className="absolute z-50"
      data-export-exclude
      aria-hidden={false}
      style={{ 
        pointerEvents: "auto",
        minWidth: "200px",
        minHeight: "40px",
        backgroundColor: "rgba(255, 255, 255, 0.1)", // Temporary background for debugging
        border: "2px solid red" // Temporary border for debugging
      }}
    >
      <SearchBar
        size="compact"
        width={barWidth}
        defaultValue={lastQuery}
        onSubmit={onSubmit}
        autoFocus={false}
      />
    </div>
  );
}
