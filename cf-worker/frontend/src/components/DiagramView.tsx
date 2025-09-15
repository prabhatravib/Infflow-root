import { useRef, useCallback, useEffect, useState } from 'react';
import Mermaid, { MermaidRef } from './Mermaid';
import RadialChart from './RadialChart';
import { FoamTreeView } from './visual/FoamTreeView';
import type { ClusterNode } from '../types/cluster';
import { setupRadialAlignment } from '../utils/radial-align';
import { removeCentralNodeA } from '../utils/svg-search-dom';
import { decorateNodesWithPlus } from '../lib/mermaid/decorateNodesWithPlus';
import { NodeLinksPopover } from './NodeLinksPopover';

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
  diagramMeta?: { nodes: Record<string, any> };
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
  findClusterById,
  diagramMeta
}: DiagramViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const mermaidRef = useRef<MermaidRef>(null);
  const cleanupRef = useRef<null | (() => void)>(null);
  
  // State for popover
  const [popoverPt, setPopoverPt] = useState<{ x: number; y: number } | null>(null);
  const [popoverQuery, setPopoverQuery] = useState<string | null>(null);
  const [popoverMeta, setPopoverMeta] = useState<any>(null);

  // Memoize the onRender callback to prevent Mermaid re-renders
  const handleMermaidRender = useCallback(async (svgElement: SVGSVGElement) => {
    (svgRef as any).current = svgElement;
    cleanupRef.current?.();

    console.log('[DiagramView] handleMermaidRender called with SVG:', svgElement);

    // Remove central node A immediately after rendering
    console.log('[DiagramView] Removing central node A immediately...');
    console.log('[DiagramView] SVG element details:', {
      id: svgElement.id,
      children: svgElement.children.length,
      innerHTML: svgElement.innerHTML.substring(0, 200) + '...'
    });
    
    // Try to find node A manually first
    const allGroups = svgElement.querySelectorAll('g');
    console.log('[DiagramView] All groups in SVG:', allGroups.length);
    allGroups.forEach((group, index) => {
      if (group.textContent?.includes('A') || group.id?.includes('A')) {
        console.log(`[DiagramView] Found potential node A (group ${index}):`, {
          id: group.id,
          textContent: group.textContent?.trim(),
          className: group.className
        });
      }
    });
    
    removeCentralNodeA(svgElement);

    // wait for fonts so bbox numbers are stable
    await (document as any).fonts?.ready;

    // Add plus buttons to nodes with a delay to ensure SVG is fully rendered
    if (searchQuery) {
      console.log('[DiagramView] Adding plus buttons with searchQuery:', searchQuery);
      const exclude = new Set<string>(["A"]);
      
      // Add delay to ensure SVG is fully rendered and positioned
      setTimeout(() => {
        console.log('[DiagramView] Executing decorateNodesWithPlus after delay');
        decorateNodesWithPlus({
          svg: svgElement,
          originalQuery: searchQuery,
          excludeIds: exclude,
          diagramMeta: diagramMeta,
          onOpenPopover: ({ clientX, clientY, query, nodeId, meta }) => {
            console.log('[DiagramView] Plus button clicked, opening popover at:', clientX, clientY, 'with query:', query, 'nodeId:', nodeId, 'meta:', meta);
            setPopoverPt({ x: clientX, y: clientY });
            setPopoverQuery(query);
            setPopoverMeta(meta);
          },
        });
      }, 200); // Increased delay to 200ms for better reliability
    } else {
      console.log('[DiagramView] No searchQuery available for plus buttons');
    }

    if (radialEnabled && hostRef.current && svgElement) {
      cleanupRef.current = setupRadialAlignment(svgElement, hostRef.current, {
        paddingPercent: 0.12,
        minScale: 0.5
      });
    }
  }, [radialEnabled, searchQuery]);

  // Cleanup alignment on unmount
  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  if (diagramViewTab !== 'visual') {
    return (
      <>
        {null}
        <NodeLinksPopover
          point={popoverPt}
          query={popoverQuery}
          meta={popoverMeta}
          onClose={() => {
            setPopoverPt(null);
            setPopoverQuery(null);
            setPopoverMeta(null);
          }}
        />
      </>
    );
  }

  if (clusters) {
    return (
      <>
        <div className="relative">
          <div className="diagram-viewport h-[70vh]">
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
          {/* Save PNG Button for FoamTree - positioned just above bottom bar */}
          <div className="absolute bottom-2 right-8" style={{ zIndex: 3000 }}>
            <button
              onClick={() => {
                console.log('Save PNG button clicked!');
                handleSavePNG();
              }}
              className="px-4 py-2 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-black dark:text-white text-sm font-medium rounded-lg transition-colors shadow-md border border-gray-200 dark:border-gray-600"
              style={{ 
                pointerEvents: 'auto', 
                position: 'relative', 
                zIndex: 3000,
                cursor: 'pointer'
              }}
              title="Save as PNG image"
            >
              Save PNG
            </button>
          </div>
        </div>
        <NodeLinksPopover
          point={popoverPt}
          query={popoverQuery}
          meta={popoverMeta}
          onClose={() => {
            setPopoverPt(null);
            setPopoverQuery(null);
            setPopoverMeta(null);
          }}
        />
      </>
    );
  }

  if (diagram) {
    return (
      <>
        <div className="relative">
          <div
            ref={hostRef}
            className="diagram-viewport relative w-full h-[calc(100vh-168px)] overflow-hidden"
            style={{ zIndex: radialEnabled ? 1 : "auto" }}
          >
            {radialEnabled ? (
              <RadialChart 
                code={diagram} 
                onRender={handleMermaidRender}
                onSetupSelection={setupSelectionHandler}
              />
            ) : (
              <Mermaid 
                ref={mermaidRef}
                code={diagram} 
                onRender={handleMermaidRender}
                onSetupSelection={setupSelectionHandler}
              />
            )}
          </div>
          {/* Save PNG Button - positioned just above bottom bar */}
          <div className="absolute bottom-2 right-8" style={{ zIndex: 3000 }}>
            <button
              onClick={() => {
                console.log('Save PNG button clicked!');
                handleSavePNG();
              }}
              className="px-4 py-2 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-black dark:text-white text-sm font-medium rounded-lg transition-colors shadow-md border border-gray-200 dark:border-gray-600"
              style={{ 
                pointerEvents: 'auto', 
                position: 'relative', 
                zIndex: 3000,
                cursor: 'pointer'
              }}
              title="Save as PNG image"
            >
              Save PNG
            </button>
          </div>
        </div>
        <NodeLinksPopover
          point={popoverPt}
          query={popoverQuery}
          meta={popoverMeta}
          onClose={() => {
            setPopoverPt(null);
            setPopoverQuery(null);
            setPopoverMeta(null);
          }}
        />
      </>
    );
  }

  // Loading state
  return (
    <>
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
      <NodeLinksPopover
        point={popoverPt}
        query={popoverQuery}
        onClose={() => {
          setPopoverPt(null);
          setPopoverQuery(null);
        }}
      />
    </>
  );
}
