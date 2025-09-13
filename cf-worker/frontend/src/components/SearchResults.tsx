import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { Header } from './Header';
import { Tabs } from './Tabs';
import { Sidebar } from './Sidebar';
import Mermaid, { MermaidRef } from './Mermaid';
import { DeepDive } from './DeepDive';
import { HexaWorker } from './HexaWorker';
// import RadialSearchOverlay from './RadialSearchOverlay';
import { setupRadialAlignment } from '../utils/radial-align';
import { FoamTreeView } from './visual/FoamTreeView';
import { ClusterNode } from '../types/cluster';
import { useClusterLazyLoading } from '../hooks/use-cluster-lazy-loading';

interface SearchResultsProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSearch: (query: string) => void;
  isDark: boolean;
  toggleTheme: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  onBackToHome: () => void;
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  diagram: string | null;
  diagramData: {mermaidCode: string; diagramImage: string; prompt: string; diagramType?: string} | null;
  contentData: {content: string; description: string; universal_content: string} | null;
  codeFlowStatus: 'sent' | 'not-sent';
  selection: {
    hasSelection: boolean;
    selectedText: string;
  };
  deepDive: {
    isProcessing: boolean;
    response: string | null;
    history: Array<{
      selectedText: string;
      question: string;
      response: string;
      timestamp: number;
    }>;
  };
  setupSelectionHandler: (container: HTMLElement) => void;
  handleDeepDiveAsk: (question: string) => void;
  clearSelection: () => void;
  handleSaveText: () => void;
  handleSavePNG: () => void;
  diagramViewTab: 'visual' | 'text';
  setDiagramViewTab: (tab: 'visual' | 'text') => void;
  clusters: ClusterNode | null;
  setClusters: (clusters: ClusterNode | null) => void;
  selectedClusterIds: string[];
  setSelectedClusterIds: (ids: string[]) => void;
  exposedClusterId?: string;
  setExposedClusterId: (id?: string) => void;
  isLoading: boolean;
}

export default function SearchResults({
  searchQuery,
  setSearchQuery,
  onSearch,
  isDark,
  toggleTheme,
  sidebarOpen,
  setSidebarOpen,
  onBackToHome,
  currentTab,
  setCurrentTab,
  diagram,
  diagramData,
  contentData,
  codeFlowStatus,
  selection,
  deepDive,
  setupSelectionHandler,
  handleDeepDiveAsk,
  clearSelection,
  handleSaveText,
  handleSavePNG,
  diagramViewTab,
  setDiagramViewTab,
  clusters,
  setClusters,
  selectedClusterIds,
  setSelectedClusterIds,
  setExposedClusterId,
  isLoading
}: SearchResultsProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const mermaidRef = useRef<MermaidRef>(null);
  const radialEnabled = diagramData?.diagramType === "radial_mindmap";
  const alignCleanupRef = useRef<null | (() => void)>(null);

  // Cluster lazy loading hook
  const { loadClusterChildren } = useClusterLazyLoading(clusters, setClusters);

  // Helper function to find cluster by ID
  const findClusterById = (root: ClusterNode | null, id: string): ClusterNode | null => {
    if (!root) return null;
    if (root.id === id) return root;
    if (root.children) {
      for (const child of root.children) {
        const found = findClusterById(child, id);
        if (found) return found;
      }
    }
    return null;
  };

  // Debug logging
  console.log('🔍 SearchResults: diagramData?.diagramType:', diagramData?.diagramType, 'enabled:', diagramData?.diagramType === "radial_mindmap");
  console.log('🔍 SearchResults: diagram:', diagram);
  console.log('🔍 SearchResults: diagramData?.mermaidCode:', diagramData?.mermaidCode);
  console.log('🔍 SearchResults: clusters:', clusters);
  console.log('🔍 SearchResults: diagramViewTab:', diagramViewTab);
  console.log('🔍 SearchResults: isLoading:', isLoading);
  console.log('🔍 SearchResults: hasDiagram:', !!(diagram || diagramData?.mermaidCode));
  console.log('🔍 SearchResults: hasClusters:', !!clusters);
  
  // Cleanup alignment on unmount
  useEffect(() => {
    return () => {
      try { alignCleanupRef.current?.(); } catch {}
    };
  }, []);

  // Removed old radial overlay sync/injection; alignment handles positioning
  
  return (
    <motion.div 
      key="search"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="w-full"
    >
      <Header 
        searchQuery={searchQuery} 
        setSearchQuery={setSearchQuery} 
        onSearch={onSearch} 
        isDark={isDark} 
        toggleTheme={toggleTheme} 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen}
        showResults={true}
        onBackToHome={onBackToHome}
        diagramViewTab={diagramViewTab}
        setDiagramViewTab={setDiagramViewTab}
      />
      
      <div className="flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        {/* HexaWorker Component - Static hexagon removed, only iframe functionality */}
        <div className="fixed left-4 top-[60%] transform -translate-y-1/2 z-50">
          <HexaWorker 
            codeFlowStatus={codeFlowStatus} 
            diagramData={diagramData} 
          />
        </div>
        
        <main className="flex-1 transition-all duration-500 ml-36 lg:ml-40">
          <div className="flex justify-center pt-2 pb-4 px-4">
            <div className="w-full max-w-6xl space-y-2">

              {/* Diagram Container */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl pt-2 pb-6 px-6">
                <div className="space-y-2">
                  {/* Content based on selected tab */}
                  {diagramViewTab === 'visual' && clusters ? (
                    // Show FoamTree when in visual tab and cluster data is available
                    <div className="relative">
                      <div className="h-[70vh] rounded bg-white dark:bg-gray-900">
                        <FoamTreeView
                          data={clusters}
                          onSelect={setSelectedClusterIds}
                          onOpen={loadClusterChildren}
                          onExpose={setExposedClusterId}
                          className="w-full h-full"
                        />
                      </div>
                      {/* Cluster items panel */}
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
                                  <a 
                                    href={item.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 dark:text-blue-400 hover:underline block"
                                  >
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
                  ) : diagramViewTab === 'visual' ? (
                    isLoading ? (
                      <div className="rounded bg-white dark:bg-gray-900 p-8 text-center">
                        <div className="mb-2">
                          <img 
                            src="/textchart-icon.png" 
                            alt="Textchart" 
                            className="w-16 h-16 mx-auto"
                          />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400">Generating visual content...</p>
                      </div>
                    ) : (diagram || diagramData?.mermaidCode) ? (
                      <div className="relative">
                        <div ref={hostRef} className="diagram-viewport rounded bg-white dark:bg-gray-900 p-2 mermaid-container" style={{ position: "relative" }}>
                          <Mermaid 
                            ref={mermaidRef}
                            code={diagram || diagramData?.mermaidCode || ''} 
                            onRender={(svgElement) => {
                              // Update the SVG ref for the overlay
                              (svgRef as any).current = svgElement;
                              console.log('🔍 SearchResults: SVG ref updated via onRender:', svgElement);
                              // Ensure any legacy overlay is removed
                              const legacy = document.querySelector('.central-search-overlay') as HTMLElement | null;
                              if (legacy) {
                                try { legacy.remove(); } catch {}
                              }
                              // Align radial diagram to sticky search bar (no extra overlay)
                              const looksRadial = !!svgElement?.querySelector('[data-id="A"], g[id^="flowchart-A"], #A, .node#A, .node[id*="-A"], [id$="-A"]');
                              if ((radialEnabled || looksRadial) && svgElement && hostRef.current) {
                                try {
                                  // Cleanup any previous alignment observers
                                  alignCleanupRef.current?.();
                                  alignCleanupRef.current = setupRadialAlignment(svgElement, hostRef.current, {
                                    paddingPercent: 0.05,
                                    minScale: 0.6,
                                  });
                                } catch (e) {
                                  console.warn('[SearchResults] radial alignment failed:', e);
                                }
                              }
                            }}
                            onSetupSelection={(container) => {
                              setupSelectionHandler(container);
                            }}
                          />
                          {/* Radial overlay removed in favor of alignment */}
                        </div>
                        {/* Save PNG Button - positioned on the right side */}
                        <div className="absolute bottom-2 right-2">
                          <button
                            onClick={handleSavePNG}
                            className="px-4 py-2 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-black dark:text-white text-sm font-medium rounded-lg transition-colors shadow-md border border-gray-200 dark:border-gray-600"
                            title="Save as PNG image"
                          >
                            Save PNG
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded bg-white dark:bg-gray-900 p-8 text-center">
                        <div className="mb-2">
                          <img 
                            src="/textchart-icon.png" 
                            alt="Textchart" 
                            className="w-16 h-16 mx-auto"
                          />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400">Loading visual content...</p>
                      </div>
                    )
                  ) : (
                    <div className="relative rounded bg-white dark:bg-gray-900 p-6">
                      {contentData && contentData.universal_content ? (
                        <div className="space-y-4">
                          <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap prose max-w-none">
                            {contentData.universal_content}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center text-gray-500 dark:text-gray-400">
                          <p>No text content available</p>
                        </div>
                      )}
                      {/* Save Text Button - positioned in bottom right corner */}
                      {contentData && contentData.universal_content && (
                        <div className="absolute bottom-4 right-4">
                          <button
                            onClick={handleSaveText}
                            className="px-4 py-2 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-black dark:text-white text-sm font-medium rounded-lg transition-colors shadow-md border border-gray-200 dark:border-gray-600"
                            title="Save as text file"
                          >
                            Save text
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Deep Dive Panel */}
              {selection.hasSelection && (
                <DeepDive
                  selectedText={selection.selectedText}
                  isProcessing={deepDive.isProcessing}
                  response={deepDive.response}
                  history={deepDive.history}
                  onAsk={handleDeepDiveAsk}
                  onClose={clearSelection}
                />
              )}
            </div>
          </div>
        </main>
      </div>
      
      {/* Bottom Navigation */}
      <Tabs currentTab={currentTab} setCurrentTab={setCurrentTab} position="bottom" />
    </motion.div>
  );
}

