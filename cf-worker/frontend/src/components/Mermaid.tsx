import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

// Central Search Bar Component
interface CentralSearchBarProps {
  onSearch: (e: React.FormEvent) => void;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  containerRef: React.RefObject<HTMLDivElement>;
}

const CentralSearchBar: React.FC<CentralSearchBarProps> = ({
  onSearch,
  searchQuery,
  setSearchQuery,
  containerRef
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isVisible, setIsVisible] = useState(false);
  
  // Debug visibility changes
  useEffect(() => {
    console.log('🔍 CentralSearchBar visibility changed:', isVisible, 'position:', position);
  }, [isVisible, position]);

  useEffect(() => {
    const updatePosition = () => {
      console.log('🔍 CentralSearchBar updatePosition called');
      if (!containerRef.current) {
        console.log('❌ No container ref');
        return;
      }

      const centralNode = (containerRef.current as any).centralNode;
      console.log('🎯 Central node:', !!centralNode);
      
      if (centralNode) {
        const rect = centralNode.querySelector('rect');
        console.log('📦 Rect found:', !!rect);
        
        if (rect) {
          const svg = containerRef.current.querySelector('svg');
          console.log('🖼️ SVG found:', !!svg);
          
          if (svg) {
            const svgRect = svg.getBoundingClientRect();
            const nodeRect = rect.getBoundingClientRect();
            
            // Calculate position relative to the container
            const x = nodeRect.left - svgRect.left;
            const y = nodeRect.top - svgRect.top;
            const width = nodeRect.width;
            const height = nodeRect.height;
            
            console.log('📐 Position calculated:', { x, y, width, height });
            
            // Only show if we have valid dimensions
            if (width > 0 && height > 0) {
              setPosition({ x, y, width, height });
              setIsVisible(true);
              console.log('✅ Search bar should now be visible with position:', { x, y, width, height });
            } else {
              console.log('❌ Invalid dimensions, not showing search bar');
            }
          }
        }
      } else {
        console.log('❌ No central node found');
      }
    };

    // Listen for the custom diagram loaded event - this is the reliable way
    const handleDiagramLoaded = () => {
      updatePosition();
    };
    
    if (containerRef.current) {
      containerRef.current.addEventListener('diagramLoaded', handleDiagramLoaded);
    }
    
    // Also update on window resize
    window.addEventListener('resize', updatePosition);
    
    // Fallback: try once after a short delay in case the event doesn't fire
    const fallbackTimer = setTimeout(updatePosition, 100);
    
    return () => {
      clearTimeout(fallbackTimer);
      if (containerRef.current) {
        containerRef.current.removeEventListener('diagramLoaded', handleDiagramLoaded);
      }
      window.removeEventListener('resize', updatePosition);
    };
  }, [containerRef]);

  if (!isVisible) {
    console.log('🔍 CentralSearchBar not visible, position:', position);
    return null;
  }

  return (
    <div
      className="absolute pointer-events-auto z-50"
      data-central-search-bar
      style={{
        left: position.x,
        top: position.y,
        width: position.width,
        height: position.height,
        zIndex: 10000,
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
    >
      <form onSubmit={onSearch} className="w-full h-full flex items-center justify-center">
        <div className="flex items-center bg-blue-50 dark:bg-blue-900 rounded-lg border-2 border-blue-300 dark:border-blue-600 shadow-xl hover:shadow-2xl transition-all duration-300 backdrop-blur-sm w-full h-full min-w-[200px]">
          <input
            type="text"
            value={searchQuery || ''}
            onChange={(e) => setSearchQuery?.(e.target.value)}
            placeholder="Search..."
            className="flex-1 px-3 py-2 bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm focus:ring-0"
          />
          <button
            type="submit"
            className="p-2 mr-1 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-3 h-3 text-white dark:text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
};

type Props = {
  code: string;
  className?: string;
  onSetupSelection?: (container: HTMLElement) => void;
  onCentralSearch?: (query: string) => void;
  centralSearchQuery?: string;
  setCentralSearchQuery?: (query: string) => void;
  diagramType?: string;
};

export default function Mermaid({ 
  code, 
  className, 
  onSetupSelection, 
  onCentralSearch, 
  centralSearchQuery, 
  setCentralSearchQuery,
  diagramType
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [isRadialDiagram, setIsRadialDiagram] = useState(false);
  const [isDiagramLoaded, setIsDiagramLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    // Reset diagram loaded state when code changes
    setIsDiagramLoaded(false);
    
    // Check if this is a radial flowchart using the API response
    // Both 'radial_mindmap' and 'flowchart' can be radial flowcharts
    const isRadialFlowchart = diagramType === 'radial_mindmap' || diagramType === 'flowchart';
    console.log('🎯 Diagram type from API:', diagramType, 'isRadialFlowchart:', isRadialFlowchart);
    setIsRadialDiagram(isRadialFlowchart);
    
    // Force immediate update if we already know it's a radial flowchart
    if (isRadialFlowchart) {
      console.log('🚀 Diagram is a radial flowchart, will show search bar');
    }
    
    mermaid.initialize({ 
      startOnLoad: false, 
      securityLevel: 'loose', 
      theme: 'base',
      fontFamily: 'Arial, sans-serif',
      fontSize: 16, // Normalized font size for all diagrams
      flowchart: {
        useMaxWidth: true,
        htmlLabels: false
      },
      sequence: {
        diagramMarginX: 50,
        diagramMarginY: 30,
        actorMargin: 40,
        width: 150,
        height: 50,
        boxMargin: 10,
        boxTextMargin: 8,
        noteMargin: 10,
        messageMargin: 15,
        mirrorActors: false,
        useMaxWidth: true,
        wrap: true,
        wrapPadding: 10,
        noteAlign: 'center'
      },
      themeVariables: {
        primaryColor: '#ffffff',
        primaryTextColor: '#000000',
        primaryBorderColor: '#000000',
        lineColor: '#000000',
        arrowheadColor: '#000000',
        edgeLabelBackground: '#ffffff',
        defaultLinkColor: '#000000'
      }
    });
    (async () => {
      try {
        if (!mounted || !ref.current) return;
        
        // Render the original code without modification
        // We'll overlay the search bar on top instead of modifying the Mermaid code
        const { svg } = await mermaid.render(`m_${Date.now()}`, code);
        ref.current.innerHTML = svg;
        
        // Mark diagram as loaded
        setIsDiagramLoaded(true);
        
        // Setup selection handling after rendering
        if (onSetupSelection && ref.current) {
          onSetupSelection(ref.current);
        }
        
        // Add hover effects to all nodes and find the central node for search bar positioning
        if (ref.current) {
          const nodes = ref.current.querySelectorAll('.node, .flowchart .node, .mindmap .node, .radial .node');
          console.log('🔍 Found nodes:', nodes.length, 'isRadialFlowchart:', isRadialFlowchart);
          let centralNode: Element | null = null;
          
          nodes.forEach((node, index) => {
            const rect = node.querySelector('rect');
            const text = node.querySelector('text');
            
            console.log(`Node ${index}:`, {
              hasRect: !!rect,
              textContent: text?.textContent?.trim(),
              isRadialFlowchart: isRadialFlowchart
            });
            
            // Find the central node - for radial flowcharts, it's always the first node (A)
            if (!centralNode && rect && isRadialFlowchart) {
              // For radial flowcharts, the central node is always the first node (A in the flowchart)
              // This is the node that should contain the search bar
              if (index === 0) {
                centralNode = node;
                console.log('🎯 Central node found at index 0');
              }
            }
            
            if (rect) {
              // Store original styles
              const originalStroke = rect.getAttribute('stroke') || '';
              const originalStrokeWidth = rect.getAttribute('stroke-width') || '1';
              const originalFill = rect.getAttribute('fill') || '';
              
              node.addEventListener('mouseenter', () => {
                rect.setAttribute('stroke', '#3b82f6');
                rect.setAttribute('stroke-width', '3');
                rect.setAttribute('fill', 'rgba(59, 130, 246, 0.05)');
                if (text) {
                  (text as SVGTextElement).style.fontWeight = '500';
                  (text as SVGTextElement).style.filter = 'brightness(1.1)';
                }
                (node as HTMLElement).style.filter = 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.3))';
              });
              
              node.addEventListener('mouseleave', () => {
                rect.setAttribute('stroke', originalStroke);
                rect.setAttribute('stroke-width', originalStrokeWidth);
                rect.setAttribute('fill', originalFill);
                if (text) {
                  (text as SVGTextElement).style.fontWeight = '';
                  (text as SVGTextElement).style.filter = '';
                }
                (node as HTMLElement).style.filter = '';
              });
            }
          });
          
          // Store central node reference for positioning and hide its text
          if (centralNode && isRadialFlowchart) {
            console.log('✅ Setting up central node for search bar');
            (ref.current as any).centralNode = centralNode;
            // Hide the text of the central node since we'll overlay the search bar
            const text = (centralNode as Element).querySelector('text');
            if (text) {
              (text as SVGTextElement).style.visibility = 'hidden';
              console.log('👁️ Hidden central node text');
            }
            
            // Now that we have the central node, trigger the search bar positioning
            requestAnimationFrame(() => {
              if (ref.current) {
                console.log('🚀 Triggering diagramLoaded event');
                const event = new CustomEvent('diagramLoaded');
                ref.current.dispatchEvent(event);
              }
            });
          } else {
            console.log('❌ No central node found or not a radial flowchart', { centralNode: !!centralNode, isRadialFlowchart });
          }
        }
      } catch (e) {
        if (ref.current) ref.current.innerHTML = `<pre class='text-red-600'>Mermaid render error: ${String(e)}</pre>`;
      }
    })();
    return () => { mounted = false; };
  }, [code, onSetupSelection, diagramType]);

  const handleCentralSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onCentralSearch && centralSearchQuery) {
      onCentralSearch(centralSearchQuery);
    }
  };

  return (
    <div className={`${className} flex justify-center items-center w-full relative`} ref={ref}>
      {/* Central Search Bar Overlay for Radial Flowcharts */}
      {/* Show search bar only for radial flowcharts */}
      {/* Show search bar only for radial flowcharts after they're fully loaded */}
      {isRadialDiagram && isDiagramLoaded && onCentralSearch && (
        <div 
          className="absolute inset-0 pointer-events-none z-50"
          style={{ zIndex: 9999 }}
        >
          <CentralSearchBar
            onSearch={handleCentralSearch}
            searchQuery={centralSearchQuery}
            setSearchQuery={setCentralSearchQuery}
            containerRef={ref}
          />
        </div>
      )}
    </div>
  );
}
