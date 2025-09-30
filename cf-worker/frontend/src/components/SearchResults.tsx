import { motion } from 'framer-motion';
import { useState, useMemo } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { DeepDive } from './DeepDive';
import { RadialBarOverlay } from './RadialBarOverlay';
import { SearchBar } from './SearchBar';
import DiagramView from './DiagramView';
import { ExternalLinksSection } from './ExternalLinksSection';
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
  diagram: string | null;
  diagramData: { mermaidCode: string; diagramImage: string; prompt: string; diagramType?: string; diagram_meta?: any } | null;
  contentData: { content: string; description: string; universal_content: string } | null;
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
  diagramViewTab: 'visual' | 'text';
  setDiagramViewTab: (tab: 'visual' | 'text') => void;
  clusters: ClusterNode | null;
  setClusters: (c: ClusterNode | null) => void;
  currentTab: string;
  onStartAutoDemo?: () => void;
  autoDemoActive?: boolean;
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
  diagram,
  diagramData,
  contentData,
  selection,
  deepDive,
  setupSelectionHandler,
  handleDeepDiveAsk,
  clearSelection,
  diagramViewTab,
  setDiagramViewTab,
  clusters,
  setClusters,
  currentTab,
  onStartAutoDemo,
  autoDemoActive,
}: SearchResultsProps) {
  const mermaidSrc = diagramData?.mermaidCode || diagram || '';
  const looksRadial = /\bgraph|flowchart\b/i.test(mermaidSrc) && /\bA\(/.test(mermaidSrc);
  const radialEnabled = diagramData?.diagramType === 'radial_mindmap' || looksRadial;
  const [selectedClusterIds, setSelectedClusterIds] = useState<string[]>([]);
  const { loadClusterChildren } = useClusterLazyLoading(clusters, setClusters);

  const [externalLinksQuery, setExternalLinksQuery] = useState<string | null>(null);
  const [externalLinksMeta, setExternalLinksMeta] = useState<any>(null);

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

  const handleExternalLinksRequest = (query: string, meta?: any) => {
    console.log('[SearchResults] External links requested for query:', query, 'meta:', meta);
    setExternalLinksQuery(query);
    setExternalLinksMeta(meta);
  };

  const handleCloseExternalLinks = () => {
    setExternalLinksQuery(null);
    setExternalLinksMeta(null);
  };

  return (
    <motion.div
      key="search"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
      className="search-results-root w-full"
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
        currentTab={currentTab}
        onStartAutoDemo={onStartAutoDemo}
        autoDemoActive={autoDemoActive}
      />

      <div className="flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 transition-all duration-500 ml-16 lg:ml-24">
          {radialEnabled && diagramViewTab === 'visual' && (
            <RadialBarOverlay>
              <SearchBar
                size="compact"
                value={searchQuery}
                onChange={setSearchQuery}
                onSubmit={onSearch}
                autoFocus={false}
              />
            </RadialBarOverlay>
          )}

          {diagramViewTab === 'visual' ? (
            <DiagramView
              diagramViewTab={diagramViewTab}
              clusters={clusters}
              diagram={diagram}
              radialEnabled={radialEnabled}
              searchQuery={searchQuery}
              setupSelectionHandler={setupSelectionHandler}
              selectedClusterIds={selectedClusterIds}
              setSelectedClusterIds={setSelectedClusterIds}
              loadClusterChildren={loadClusterChildren}
              findClusterById={findClusterById}
              diagramMeta={diagramData?.diagram_meta}
              onExternalLinksRequest={handleExternalLinksRequest}
            />
          ) : (
            <div className="relative pl-16 pr-6 py-6">
              {contentData && contentData.universal_content ? (
                <div className="space-y-4">
                  <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap prose max-w-none">
                    {contentData.universal_content.replace(/\*\*(.*?)\*\*/g, '$1')}
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <p>No text content available</p>
                </div>
              )}
            </div>
          )}

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

      {externalLinksQuery && diagramViewTab === 'visual' && (
        <div className="fixed bottom-16 left-[85%] transform -translate-x-1/2 w-[60%] z-40 max-h-[40vh] overflow-y-auto">
          <ExternalLinksSection
            query={externalLinksQuery}
            meta={externalLinksMeta}
            onClose={handleCloseExternalLinks}
          />
        </div>
      )}
    </motion.div>
  );
}
