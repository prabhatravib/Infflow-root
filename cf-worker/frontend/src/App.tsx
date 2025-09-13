import { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import LandingPage from './components/LandingPage';
import SearchResults from './components/SearchResults';
import { useSelection } from './hooks/use-selection';
import { describe, callDeepDiveApi } from './lib/api';
import { exportDiagramAsText, exportDiagramAsPNG } from './utils/export-utils';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

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
  const [diagramData, setDiagramData] = useState<{mermaidCode: string; diagramImage: string; prompt: string; diagramType?: string} | null>(null);
  const [contentData, setContentData] = useState<{content: string; description: string; universal_content: string} | null>(null);
  const [diagramViewTab, setDiagramViewTab] = useState<'visual' | 'text'>('visual');
  const debouncedTimer = useRef<number | null>(null);
  const lastInitialSearchDone = useRef(false);
  // Selection and deep dive functionality
  const {
    selection,
    deepDive,
    clearSelection,
    setupSelectionHandler,
    askDeepDive,
  } = useSelection();

  const handleSearch = async (query: string, options: { navigate?: boolean } = { navigate: true }) => {
    if (!query.trim()) return;
    // Ensure UI state mirrors the first successful search every time
    const cleaned = query.trim();
    setSearchQuery(cleaned);
    // Ensure URL reflects the query. Also update when already on /search.
    if (options.navigate !== false) {
      const params = new URLSearchParams(location.search);
      params.set('q', cleaned);
      navigate(`/search?${params.toString()}`, { replace: false });
    }
    clearSelection();
    setCodeFlowStatus('not-sent');
    setDiagramViewTab('visual');
 // Reset status when starting new search
    try {
      const res = await describe(cleaned);
      console.log('API Response:', res); // Debug logging
      
      // Set the diagram
      if (res.render_type === 'html') {
        setDiagram(res.rendered_content);
      } else {
        setDiagram(res.diagram || res.rendered_content || null);
      }

      // Set content data for text tab
      if (res.content || res.description || res.universal_content) {
        setContentData({
          content: res.content || '',
          description: res.description || '',
          universal_content: res.universal_content || ''
        });
      }

      // Set diagram data for HexaWorker
      if (res.diagram) {
        const newDiagramData = {
          mermaidCode: res.diagram,
          diagramImage: res.diagram, // For now, using the same value
          prompt: cleaned,
          diagramType: res.diagram_type
        };
        setDiagramData(newDiagramData);
        
        // Send external data to hexa worker
        handleDiscussionRequest(newDiagramData);
      }
    } catch (e) {
      console.error('Search error:', e); // Debug logging
      setDiagram(null);
      setDiagramData(null);
      setContentData(null);
    }
  };

  const handleBackToHome = () => {
    navigate('/visual', { replace: false });
    setSearchQuery('');
    setDiagram(null);
    setDiagramData(null);
    setContentData(null);
    setCodeFlowStatus('not-sent');
    setDiagramViewTab('visual');
    clearSelection();
  };

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
      handleSearch(q, { navigate: false });
    }
  }, [location.pathname]);

  // Send diagram data to hexagon worker via HTTP API
  const handleDiscussionRequest = async (diagramContext: {mermaidCode: string; diagramImage: string; prompt: string}) => {
    console.log('Hexagon discussion started for diagram:', diagramContext);
    
    try {
      const response = await fetch('https://hexa-worker.prabhatravib.workers.dev/api/external-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mermaidCode: diagramContext.mermaidCode,
          diagramImage: diagramContext.diagramImage,
          prompt: diagramContext.prompt,
          type: 'diagram'
        })
      });

      if (!response.ok) {
        if (response.status === 409) {
          console.error('❌ 409 Conflict: Hexagon worker rejected the diagram data');
          const errorText = await response.text();
          throw new Error(`Hexagon worker rejected data: ${errorText}`);
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Diagram data sent to hexagon worker:', result);
      
      // Update status to show "Basic Details Sent"
      setCodeFlowStatus('sent');
      console.log('🔄 Status updated to: Basic Details Sent');
    } catch (error) {
      console.error('❌ Error sending data to hexagon worker:', error);
    }
  };

  const handleDeepDiveAsk = async (question: string) => {
    await askDeepDive(question, async (params) => {
      // Call the real deep dive API endpoint
      const response = await callDeepDiveApi({
        selected_text: params.selectedText,
        question: params.question,
        original_query: searchQuery
      });
      return response;
    });
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const handleSaveText = async () => {
    try {
      // Check if we have universal content to save (Text tab)
      if (contentData && contentData.universal_content) {
        const contentLines = [];
        contentLines.push(`Query: "${searchQuery}"`);
        contentLines.push(`Generated: ${new Date().toLocaleString()}`);
        contentLines.push('');
        contentLines.push('--- Content ---');
        contentLines.push('');
        contentLines.push(contentData.universal_content);

        const fileContent = contentLines.join('\n');
        const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
        
        const date = new Date();
        const timestamp = date.toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `infflow-text-${timestamp}.txt`;
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 250);
        
        return;
      }
      
      // Fallback: try to save diagram text if available
      if (!diagram) {
        alert('No content to save');
        return;
      }
      
      const diagramContainer = document.querySelector('.mermaid-container');
      const svg = diagramContainer?.querySelector('svg');
      if (!svg) {
        alert('No diagram image found to save');
        return;
      }
      await exportDiagramAsText(svg, searchQuery);
    } catch (error) {
      console.error('Failed to save text:', error);
      alert('Failed to save text content');
    }
  };

  const handleSavePNG = async () => {
    if (!diagram) {
      alert('No diagram to save');
      return;
    }
    try {
      // Find the SVG element directly (overlay is excluded automatically)
      const svg = document.querySelector('.diagram-viewport svg') as SVGSVGElement;
      if (!svg) {
        alert('No SVG element found to save');
        return;
      }
      await exportDiagramAsPNG(svg);
    } catch (error) {
      console.error('Failed to save PNG:', error);
      alert('Failed to save PNG image');
    }
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
          />
        )}
          </AnimatePresence>
        </div>;
}
