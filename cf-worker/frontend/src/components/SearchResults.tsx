import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { Header } from './Header';
import { Tabs } from './Tabs';
import { Sidebar } from './Sidebar';
import Mermaid, { MermaidRef } from './Mermaid';
import { DeepDive } from './DeepDive';
import { HexaWorker } from './HexaWorker';
import RadialSearchOverlay from './RadialSearchOverlay';
import { injectSearchBarIntoNodeA, setupCentralSearchListeners, updateCentralSearchValue } from '../utils/svg-inject-search';

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
  setDiagramViewTab
}: SearchResultsProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const mermaidRef = useRef<MermaidRef>(null);
  const radialEnabled = diagramData?.diagramType === "radial_mindmap";

  // Debug logging
  console.log('🔍 SearchResults: diagramData?.diagramType:', diagramData?.diagramType, 'enabled:', diagramData?.diagramType === "radial_mindmap");
  
  // Set up global event listeners for central search
  useEffect(() => {
    if (radialEnabled) {
      console.log('[SearchResults] Setting up central search listeners');
      setupCentralSearchListeners(
        (value: string) => {
          console.log('[SearchResults] Central search onChange:', value);
          setSearchQuery(value);
        },
        (value: string) => {
          console.log('[SearchResults] Central search onSubmit:', value);
          onSearch(value);
        }
      );
    }
  }, [radialEnabled, setSearchQuery, onSearch]);

  // Sync the injected search bar value when searchQuery changes
  useEffect(() => {
    if (!radialEnabled) return;
    const svg = svgRef.current;
    if (!svg) return;
    
    console.log('[SearchResults] Syncing central search value:', searchQuery);
    updateCentralSearchValue(svg, searchQuery);
  }, [radialEnabled, searchQuery]);

  // Re-inject when SVG changes
  useEffect(() => {
    if (!radialEnabled) return;
    const svg = svgRef.current;
    if (!svg) return;

    const observer = new MutationObserver(() => {
      const input = svg.querySelector('input[data-central-search-input]');
      if (!input) {
        console.log('[SearchResults] Re-injecting search bar after SVG change');
        injectSearchBarIntoNodeA(svg, {
          defaultValue: searchQuery,
          onSubmit: onSearch,
          onChange: setSearchQuery
        });
      }
    });

    observer.observe(svg, {
      childList: true,
      subtree: true,
      attributes: false
    });

    return () => observer.disconnect();
  }, [radialEnabled, searchQuery, svgRef.current, onSearch, setSearchQuery]);
  
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
                  {diagramViewTab === 'visual' ? (
                    diagram ? (
                      <div className="relative">
                        <div ref={hostRef} className="diagram-viewport rounded bg-white dark:bg-gray-900 p-2 mermaid-container" style={{ position: "relative" }}>
                          <Mermaid 
                            ref={mermaidRef}
                            code={diagram} 
                            onRender={(svgElement) => {
                              // Update the SVG ref for the overlay
                              (svgRef as any).current = svgElement;
                              console.log('🔍 SearchResults: SVG ref updated via onRender:', svgElement);

                              // Inject search bar directly into SVG (replace node A visuals)
                              if (radialEnabled && svgElement) {
                                try {
                                  injectSearchBarIntoNodeA(svgElement, {
                                    defaultValue: searchQuery,
                                    onSubmit: onSearch,
                                    onChange: setSearchQuery,
                                  });
                                } catch (e) {
                                  console.warn('injectSearchBarIntoNodeA failed:', e);
                                }
                              }
                            }}
                            onSetupSelection={(container) => {
                              setupSelectionHandler(container);
                            }}
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

