import { useRef, useCallback, useEffect } from 'react';
import Mermaid, { MermaidRef } from './Mermaid';
import { FoamTreeView } from './visual/FoamTreeView';
import type { ClusterNode } from '../types/cluster';

interface DiagramViewProps {
  diagramViewTab: 'visual' | 'text';
  clusters: ClusterNode | null;
  diagram: string | null;
  diagramData: {mermaidCode: string; diagramImage: string; prompt: string; diagramType?: string} | null;
  radialEnabled: boolean;
  searchQuery: string;
  onSearch: (query: string) => void;
  setupSelectionHandler: (container: HTMLElement) => void;
  handleSavePNG: () => void;
  selectedClusterIds: string[];
  setSelectedClusterIds: (ids: string[]) => void;
  loadClusterChildren: (clusterId: string) => void;
  findClusterById: (root: ClusterNode | null, id: string) => ClusterNode | null;
}

export default function DiagramView({
  diagramViewTab,
  clusters,
  diagram,
  diagramData,
  radialEnabled,
  searchQuery,
  onSearch,
  setupSelectionHandler,
  handleSavePNG,
  selectedClusterIds,
  setSelectedClusterIds,
  loadClusterChildren,
  findClusterById
}: DiagramViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const mermaidRef = useRef<MermaidRef>(null);

  // Memoize the onRender callback to prevent Mermaid re-renders
  const handleMermaidRender = useCallback((svgElement: SVGSVGElement) => {
    // Update the SVG ref for the overlay
    (svgRef as any).current = svgElement;
    console.log('🔍 DiagramView: SVG ref updated via onRender:', svgElement);

    // Position the Mermaid diagram so its central node is covered by the search bar
    if (radialEnabled && hostRef.current) {
      // Add a small delay to ensure the search bar is fully positioned
      setTimeout(() => {
      const searchBar = document.querySelector('.central-search-overlay');
      if (searchBar) {
          // Get the search bar's fixed position (it's position: fixed, so this won't change with scroll)
        const searchBarRect = searchBar.getBoundingClientRect();
        const searchBarCenterX = searchBarRect.left + searchBarRect.width / 2;
        const searchBarCenterY = searchBarRect.top + searchBarRect.height / 2;
        
          console.log('🔍 Search bar rect details:', {
            left: searchBarRect.left,
            top: searchBarRect.top,
            width: searchBarRect.width,
            height: searchBarRect.height,
            centerX: searchBarCenterX,
            centerY: searchBarCenterY
          });
          console.log('🔍 Search bar center X:', searchBarCenterX, 'Y:', searchBarCenterY);
          console.log('🔍 Search bar element:', searchBar);
          console.log('🔍 Search bar computed style:', window.getComputedStyle(searchBar));
          
          // Find the central node in the SVG - debug what nodes exist first
          const allNodes = svgElement.querySelectorAll('.node');
          console.log('🔍 All nodes found:', allNodes.length);
          allNodes.forEach((node, index) => {
            console.log(`🔍 Node ${index}:`, {
              id: node.id,
              className: node.className,
              textContent: node.textContent?.trim(),
              transform: node.getAttribute('transform')
            });
            console.log(`🔍 Node ${index} text:`, node.textContent?.trim());
          });
          
          // Find the central node - it should be the one with "Details about Paris" text
          let centralNode = Array.from(allNodes).find(node => 
            node.textContent?.trim() === 'Details about Paris'
          );
          
          if (!centralNode) {
            // If not found by text, try by ID pattern
            centralNode = svgElement.querySelector('.node[id*="A"]');
          }
          
          if (centralNode) {
            // Get the node's position from its transform attribute instead of getBoundingClientRect
            const transform = centralNode.getAttribute('transform');
            console.log('🔍 Found central node:', centralNode);
            console.log('🔍 Node transform:', transform);
            
            // Extract coordinates from transform="translate(x, y)"
            const match = transform?.match(/translate\(([^,]+),\s*([^)]+)\)/);
            if (match) {
              const nodeX = parseFloat(match[1]);
              const nodeY = parseFloat(match[2]);
              
              // The SVG is positioned at (0,0) since it's fixed at origin
              // So the node's screen position is just its SVG coordinates
              const nodeCenterX = nodeX;
              const nodeCenterY = nodeY;
              
              console.log('🔍 Node SVG coordinates:', { x: nodeX, y: nodeY });
              console.log('🔍 Calculated node center:', { x: nodeCenterX, y: nodeCenterY });
            
              // Position the SVG so the central node aligns with the search bar
              // We need to move the SVG so that the node's position aligns with the search bar
              // Since the SVG is scaled by 0.35, we need to account for that in our positioning
              const scale = 0.25;
              const offsetX = searchBarCenterX - (nodeCenterX * scale);
              // Position the central node behind the search bar
              const offsetY = searchBarCenterY - (nodeCenterY * scale);
            
              console.log('🔍 Positioning central node to align with search bar');
              console.log('🔍 Search bar center X:', searchBarCenterX, 'Y:', searchBarCenterY);
              console.log('🔍 Central node center X:', nodeCenterX, 'Y:', nodeCenterY);
              console.log('🔍 Offset X:', offsetX, 'Y:', offsetY);
              
              // Apply the positioning
              svgElement.style.position = 'fixed';
              svgElement.style.left = '0';
              svgElement.style.top = '0';
              svgElement.style.width = '100vw';
              svgElement.style.height = '100vh';
              svgElement.style.setProperty('max-width', 'none', 'important'); // Remove max-width constraint
              const transformValue = `translate(${offsetX}px, ${offsetY}px) scale(0.25)`;
              svgElement.style.transform = transformValue;
              svgElement.style.zIndex = '1'; // Behind search bar (z-index: 99999)
              
              console.log('🔍 Applied transform:', transformValue);
              console.log('🔍 SVG element after positioning:', svgElement);
            } else {
              console.error('❌ Could not parse node transform coordinates!');
              return;
            }
          } else {
            console.error('❌ Central node not found! Cannot position diagram.');
            return; // Fail hard - no positioning without central node
          }
        }
      }, 200); // Longer delay to ensure search bar is fully positioned
    }
  }, [radialEnabled]);

  // Reset positioning when diagram changes (new search)
  useEffect(() => {
    if (svgRef.current) {
      svgRef.current.removeAttribute('data-positioned');
    }
  }, [diagram]);

  if (diagramViewTab !== 'visual') {
    return null;
  }

  if (clusters) {
    return (
      <div className="relative">
        <div className="h-[70vh]">
          <FoamTreeView
            data={clusters}
            onSelect={setSelectedClusterIds}
            onOpen={loadClusterChildren}
            onExpose={() => {}}
            onSetupSelection={setupSelectionHandler}
            className="w-full h-full"
          />
        </div>
        {selectedClusterIds.length > 0 && (
          <div className="absolute top-4 right-4 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-h-96 overflow-y-auto">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              Selected Cluster Items
            </h3>
            <div className="space-y-2">
              {selectedClusterIds.map(clusterId => {
                const cluster = findClusterById(clusters, clusterId);
                return cluster?.items?.map(item => (
                  <div key={item.id} className="p-2 border border-gray-200 dark:border-gray-700 rounded">
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline block">
                      {item.title}
                    </a>
                    {item.score && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Score: {(item.score * 100).toFixed(0)}%
                      </div>
                    )}
                  </div>
                ));
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (diagram) {
    return (
      <div className="relative">
        <div ref={hostRef} className="diagram-viewport mermaid-container" style={{ 
          position: radialEnabled ? "fixed" : "relative", 
          top: radialEnabled ? "0" : "auto",
          left: radialEnabled ? "0" : "auto",
          width: radialEnabled ? "100vw" : "100%",
          height: radialEnabled ? "100vh" : "auto",
          minHeight: '400px',
          zIndex: radialEnabled ? "1" : "auto"
        }}>
          <Mermaid 
            ref={mermaidRef}
            code={diagram} 
            onRender={handleMermaidRender}
            onSetupSelection={setupSelectionHandler}
          />
        </div>
        {/* Save PNG Button - positioned above bottom bar */}
        <div className="absolute bottom-24 right-8">
          <button
            onClick={handleSavePNG}
            className="px-4 py-2 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-black dark:text-white text-sm font-medium rounded-lg transition-colors shadow-md border border-gray-200 dark:border-gray-600"
            title="Save as PNG image"
          >
            Save PNG
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  return (
    <div className="p-8 text-center" style={{ minHeight: '400px', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
      {/* Icon positioned above search bar */}
      <div style={{ position: 'absolute', top: '80px', left: '50%', transform: 'translateX(-50%)' }}>
        <img 
          src="/textchart-icon.png" 
          alt="Textchart" 
          className="w-16 h-16 mx-auto"
        />
      </div>
      
      {/* Loading text positioned below search bar */}
      <div style={{ position: 'absolute', bottom: '80px', left: '50%', transform: 'translateX(-50%)' }}>
        <p className="text-gray-500 dark:text-gray-400">Textchart being generated...</p>
      </div>
    </div>
  );
}
