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
  // Clean up any existing search bars immediately when component mounts
  useEffect(() => {
    const existingOverlay = document.querySelector('.central-search-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
      console.log('[SearchResults] Cleaned up existing search bar on component mount');
    }
  }, []);
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

    // Don't inject old-style search bar - the new styled one is already created
    // The SVG will render behind the existing fixed search bar
  }, [radialEnabled]);

  // Create persistent search bar immediately when radial is enabled and visual tab is active
  useEffect(() => {
    if (radialEnabled && diagramViewTab === 'visual') {
      // Check if search bar already exists, if so, just update its value instead of recreating
      const existingOverlay = document.querySelector('.central-search-overlay');
      if (existingOverlay) {
        const input = existingOverlay.querySelector('input');
        if (input && input.value !== searchQuery) {
          input.value = searchQuery;
        }
        console.log('[SearchResults] Updated existing search bar value');
        return; // Don't recreate, just update
      }
      console.log('[SearchResults] Creating persistent search bar at screen center');
      
      // Create search bar directly without waiting for SVG
      const searchBar = document.createElement('div');
      searchBar.className = 'central-search-overlay';
      
      // Calculate screen center position (shorter width than landing page)
      const searchBarWidth = 400; // Shorter than landing page but wider than before
      const searchBarHeight = 56; // Match landing page height
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const left = (viewportWidth - searchBarWidth) / 2;
      const top = (viewportHeight - searchBarHeight) / 2;
      
      // Match landing page styling
      searchBar.style.cssText = `
        position: fixed;
        left: ${left}px;
        top: ${top}px;
        width: ${searchBarWidth}px;
        height: ${searchBarHeight}px;
        display: flex;
        align-items: center;
        z-index: 10000;
        pointer-events: auto;
        background: white;
        border-radius: 24px;
        border: 1px solid rgba(229, 231, 235, 0.6);
        transition: all 0.3s ease;
      `;
      
      // Create input matching landing page
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Explore visually...';
      input.value = searchQuery;
      input.setAttribute('data-central-search-input', 'true');
      input.style.cssText = `
        flex: 1;
        padding: 14px 24px;
        border: none;
        outline: none;
        background: transparent;
        font-size: 18px;
        color: #111827;
        font-weight: 400;
      `;
      
      // Create mic button
      const micButton = document.createElement('button');
      micButton.innerHTML = `
        <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
        </svg>
      `;
      micButton.style.cssText = `
        padding: 10px;
        background: transparent;
        border: none;
        border-radius: 16px;
        cursor: pointer;
        transition: background-color 0.2s;
      `;
      micButton.addEventListener('mouseenter', () => {
        micButton.style.backgroundColor = '#f3f4f6';
      });
      micButton.addEventListener('mouseleave', () => {
        micButton.style.backgroundColor = 'transparent';
      });
      
      // Create image button
      const imageButton = document.createElement('button');
      imageButton.innerHTML = `
        <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
        </svg>
      `;
      imageButton.style.cssText = `
        padding: 10px;
        background: transparent;
        border: none;
        border-radius: 16px;
        cursor: pointer;
        transition: background-color 0.2s;
      `;
      imageButton.addEventListener('mouseenter', () => {
        imageButton.style.backgroundColor = '#f3f4f6';
      });
      imageButton.addEventListener('mouseleave', () => {
        imageButton.style.backgroundColor = 'transparent';
      });
      
      // Create search button matching landing page
      const searchButton = document.createElement('button');
      searchButton.innerHTML = `
        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
      `;
      searchButton.style.cssText = `
        padding: 10px;
        margin-right: 8px;
        background: #111827;
        border: none;
        border-radius: 16px;
        cursor: pointer;
        transition: background-color 0.2s;
      `;
      searchButton.addEventListener('mouseenter', () => {
        searchButton.style.backgroundColor = '#374151';
      });
      searchButton.addEventListener('mouseleave', () => {
        searchButton.style.backgroundColor = '#111827';
      });
      
      // Assemble the search bar (matching landing page order)
      searchBar.appendChild(input);
      searchBar.appendChild(micButton);
      searchBar.appendChild(imageButton);
      searchBar.appendChild(searchButton);
      
      // Add event handlers
      input.addEventListener('input', (e) => {
        setSearchQuery((e.target as HTMLInputElement).value);
      });
      
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onSearch(input.value);
        }
      });
      
      // Search button click handler
      searchButton.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        onSearch(input.value);
      };
      
      // Mic button click handler (placeholder)
      micButton.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        // TODO: Implement voice input
        console.log('Voice input clicked');
      };
      
      // Image button click handler (placeholder)
      imageButton.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        // TODO: Implement image input
        console.log('Image input clicked');
      };
      
      // Add to document body
      document.body.appendChild(searchBar);
      
      // Store cleanup function
      (searchBar as any)._cleanup = () => {
        // No additional cleanup needed for this simple approach
      };
      
      console.log('[SearchResults] Persistent search bar created at screen center');
    }
  }, [radialEnabled, diagramViewTab, setSearchQuery, onSearch]);

  // Remove search bar when switching to text tab
  useEffect(() => {
    if (radialEnabled && diagramViewTab === 'text') {
      const existingOverlay = document.querySelector('.central-search-overlay');
      if (existingOverlay) {
        existingOverlay.remove();
        console.log('[SearchResults] Removed search bar for text tab');
      }
    }
  }, [radialEnabled, diagramViewTab]);

  // Debug logging
  console.log('🔍 SearchResults: diagramData?.diagramType:', diagramData?.diagramType, 'enabled:', diagramData?.diagramType === "radial_mindmap");
  
  // No longer need the old setupCentralSearchListeners since we create search bar directly

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

  // No longer need mutation observer since search bar is created directly and persists

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
        console.log('[SearchResults] Cleaned up search bar on component unmount');
      }
    };
  }, []);

  // Additional cleanup on page navigation - remove search bar when leaving search results
  useEffect(() => {
    const handleBeforeUnload = () => {
      const overlay = document.querySelector('.central-search-overlay');
      if (overlay) {
        overlay.remove();
        console.log('[SearchResults] Cleaned up search bar on page navigation');
      }
    };

    // Clean up on page visibility change (when user navigates away)
    document.addEventListener('visibilitychange', handleBeforeUnload);
    
    return () => {
      document.removeEventListener('visibilitychange', handleBeforeUnload);
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
                        <div ref={hostRef} className="diagram-viewport rounded bg-white dark:bg-gray-900 p-2 mermaid-container" style={{ position: "relative", marginRight: '5px', minHeight: '400px', width: '100%' }}>
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
                      <div className="rounded bg-white dark:bg-gray-900 p-8 text-center" style={{ minHeight: '400px', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
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

