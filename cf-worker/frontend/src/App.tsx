import { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import LandingPage from './components/LandingPage';
import SearchResults from './components/SearchResults';
import { Tabs } from './components/Tabs';
import { HexaWorker } from './components/HexaWorker';
import { AutoDemoController } from './components/AutoDemo/AutoDemoController';
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
  const [autoDemoMode, setAutoDemoMode] = useState(false);
  const [demoNarration, setDemoNarration] = useState<string | null>(null);
  
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
    clusters,
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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get('demo') === 'auto') {
      if (location.pathname !== '/') {
        navigate('/');
      }
      setAutoDemoMode(true);
    }
  }, []);

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

  const handleStartAutoDemo = () => {
    if (autoDemoMode) {
      return;
    }
    if (location.pathname !== '/') {
      navigate('/');
    }
    setAutoDemoMode(true);
  };

  const handleAutoDemoExit = () => {
    setAutoDemoMode(false);
    setDemoNarration(null);
  };

  const handleDemoNarration = (text: string | null) => {
    setDemoNarration(text);
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
      <AutoDemoController
        isActive={autoDemoMode}
        onExit={handleAutoDemoExit}
        onComplete={handleAutoDemoExit}
        onNarration={handleDemoNarration}
      />

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

      {currentTab === 'Map' && (
        <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50">
          <div className="w-full h-full">
            <iframe
              src="https://infflow-map.prabhatravib.workers.dev/"
              className="w-full h-full border-0"
              title="Map"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {currentTab !== 'News' && currentTab !== 'Map' && (
        <AnimatePresence mode="wait">
          {!showResults ? (
            <LandingPage
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSearch={handleSearch}
              isDark={isDark}
              toggleTheme={toggleTheme}
              diagramViewTab={diagramViewTab}
              setDiagramViewTab={setDiagramViewTab}
              showResults={showResults}
              currentTab={currentTab}
              onStartAutoDemo={handleStartAutoDemo}
              autoDemoActive={autoDemoMode}
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
              diagram={diagram}
              diagramData={diagramData}
              contentData={contentData}
              selection={selection}
              deepDive={deepDive}
              setupSelectionHandler={setupSelectionHandler}
              handleDeepDiveAsk={handleDeepDiveAsk}
              clearSelection={clearSelection}
              diagramViewTab={diagramViewTab}
              setDiagramViewTab={setDiagramViewTab}
              clusters={clusters}
              setClusters={setClusters}
              currentTab={currentTab}
              onStartAutoDemo={handleStartAutoDemo}
              autoDemoActive={autoDemoMode}
            />
          )}
        </AnimatePresence>
      )}
      
      {/* HexaWorker - Always rendered outside transition container for stable positioning */}
      {currentTab !== 'News' && currentTab !== 'Map' && showResults && (
        <div className="hexa-worker-fixed">
          <HexaWorker
            codeFlowStatus={CodeFlowStatus}
            diagramData={diagramData}
            autoDemoMode={autoDemoMode}
            demoNarration={demoNarration}
          />
        </div>
      )}
      
      {/* Bottom Navigation - Always rendered outside transition container */}
      <Tabs 
        key={`tabs-${diagramViewTab}`}
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        position="bottom"
        diagramViewTab={diagramViewTab}
        setDiagramViewTab={setDiagramViewTab}
        showResults={showResults}
        showSearch={true}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearch={handleSearch}
        handleSavePNG={handleSavePNG}
        handleSaveText={handleSaveText}
        showSaveButtons={showResults}
      />
        </div>;
}
