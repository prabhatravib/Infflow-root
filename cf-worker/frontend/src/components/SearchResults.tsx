import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { Header } from './Header';
import { Tabs } from './Tabs';
import { Sidebar } from './Sidebar';
import Mermaid, { MermaidRef } from './Mermaid';
import { DeepDive } from './DeepDive';
import { HexaWorker } from './HexaWorker';
import RadialSearchOverlay from './RadialSearchOverlay';
import { FoamTreeView } from './visual/FoamTreeView';
import type { ClusterNode } from '../types/cluster';
import { useState, useMemo, useCallback } from 'react';
import { useClusterLazyLoading } from '../hooks/use-cluster-lazy-loading';
import { setupCentralSearchListeners } from '../utils/svg-inject-search-overlay';

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
  setClusters: (c: ClusterNode | null) => void;
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
  setClusters
}: SearchResultsProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const mermaidRef = useRef<MermaidRef>(null);
  const radialEnabled = diagramData?.diagramType === "radial_mindmap";
  const [selectedClusterIds, setSelectedClusterIds] = useState<string[]>([]);
  const { loadClusterChildren } = useClusterLazyLoading(clusters, setClusters);

  const findClusterById = useMemo(() => {
    const fn = (root: ClusterNode | null, id: string): ClusterNode | null => {
      if (!root) return null;
      if (root.id === id) return root;
      for (const child of root.children || []) {
        const found = fn(child, id);
        if (found) return found;
      }
      return null;
    };
    return fn;
  }, []);

  // Memoize the onRender callback to prevent Mermaid re-renders
  const handleMermaidRender = useCallback((svgElement: SVGSVGElement) => {
    // Update the SVG ref for the overlay
    (svgRef as any).current = svgElement;
    console.log('🔍 SearchResults: SVG ref updated via onRender:', svgElement);

    // Inject search bar directly into SVG (replace node A visuals)
    if (radialEnabled && svgElement) {
      try {
        if ((window as any).injectCentralSearch) {
          (window as any).injectCentralSearch(svgElement);
        }
      } catch (e) {
        console.warn('injectCentralSearch failed:', e);
      }
    }
  }, [radialEnabled]);

  // Debug logging
  console.log('🔍 SearchResults: diagramData?.diagramType:', diagramData?.diagramType, 'enabled:', diagramData?.diagramType === "radial_mindmap");
  
  // Set up global event listeners for central search
  useEffect(() => {
    if (radialEnabled) {
      console.log('[SearchResults] Setting up central search listeners');
      const { inject } = setupCentralSearchListeners(
        (value: string) => {
          console.log('[SearchResults] Central search onChange:', value);
          setSearchQuery(value);
        },
        (value: string) => {
          console.log('[SearchResults] Central search onSubmit:', value);
          onSearch(value);
        }
      );
      
      // Store the inject function for later use
      (window as any).injectCentralSearch = (svg: SVGSVGElement) => {
        return inject(svg, searchQuery);
      };
    }
  }, [radialEnabled, setSearchQuery, onSearch]);

  // Sync the injected search bar value when searchQuery changes
  useEffect(() => {
    if (!radialEnabled) return;
    
    console.log('[SearchResults] Syncing central search value:', searchQuery);
    // Update the overlay input value if it exists (now globally positioned)
    const overlay = document.querySelector('.central-search-overlay');
    if (overlay) {
      const input = overlay.querySelector('input');
      if (input && input.value !== searchQuery) {
        input.value = searchQuery;
      }
    }
  }, [radialEnabled, searchQuery]);

  // Re-inject when SVG changes
  useEffect(() => {
    if (!radialEnabled) return;
    const svg = svgRef.current;
    if (!svg) return;

    const observer = new MutationObserver(() => {
      const input = document.querySelector('input[data-central-search-input]');
      if (!input) {
        console.log('[SearchResults] Re-injecting search bar after SVG change');
        if ((window as any).injectCentralSearch) {
          (window as any).injectCentralSearch(svg);
        }
      }
    });

    observer.observe(svg, {
      childList: true,
      subtree: true,
      attributes: false
    });

    return () => observer.disconnect();
  }, [radialEnabled]);

  // Cleanup overlay when component unmounts or radial is disabled
  useEffect(() => {
    return () => {
      // Clean up the fixed position overlay when component unmounts
      const overlay = document.querySelector('.central-search-overlay');
      if (overlay) {
        if ((overlay as any)._cleanup) {
          (overlay as any)._cleanup();
        }
        overlay.remove();
      }
    };
  }, []);

  // Cleanup overlay when radial is disabled
  useEffect(() => {
    if (!radialEnabled) {
      const overlay = document.querySelector('.central-search-overlay');
      if (overlay) {
        if ((overlay as any)._cleanup) {
          (overlay as any)._cleanup();
        }
        overlay.remove();
      }
    }
  }, [radialEnabled]);
  
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
          <div className="flex justify-start pt-2 pb-4 px-4">
            <div className="w-full space-y-2" style={{ marginRight: '20px' }}>

              {/* Diagram Container */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl pt-2 pb-6 px-6" style={{ marginRight: '10px' }}>
                <div className="space-y-2">
                  {/* Content based on selected tab */}
                  {diagramViewTab === 'visual' ? (
                    clusters ? (
                      <div className="relative">
                        <div className="h-[70vh] rounded bg-white dark:bg-gray-900" style={{ marginRight: '5px' }}>
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
                    ) : diagram ? (
                      <div className="relative">
                        <div ref={hostRef} className="diagram-viewport rounded bg-white dark:bg-gray-900 p-2 mermaid-container" style={{ position: "relative", marginRight: '5px' }}>
                          <Mermaid 
                            ref={mermaidRef}
                            code={diagram} 
                            onRender={handleMermaidRender}
                            onSetupSelection={setupSelectionHandler}
                          />
                          {/* Overlay disabled when SVG injection is active */}
                          {false && (
                            <RadialSearchOverlay
                              enabled={radialEnabled}
                              svgRef={svgRef}
                              hostRef={hostRef}
                              lastQuery={searchQuery}
                              onSubmit={onSearch}
                            />
                          )}
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
                        <p className="text-gray-500 dark:text-gray-400">Textchart being generated...</p>
                      </div>
                    )
                  ) : (
                    <div className="relative rounded bg-white dark:bg-gray-900 p-6" style={{ marginRight: '5px' }}>
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
      <Tabs 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        position="bottom"
        diagramViewTab={diagramViewTab}
        setDiagramViewTab={setDiagramViewTab}
        showResults={true}
        showSearch={true}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearch={onSearch}
      />
    </motion.div>
  );
}

