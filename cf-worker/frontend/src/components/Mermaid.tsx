import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Search, Mic, Image } from 'lucide-react';

// Central Search Bar Component
interface CentralSearchBarProps {
  onSearch: (e: React.FormEvent) => void;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  position: { x: number, y: number, width: number, height: number } | null;
}

const CentralSearchBar: React.FC<CentralSearchBarProps> = ({
  onSearch,
  searchQuery,
  setSearchQuery,
  position
}) => {
  // Debug visibility changes
  useEffect(() => {
    console.log('🔍 CentralSearchBar position changed:', position);
  }, [position]);

  if (!position) {
    console.log('🔍 CentralSearchBar not visible, no position');
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
        <div className="flex items-center bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-300 dark:border-gray-600 hover:shadow-lg hover:shadow-gray-200/20 dark:hover:shadow-gray-900/20 transition-all duration-300 shadow-lg w-full h-full min-w-[300px]">
          <input
            type="text"
            value={searchQuery || ''}
            onChange={(e) => setSearchQuery?.(e.target.value)}
            placeholder="Explore visually…"
            className="flex-1 px-5 py-3 bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm"
          />
          <button className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
            <Mic className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
          <button className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
            <Image className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
          <button
            type="submit"
            className="p-2.5 mr-1 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 rounded-xl transition-colors"
          >
            <Search className="w-4 h-4 text-white dark:text-gray-900" />
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
  const [centralNodePosition, setCentralNodePosition] = useState<{x: number, y: number, width: number, height: number} | null>(null);

  // Helper to (re)compute central node position from rendered SVG
  const computeCentralNodePosition = () => {
    if (!ref.current) return null;
    try {
      const svg = ref.current.querySelector('svg');
      if (!svg) return null;

      // Try to find a central node rect by common selectors/naming (first node or id containing 'A')
      const possibleNodes = Array.from(ref.current.querySelectorAll('.node, .flowchart .node, .mindmap .node, .radial .node')) as Element[];
      if (possibleNodes.length === 0) return null;

      // Prefer node with id including 'A' (mermaid's first node), otherwise fallback to first node
      let centralNode: Element | undefined = possibleNodes.find(n => (n.getAttribute('id') || '').includes('A')) || possibleNodes[0];
      if (!centralNode) return null;
      const rect = centralNode.querySelector('rect');
      if (!rect) return null;

      const nodeRect = rect.getBoundingClientRect();
      const svgRect = svg.getBoundingClientRect();
      const x = nodeRect.left - svgRect.left;
      const y = nodeRect.top - svgRect.top;
      const width = nodeRect.width;
      const height = nodeRect.height;
      const position = { x, y, width, height };

      // persist on element and state
      (ref.current as any).centralNodePosition = position;
      setCentralNodePosition(position);
      console.log('📍 [computeCentralNodePosition] stored position', position);
      return position;
    } catch (err) {
      console.log('❌ [computeCentralNodePosition] error', err);
      return null;
    }
  };

  // Helper to hide central node visuals (but keep DOM) when we have a node element
  const hideCentralNodeVisuals = (node?: Element | null) => {
    try {
      const container = ref.current;
      const nodes = Array.from((container?.querySelectorAll('.node, .flowchart .node, .mindmap .node, .radial .node') || []) as NodeListOf<Element>);
      let central: Element | undefined = node as Element | undefined;
      if (!central) {
        central = nodes.find(n => (n.getAttribute('id') || '').match(/\bA\b|A$/)) || nodes[0];
      }
      if (!central) return;

      const rectEl = central.querySelector('rect');
      const textEl = central.querySelector('text');

      if (rectEl) {
        (rectEl as SVGElement).setAttribute('fill', 'transparent');
        (rectEl as SVGElement).setAttribute('stroke', 'none');
      }
      if (textEl) {
        // Always hide the central node text for radial diagrams - search bar overlay must work
        (textEl as SVGElement).style.opacity = '0';
        (textEl as SVGElement).style.pointerEvents = 'none';
      }
      central.setAttribute('data-central-hidden', 'true');
    } catch (err) {
      console.log('❌ hideCentralNodeVisuals error', err);
    }
  };

  useEffect(() => {
    let mounted = true;
    
  // Reset state when code changes
  setIsDiagramLoaded(false);
  // For radial diagrams, NEVER reset the position - it's always the same
  // Only reset position for non-radial diagrams
  if (diagramType !== 'radial_mindmap' && diagramType !== 'flowchart') {
    setCentralNodePosition(null);
    if (ref.current) {
      (ref.current as any).centralNodePosition = null;
    }
  }
    
    // Recompute position on resize/scroll to keep search bar visible while editing
    const onLayoutChange = () => {
      if (isRadialDiagram) computeCentralNodePosition();
    };
    window.addEventListener('resize', onLayoutChange);
    window.addEventListener('scroll', onLayoutChange, true);
    
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
        htmlLabels: false,
        curve: 'basis',
        diagramPadding: 20
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

        // For radial flowcharts, compute position only if we don't have one
        if (isRadialFlowchart) {
          console.log('🔍 Hiding central node visuals for search bar overlay');
          hideCentralNodeVisuals(null);
          
          // Only compute position if we don't already have one
          if (!centralNodePosition) {
            const position = computeCentralNodePosition();
            console.log('🔍 Computed central node position:', position);
            
            if (!position || !onCentralSearch) {
              console.error('❌ HARD FAILURE: Search bar overlay cannot be displayed');
              console.error('Position:', position, 'onCentralSearch:', !!onCentralSearch);
              throw new Error('Search bar overlay failed to initialize - position computation failed');
            }
          } else {
            console.log('🔍 Using existing position for radial diagram:', centralNodePosition);
          }
        }
        
        // Mark diagram as loaded
        setIsDiagramLoaded(true);

        // Setup selection handling after rendering
        if (onSetupSelection && ref.current) {
          onSetupSelection(ref.current);
        }
        
          // Add hover effects to all nodes and remove central node for radial flowcharts
          if (ref.current) {
            const nodes = ref.current.querySelectorAll('.node, .flowchart .node, .mindmap .node, .radial .node');
            console.log('🔍 Found nodes:', nodes.length, 'isRadialFlowchart:', isRadialFlowchart);
            console.log('🔍 Current centralNodePosition state:', centralNodePosition);
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
              if (index === 0) {
                centralNode = node;
                console.log('🎯 Central node found at index 0 - will be removed');
              }
            }
            
            // Debug: Log all nodes to understand structure
            console.log(`Node ${index}:`, {
              hasRect: !!rect,
              textContent: text?.textContent?.trim(),
              nodeId: node.getAttribute('id'),
              isRadialFlowchart: isRadialFlowchart,
              isNodeA: node.getAttribute('id')?.includes('A') || false
            });
            
            // For radial flowcharts, hide (do not remove) the central node but store its position
            if (isRadialFlowchart && index === 0) {
              console.log('� Hiding central node to replace with search bar (preserve DOM)');
              // Store the node's position before hiding it
              const rect = node.querySelector('rect');
              if (rect && ref.current) {
                const nodeRect = rect.getBoundingClientRect();
                const svg = ref.current.querySelector('svg');
                if (svg) {
                  const svgRect = svg.getBoundingClientRect();
                  const x = nodeRect.left - svgRect.left;
                  const y = nodeRect.top - svgRect.top;
                  const width = nodeRect.width;
                  const height = nodeRect.height;

                  const position = { x, y, width, height };
                  (ref.current as any).centralNodePosition = position;
                  setCentralNodePosition(position);
                  console.log('📍 Stored central node position:', position);
                }
              }

              // Hide visual elements but keep node in DOM so future renders/queries can find it
              try {
                const rectEl = node.querySelector('rect');
                const textEl = node.querySelector('text');
                if (rectEl) {
                  (rectEl as SVGElement).setAttribute('fill', 'transparent');
                  (rectEl as SVGElement).setAttribute('stroke', 'none');
                }
                if (textEl) {
                  // Keep the label text visible so users can see the central label.
                  // Make the underlying text non-interactive so the overlay input receives clicks.
                  (textEl as SVGElement).style.pointerEvents = 'none';
                }
                // mark it so we don't re-hide repeatedly
                node.setAttribute('data-central-hidden', 'true');
              } catch (err) {
                console.log('❌ Error hiding central node:', err);
              }

              // continue without removing the node
              return;
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
          
          
          // Trigger search bar positioning for radial flowcharts
          if (isRadialFlowchart) {
            console.log('✅ Central node removed, setting up search bar and adjusting arrows');
            
            // Adjust arrow endpoints using coordinate system approach
            setTimeout(() => {
              if (ref.current) {
                // Prefer recomputing position to ensure it's accurate after render/layout changes
                const centralNodePosition = computeCentralNodePosition() || (ref.current as any).centralNodePosition;
                if (centralNodePosition) {
                  const { x, y, width, height } = centralNodePosition;
                  const centerX = x + width / 2;
                  const centerY = y + height / 2;
                  
                  console.log('🎯 Central node A position for arrow adjustment:', { x, y, width, height, centerX, centerY });
                  
                  // Find all arrow paths using multiple selectors
                  const arrowSelectors = [
                    'path[id*="flowchart"]',
                    'path[class*="flowchart"]', 
                    'path[class*="edge"]',
                    'path[class*="arrow"]',
                    '.flowchart .edge path',
                    '.mindmap .edge path'
                  ];
                  
                  let paths: NodeListOf<SVGPathElement> | null = null;
                  for (const selector of arrowSelectors) {
                    paths = ref.current.querySelectorAll(selector);
                    if (paths.length > 0) {
                      console.log(`🔗 Found ${paths.length} arrow paths with selector: ${selector}`);
                      break;
                    }
                  }
                  
                  if (paths && paths.length > 0) {
                    paths.forEach((path, index) => {
                      try {
                        // Get the path's bounding box to find current endpoints
                        const bbox = path.getBBox();
                        const pathRect = path.getBoundingClientRect();
                        const svg = ref.current!.querySelector('svg');
                        
                        if (svg) {
                          const svgRect = svg.getBoundingClientRect();
                          
                          // Convert to SVG coordinates
                          const pathX = pathRect.left - svgRect.left;
                          const pathY = pathRect.top - svgRect.top;
                          
                          // Check if this arrow is pointing towards the center area
                          const distanceToCenter = Math.sqrt(
                            Math.pow((pathX + bbox.width) - centerX, 2) + 
                            Math.pow((pathY + bbox.height) - centerY, 2)
                          );
                          
                          // Only adjust arrows that are close to the center (within 100px)
                          if (distanceToCenter < 100) {
                            console.log(`🎯 Adjusting arrow ${index}, distance to center: ${distanceToCenter}`);
                            
                            // Get the path data to modify only the endpoint
                            const pathData = path.getAttribute('d');
                            if (pathData) {
                              // Parse the path to find coordinates
                              const commands = pathData.match(/[MLCQ][^MLCQ]*/g) || [];
                              if (commands.length > 0) {
                                // Find the last command (which should be the endpoint)
                                const lastCommand = commands[commands.length - 1];
                                const coords = lastCommand.match(/-?\d+\.?\d*/g);
                                
                                if (coords && coords.length >= 2) {
                                  const currentEndX = parseFloat(coords[coords.length - 2]);
                                  const currentEndY = parseFloat(coords[coords.length - 1]);
                                  
                                  // Check if this endpoint is close to the center (was connected to central node)
                                  const distanceToCenter = Math.sqrt(
                                    Math.pow(currentEndX - centerX, 2) + 
                                    Math.pow(currentEndY - centerY, 2)
                                  );
                                  
                                  if (distanceToCenter < 50) { // Only modify if close to center
                                    // Calculate new endpoint on search bar border
                                    const deltaX = centerX - currentEndX;
                                    const deltaY = centerY - currentEndY;
                                    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                                    
                                    if (distance > 0) {
                                      // Calculate intersection with search bar border
                                      const borderRadius = Math.min(width, height) / 2 + 10; // 10px padding
                                      const ratio = (distance - borderRadius) / distance;
                                      
                                      const newEndX = currentEndX + deltaX * ratio;
                                      const newEndY = currentEndY + deltaY * ratio;
                                      
                                      // Update only the last coordinates in the path
                                      const newCoords = [...coords];
                                      newCoords[newCoords.length - 2] = newEndX.toString();
                                      newCoords[newCoords.length - 1] = newEndY.toString();
                                      
                                      // Reconstruct the last command with new coordinates
                                      const commandType = lastCommand[0];
                                      const newLastCommand = commandType + newCoords.join(',');
                                      
                                      // Update the path data
                                      const newPathData = [...commands];
                                      newPathData[newPathData.length - 1] = newLastCommand;
                                      path.setAttribute('d', newPathData.join(' '));
                                      
                                      console.log(`✅ Arrow ${index} endpoint moved from (${currentEndX}, ${currentEndY}) to (${newEndX}, ${newEndY})`);
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      } catch (error) {
                        console.log(`❌ Error adjusting arrow ${index}:`, error);
                      }
                    });
                  } else {
                    console.log('❌ No arrow paths found');
                  }
                }
              }
            }, 200);
            
            requestAnimationFrame(() => {
              if (ref.current) {
                console.log('🚀 Triggering diagramLoaded event');
                const event = new CustomEvent('diagramLoaded');
                ref.current.dispatchEvent(event);
              }
            });
          } else {
            console.log('❌ Not a radial flowchart, no search bar needed');
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
      {(() => {
  // Search bar must be visible for radial diagrams - no fallbacks
  // Position should already be computed synchronously, no fallbacks needed
  const stored = centralNodePosition;
  const shouldShow = isRadialDiagram && !!onCentralSearch && !!stored && isDiagramLoaded;
  
  console.log('🔍 Search bar visibility check:', { 
    isRadialDiagram, 
    isDiagramLoaded, 
    hasOnCentralSearch: !!onCentralSearch, 
    centralNodePosition: stored, 
    shouldShow
  });
  
  // Hard failure if search bar should show but can't
  if (isRadialDiagram && !shouldShow) {
    console.error('❌ HARD FAILURE: Search bar required but cannot be displayed');
    console.error('Missing requirements:', { 
      isRadialDiagram, 
      hasOnCentralSearch: !!onCentralSearch, 
      hasPosition: !!stored,
      isDiagramLoaded
    });
  }
  
  return shouldShow;
      })() && (
        <div 
          className="absolute inset-0 pointer-events-none z-50"
          style={{ zIndex: 9999 }}
        >
          <CentralSearchBar
            onSearch={handleCentralSearch}
            searchQuery={centralSearchQuery}
            setSearchQuery={setCentralSearchQuery}
            position={centralNodePosition}
          />
        </div>
      )}
    </div>
  );
}
