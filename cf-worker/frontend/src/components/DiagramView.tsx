import { useRef, useCallback, useEffect, useState } from 'react';
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
    const startTime = performance.now();
    const renderId = `diagram_view_${Date.now()}`;
    
    console.log(`🎯 [${renderId}] Starting DiagramView render processing...`);
    
    (svgRef as any).current = svgElement;
    cleanupRef.current?.();

    // Cancel any pending timeout from previous renders
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      console.log(`[${renderId}] Cancelled previous timeout`);
    }

    console.log(`[${renderId}] handleMermaidRender called with SVG:`, svgElement);

    // Remove central node A immediately after rendering
    const nodeRemovalStartTime = performance.now();
    console.log(`[${renderId}] Removing central node A immediately...`);
    console.log(`[${renderId}] SVG element details:`, {
      id: svgElement.id,
      children: svgElement.children.length,
      innerHTML: svgElement.innerHTML.substring(0, 200) + '...'
    });
    
    // Try to find node A manually first
    const allGroups = svgElement.querySelectorAll('g');
    console.log(`[${renderId}] All groups in SVG:`, allGroups.length);
    allGroups.forEach((group, index) => {
      if (group.textContent?.includes('A') || group.id?.includes('A')) {
        console.log(`[${renderId}] Found potential node A (group ${index}):`, {
          id: group.id,
          textContent: group.textContent?.trim(),
          className: group.className
        });
      }
    });
    
    removeCentralNodeA(svgElement);
    const nodeRemovalTime = performance.now() - nodeRemovalStartTime;
    console.log(`⏱️ [${renderId}] Node removal time: ${nodeRemovalTime.toFixed(2)}ms`);

    // wait for fonts so bbox numbers are stable
    const fontWaitStartTime = performance.now();
    await (document as any).fonts?.ready;
    const fontWaitTime = performance.now() - fontWaitStartTime;
    console.log(`⏱️ [${renderId}] Font ready wait time: ${fontWaitTime.toFixed(2)}ms`);

    const shouldDecorateNodes = Boolean(diagramMeta);

    const removeExistingDecorations = () => {
      const existingDecorations = svgElement.querySelectorAll('g.__plus');
      if (existingDecorations.length) {
        console.log(`[${renderId}] Removing ${existingDecorations.length} existing node decorations`);
        existingDecorations.forEach(decoration => decoration.parentElement?.removeChild(decoration));
      }
    };

    if (!shouldDecorateNodes || !searchQuery) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (!shouldDecorateNodes) {
        console.log(`[${renderId}] Skipping node decorations (disabled for this view)`);
      } else {
        console.log(`[${renderId}] No searchQuery available for plus buttons`);
      }
      removeExistingDecorations();
    } else {
      const plusButtonStartTime = performance.now();
      console.log(`[${renderId}] Adding plus buttons with searchQuery:`, searchQuery);
      const exclude = new Set<string>(["A"]);

      // Add delay to ensure SVG is fully rendered and positioned
      timeoutRef.current = setTimeout(() => {
        const decorationStartTime = performance.now();
        console.log(`[${renderId}] Executing decorateNodesWithPlus after delay`);
        removeExistingDecorations();
        decorateNodesWithPlus({
          svg: svgElement,
          originalQuery: searchQuery,
          excludeIds: exclude,
          diagramMeta: diagramMeta,
          onOpenPopover: ({ query, nodeId, meta }) => {
            console.log(`[${renderId}] Plus button clicked, requesting external links for query:`, query, 'nodeId:', nodeId, 'meta:', meta);
            onExternalLinksRequest?.(query, meta);
          },
        });
        const decorationTime = performance.now() - decorationStartTime;
        console.log(`⏱️ [${renderId}] Node decoration time: ${decorationTime.toFixed(2)}ms`);
        timeoutRef.current = null; // Clear the ref after execution
      }, 200); // Increased delay to 200ms for better reliability
      const plusButtonSetupTime = performance.now() - plusButtonStartTime;
      console.log(`⏱️ [${renderId}] Plus button setup time: ${plusButtonSetupTime.toFixed(2)}ms`);
    }

    if (radialEnabled && hostRef.current && svgElement) {
      const radialSetupStartTime = performance.now();
      cleanupRef.current = setupRadialAlignment(svgElement, hostRef.current, {
        paddingPercent: 0.12,
        minScale: 0.5
      });
      const radialSetupTime = performance.now() - radialSetupStartTime;
      console.log(`⏱️ [${renderId}] Radial alignment setup time: ${radialSetupTime.toFixed(2)}ms`);
    }
    
    const totalTime = performance.now() - startTime;
    console.log(`🚀 [${renderId}] PERFORMANCE REPORT:`);
    console.log(`📊 Total DiagramView render time: ${totalTime.toFixed(2)}ms`);
    console.log(`📈 Breakdown:`);
    console.log(`   • Node removal: ${nodeRemovalTime.toFixed(2)}ms (${((nodeRemovalTime / totalTime) * 100).toFixed(1)}%)`);
    console.log(`   • Font wait: ${fontWaitTime.toFixed(2)}ms (${((fontWaitTime / totalTime) * 100).toFixed(1)}%)`);
    console.log(`   • Plus button setup: ${searchQuery ? 'Scheduled' : 'Skipped'}`);
    console.log(`   • Radial setup: ${radialEnabled ? 'Completed' : 'Skipped'}`);
    
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
          <div className="diagram-viewport h-[calc(100vh-80px)]">
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
            className="diagram-viewport relative w-full h-[calc(100vh-80px)] overflow-visible"
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
        <div style={{ position: 'absolute', top: '40px', left: '50%', transform: 'translateX(-50%)' }}>
          <img
            src="/Textchart icon.png"
            alt="Textchart"
            className="w-16 h-16 mx-auto"
          />
        </div>

        {/* Loading text positioned below search bar */}
        <div style={{ position: 'absolute', bottom: '120px', left: '50%', transform: 'translateX(-50%)' }}>
          <p className="text-gray-500 dark:text-gray-400">Textchart being generated...</p>
        </div>
      </div>
    </>
  );
}
