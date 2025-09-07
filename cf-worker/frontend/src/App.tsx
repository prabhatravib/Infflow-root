import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Mic, Image, Moon, Sun } from 'lucide-react';
import { Header } from './components/Header';
import { Tabs } from './components/Tabs';
import { Sidebar } from './components/Sidebar';
import Logo from './components/Logo';
import Mermaid from './components/Mermaid';
import { DeepDive } from './components/DeepDive';
import { useSelection } from './hooks/use-selection';
import { describe, callDeepDiveApi } from './lib/api';
import { exportDiagramAsText, exportDiagramAsPNG } from './utils/export-utils';

// @component: InfflowApp
export default function App() {
  const [currentTab, setCurrentTab] = useState('Web');
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [diagram, setDiagram] = useState<string | null>(null);
  // Selection and deep dive functionality
  const {
    selection,
    deepDive,
    clearSelection,
    setupSelectionHandler,
    askDeepDive,
  } = useSelection();

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    setShowResults(true);
    clearSelection();
    try {
      const res = await describe(query);
      console.log('API Response:', res); // Debug logging
      
      // Set the diagram
      if (res.render_type === 'html') {
        setDiagram(res.rendered_content);
      } else {
        setDiagram(res.diagram || res.rendered_content || null);
      }
    } catch (e) {
      console.error('Search error:', e); // Debug logging
      setDiagram(null);
    }
  };

  const handleBackToHome = () => {
    setShowResults(false);
    setSearchQuery('');
    setDiagram(null);
    clearSelection();
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
    if (!diagram) {
      alert('No diagram to save');
      return;
    }
    try {
      // Find the SVG element in the diagram container
      const diagramContainer = document.querySelector('.mermaid-container');
      const svg = diagramContainer?.querySelector('svg');
      if (!svg) {
        alert('No diagram image found to save');
        return;
      }
      await exportDiagramAsText(svg, searchQuery);
    } catch (error) {
      console.error('Failed to save text:', error);
      alert('Failed to save diagram text');
    }
  };

  const handleSavePNG = async () => {
    if (!diagram) {
      alert('No diagram to save');
      return;
    }
    try {
      // Find the SVG element in the diagram container
      const diagramContainer = document.querySelector('.mermaid-container');
      const svg = diagramContainer?.querySelector('svg');
      if (!svg) {
        alert('No diagram image found to save');
        return;
      }
      await exportDiagramAsPNG(svg);
    } catch (error) {
      console.error('Failed to save PNG:', error);
      alert('Failed to save diagram as PNG');
    }
  };

  // @return
  return <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      <AnimatePresence mode="wait">
        {!showResults ? (
          // Landing State - Full Screen (No Header/Tabs)
          <motion.div 
            key="landing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="flex flex-col items-center justify-center min-h-screen px-8 relative"
          >
            {/* Floating theme toggle for landing page */}
            <button 
              onClick={toggleTheme} 
              className="absolute top-6 right-6 p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors z-10"
            >
              {isDark ? <Sun className="w-6 h-6 text-gray-600 dark:text-gray-400" /> : <Moon className="w-6 h-6 text-gray-600 dark:text-gray-400" />}
            </button>
            
            {/* Main content container with better vertical centering */}
            <div className="w-full max-w-4xl flex flex-col items-center mt-[8vh]">
              <div className="text-center mb-12">
                <div className="flex items-center justify-center mb-8">
                  <Logo size="xl" variant="full" />
                </div>
                <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
                  Answers, you can See!
                </h1>
                <p className="text-gray-600 dark:text-gray-400 text-2xl font-light">
                  Ask anything. Get responses in Textcharts.
                </p>
              </div>
              
              {/* Search box with better spacing */}
              <div className="relative mb-10 w-full">
                <div className="flex items-center bg-white dark:bg-gray-800 rounded-3xl shadow-2xl shadow-gray-200/30 dark:shadow-gray-900/30 border border-gray-200/60 dark:border-gray-700/60 hover:shadow-3xl hover:shadow-gray-200/40 dark:hover:shadow-gray-900/40 transition-all duration-300">
                  <input 
                    type="text" 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)} 
                    onKeyPress={e => e.key === 'Enter' && handleSearch(searchQuery)} 
                    placeholder="Search, ask, or explore visually…" 
                    className="flex-1 px-10 py-6 text-xl bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400" 
                  />
                  <button className="p-4 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl transition-colors">
                    <Mic className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                  </button>
                  <button className="p-4 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl transition-colors">
                    <Image className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                  </button>
                  <button 
                    onClick={() => handleSearch(searchQuery)} 
                    className="p-4 mr-3 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 rounded-2xl transition-colors"
                  >
                    <Search className="w-6 h-6 text-white dark:text-gray-900" />
                  </button>
                </div>
              </div>
              
              {/* Suggestion chips with better spacing */}
              <div className="flex flex-wrap justify-center gap-3">
                {['Details about Paris', 'Pepsi vs Coke', 'Steps to bake a cake'].map(chip => (
                  <button 
                    key={chip} 
                    onClick={() => {
                      setSearchQuery(chip);
                      handleSearch(chip);
                    }} 
                    className="px-8 py-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200/60 dark:border-gray-700/60 rounded-2xl text-base font-medium text-gray-700 dark:text-gray-300 transition-all duration-200 hover:shadow-lg hover:scale-105"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
            ) : (
              // Search State - With Header and Tabs
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
                  onSearch={handleSearch} 
                  isDark={isDark} 
                  toggleTheme={toggleTheme} 
                  sidebarOpen={sidebarOpen} 
                  setSidebarOpen={setSidebarOpen}
                  showResults={showResults}
                  onBackToHome={handleBackToHome}
                />
                
                <Tabs currentTab={currentTab} setCurrentTab={setCurrentTab} />
                
                <div className="flex">
                  <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
                  
                  <main className="flex-1 transition-all duration-500">
                    <div className="flex justify-center p-4">
                      <div className="w-full max-w-6xl space-y-2">

                        {/* Diagram Container */}
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6">
                          <div className="space-y-4">
                            {diagram ? (
                              <div className="space-y-4">
                                <div className="rounded bg-white dark:bg-gray-900 p-2 mermaid-container">
                                  <Mermaid 
                                    code={diagram} 
                                    onSetupSelection={setupSelectionHandler}
                                  />
                                </div>
                                {/* Save Buttons - Now in their own section */}
                                <div className="flex justify-end gap-2 pt-2">
                                  <button
                                    onClick={handleSaveText}
                                    className="px-4 py-2 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-black dark:text-white text-sm font-medium rounded-lg transition-colors shadow-md border border-gray-200 dark:border-gray-600"
                                    title="Save as text file"
                                  >
                                    Save text
                                  </button>
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
                                <div className="text-4xl mb-2">📊</div>
                                <p className="text-gray-500 dark:text-gray-400">Textchart will appear here</p>
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>;
}
