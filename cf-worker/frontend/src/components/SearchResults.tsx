import { motion } from 'framer-motion';
import { useState, useMemo } from 'react';
import { Header } from './Header';
import { Tabs } from './Tabs';
import { Sidebar } from './Sidebar';
import { DeepDive } from './DeepDive';
import { HexaWorker } from './HexaWorker';
import CentralSearchBar from './CentralSearchBar';
import DiagramView from './DiagramView';
import type { ClusterNode } from '../types/cluster';
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
          {/* Central Search Bar Management */}
          <CentralSearchBar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onSearch={onSearch}
            radialEnabled={radialEnabled}
            diagramViewTab={diagramViewTab}
          />
          
          {/* Content based on selected tab */}
          {diagramViewTab === 'visual' ? (
            <DiagramView
              diagramViewTab={diagramViewTab}
              clusters={clusters}
              diagram={diagram}
              diagramData={diagramData}
              radialEnabled={radialEnabled}
              searchQuery={searchQuery}
              onSearch={onSearch}
              setupSelectionHandler={setupSelectionHandler}
              handleSavePNG={handleSavePNG}
              selectedClusterIds={selectedClusterIds}
              setSelectedClusterIds={setSelectedClusterIds}
              loadClusterChildren={loadClusterChildren}
              findClusterById={findClusterById}
            />
          ) : (
            <div className="relative p-6">
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

