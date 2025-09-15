import { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import LandingPage from './components/LandingPage';
import SearchResults from './components/SearchResults';
import { useSelection } from './hooks/use-selection';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { createAppHandlers } from './AppHandlers';

// @component: InfflowApp
export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [currentTab, setCurrentTab] = useState('Web');
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [diagram, setDiagram] = useState<string | null>(null);
  const [CodeFlowStatus, setCodeFlowStatus] = useState<'sent' | 'not-sent'>('not-sent');
  const [diagramData, setDiagramData] = useState<{mermaidCode: string; diagramImage: string; prompt: string; diagramType?: string; diagram_meta?: any} | null>(null);
  const [contentData, setContentData] = useState<{content: string; description: string; universal_content: string} | null>(null);
  const [diagramViewTab, setDiagramViewTab] = useState<'visual' | 'text'>('visual');
  const [clusters, setClusters] = useState<import('./types/cluster').ClusterNode | null>(null);
  
  const debouncedTimer = useRef<number | null>(null);
  const lastInitialSearchDone = useRef(false);
  const lastSearchQuery = useRef<string>('');
  const currentRequestId = useRef<string>('');

  // Selection and deep dive functionality
  const {
    selection,
    deepDive,
    clearSelection,
    setupSelectionHandler,
    askDeepDive,
  } = useSelection();

  // Create handlers using the extracted handler functions
  const { handleSearch, handleBackToHome, handleDeepDiveAsk, handleSaveText, handleSavePNG } = createAppHandlers({
    searchQuery,
    setSearchQuery,
    setDiagram,
    setDiagramData,
    setContentData,
    setClusters,
    setCodeFlowStatus,
    setDiagramViewTab,
    clearSelection,
    navigate,
    location,
    askDeepDive,
    lastSearchQuery,
    currentRequestId,
    contentData,
    diagram
  });

  // Keep searchQuery in sync with URL `q` (initialize and on back/forward)
  useEffect(() => {
    const q = searchParams.get('q') || '';
    setSearchQuery(q);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  // Debounce writing `searchQuery` back to URL while typing
  useEffect(() => {
    // Only replace the URL; avoid stacking history entries while typing
    if (debouncedTimer.current) window.clearTimeout(debouncedTimer.current);
    debouncedTimer.current = window.setTimeout(() => {
      const q = searchParams.get('q') || '';
      if (searchQuery !== q) {
        console.log('[App] Updating URL with query:', searchQuery); // Add debug line
        const params = new URLSearchParams(searchParams);
        if (searchQuery) params.set('q', searchQuery); else params.delete('q');
        // Use replace so typing doesn't pollute history
        navigate({ pathname: location.pathname, search: `?${params.toString()}` }, { replace: true });
      }
    }, 300);
    return () => {
      if (debouncedTimer.current) window.clearTimeout(debouncedTimer.current);
    };
  }, [searchQuery]);

  // On direct navigation to /search with q, perform initial search once
  useEffect(() => {
    const path = location.pathname || '';
    const q = searchParams.get('q') || '';
    if (path === '/search' && q && !lastInitialSearchDone.current) {
      lastInitialSearchDone.current = true;
      console.log('[App] Initial search triggered for:', q);
      // Reset the last search query to allow this initial search
      lastSearchQuery.current = '';
      handleSearch(q, { navigate: false });
    }
  }, [location.pathname]); // Only depend on pathname, not searchParams

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  // Handle click outside to close deep dive
  const handlePageClick = (e: React.MouseEvent) => {
    // Only close if there's an active selection and we're not clicking on the deep dive panel itself
    // Also exclude the central search bar from closing the selection
    if (selection.hasSelection && 
        !(e.target as Element).closest('.deep-dive-panel') &&
        !(e.target as Element).closest('[data-central-search-bar]')) {
      clearSelection();
    }
  };

  // @return
  const showResults = location.pathname === '/search';

  return <div 
    className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300"
    onClick={handlePageClick}
  >
      {/* Centralized Tab Content - Works regardless of current page */}
      {currentTab === 'News' && (
        <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50">
          <div className="w-full h-full">
            <iframe
              src="https://newsbloom.prabhatravib.workers.dev/"
              className="w-full h-full border-0"
              title="News"
              allowFullScreen
            />
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {!showResults ? (
          <LandingPage
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onSearch={handleSearch}
            isDark={isDark}
            toggleTheme={toggleTheme}
            currentTab={currentTab}
            setCurrentTab={setCurrentTab}
            diagramViewTab={diagramViewTab}
            setDiagramViewTab={setDiagramViewTab}
            showResults={showResults}
          />
        ) : (
          <SearchResults
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onSearch={handleSearch}
            isDark={isDark}
            toggleTheme={toggleTheme}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            onBackToHome={handleBackToHome}
            currentTab={currentTab}
            setCurrentTab={setCurrentTab}
            diagram={diagram}
            diagramData={diagramData}
            contentData={contentData}
            codeFlowStatus={CodeFlowStatus}
            selection={selection}
            deepDive={deepDive}
            setupSelectionHandler={setupSelectionHandler}
            handleDeepDiveAsk={handleDeepDiveAsk}
            clearSelection={clearSelection}
            handleSaveText={handleSaveText}
            handleSavePNG={handleSavePNG}
            diagramViewTab={diagramViewTab}
            setDiagramViewTab={setDiagramViewTab}
            clusters={clusters}
            setClusters={setClusters}
          />
        )}
          </AnimatePresence>
        </div>;
}