import { useRef, useCallback, useEffect } from 'react';
import Mermaid, { MermaidRef } from './Mermaid';
import RadialChart from './RadialChart';
import { FoamTreeView } from './visual/FoamTreeView';
import type { ClusterNode } from '../types/cluster';
import { setupRadialAlignment } from '../utils/radial-align';
import { removeCentralNodeA } from '../utils/svg-search-dom';
import { decorateNodesWithPlus } from '../lib/mermaid/decorateNodesWithPlus';

interface DiagramViewProps {
  diagramViewTab: 'visual' | 'text';
  clusters: ClusterNode | null;
  diagram: string | null;
  radialEnabled: boolean;
  searchQuery: string;
  setupSelectionHandler: (container: HTMLElement) => void;
  selectedClusterIds: string[];
  setSelectedClusterIds: (ids: string[]) => void;
  loadClusterChildren: (clusterId: string) => void;
  findClusterById: (root: ClusterNode | null, id: string) => ClusterNode | null;
  diagramMeta?: { nodes: Record<string, any> };
  onExternalLinksRequest?: (query: string, meta?: any) => void;
}

export default function DiagramView({
  diagramViewTab,
  clusters,
  diagram,
  radialEnabled,
  searchQuery,
  setupSelectionHandler,
  selectedClusterIds,
  setSelectedClusterIds,
  loadClusterChildren,
  findClusterById,
  diagramMeta,
  onExternalLinksRequest
}: DiagramViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const mermaidRef = useRef<MermaidRef>(null);
  const cleanupRef = useRef<null | (() => void)>(null);
  const timeoutRef = useRef<number | null>(null);
  
  // External links state is now handled by parent component

  // Memoize the onRender callback to prevent Mermaid re-renders
  const handleMermaidRender = useCallback(async (svgElement: SVGSVGElement) => {
    (svgRef as any).current = svgElement;
    cleanupRef.current?.();

    // Cancel any pending timeout from previous renders
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      console.log('[DiagramView] Cancelled previous timeout');
    }

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
      timeoutRef.current = setTimeout(() => {
        console.log('[DiagramView] Executing decorateNodesWithPlus after delay');
        decorateNodesWithPlus({
          svg: svgElement,
          originalQuery: searchQuery,
          excludeIds: exclude,
          diagramMeta: diagramMeta,
          onOpenPopover: ({ query, nodeId, meta }) => {
            console.log('[DiagramView] Plus button clicked, requesting external links for query:', query, 'nodeId:', nodeId, 'meta:', meta);
            onExternalLinksRequest?.(query, meta);
          },
        });
        timeoutRef.current = null; // Clear the ref after execution
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

  // Cleanup alignment and timeouts on unmount
  useEffect(() => {
    return () => {
      cleanupRef.current?.();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  if (diagramViewTab !== 'visual') {
    return null;
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
        </div>
      </>
    );
  }

  if (diagram) {
    return (
      <>
        <div className="relative">
          <div
            ref={hostRef}
            className="diagram-viewport relative w-full h-[calc(100vh-120px)] overflow-visible"
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
        </div>
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
    </>
  );
}
