import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Mic, Image, Moon, Sun } from 'lucide-react';
import { Header } from './components/Header';
import { Tabs } from './components/Tabs';
import { Sidebar } from './components/Sidebar';
import Logo from './components/Logo';
import Mermaid from './components/Mermaid';
import { describe } from './lib/api';

interface SearchResult {
  id: string;
  title: string;
  url: string;
  snippet: string;
  domain: string;
  favicon: string;
}


// @component: InfflowApp
export default function App() {
  const [currentTab, setCurrentTab] = useState('Web');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [diagram, setDiagram] = useState<string | null>(null);

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    setIsSearching(true);
    setShowResults(true);
    try {
      const res = await describe(query);
      console.log('API Response:', res); // Debug logging
      
      // Create search results based on the actual query
      const searchResults = [{
        id: '1',
        title: `Results for "${query}"`,
        url: '#',
        snippet: res.description || 'Generated content based on your query',
        domain: 'infflow.ai',
        favicon: '🔍'
      }];
      
      setResults(searchResults);
      
      // Set the diagram
      if (res.render_type === 'html') {
        setDiagram(res.rendered_content);
      } else {
        setDiagram(res.diagram || res.rendered_content || null);
      }
    } catch (e) {
      console.error('Search error:', e); // Debug logging
      // Show error in search results
      setResults([{
        id: 'error',
        title: 'Error generating results',
        url: '#',
        snippet: `Failed to process query: ${e instanceof Error ? e.message : 'Unknown error'}`,
        domain: 'error',
        favicon: '❌'
      }]);
      setDiagram(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleBackToHome = () => {
    setShowResults(false);
    setSearchQuery('');
    setResults([]);
    setDiagram(null);
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
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
            
            <div className="w-full max-w-4xl">
                <div className="text-center mb-16">
                  <div className="flex items-center justify-center mb-12">
                    <Logo size="xl" variant="full" />
                  </div>
                  <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-6">
                    Answers, you can See!
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 text-2xl font-light">
                    Ask anything. Get responses in Textcharts.
                  </p>
                </div>
                
                <div className="relative mb-16">
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
                
                <div className="flex flex-wrap justify-center gap-4">
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
                    <div className="flex gap-8 p-8">
                      <div className="flex-1 max-w-2xl">
                        <div className="mb-4">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            <span>About {results.length} results</span>
                          </p>
                        </div>
                        
                        <div className="space-y-6">
                          {isSearching ? Array.from({
                            length: 3
                          }).map((_, i) => <div key={i} className="animate-pulse">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-1"></div>
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                          </div>) : results.map(result => <motion.div key={result.id} initial={{
                            opacity: 0,
                            y: 20
                          }} animate={{
                            opacity: 1,
                            y: 0
                          }} className="group">
                            <div className="flex items-start gap-3 mb-1">
                              <span className="text-lg">{result.favicon}</span>
                              <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  <span>{result.domain}</span>
                                </p>
                              </div>
                            </div>
                            <h3 className="text-xl text-blue-600 dark:text-blue-400 hover:underline cursor-pointer mb-1">
                              <span>{result.title}</span>
                            </h3>
                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                              <span>{result.snippet}</span>
                            </p>
                          </motion.div>)}
                        </div>
                      </div>
                      
                      <div className="w-96 bg-gray-50 dark:bg-gray-800 rounded-2xl p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                          <span>infflow Answer</span>
                        </h3>
                        <div className="space-y-4">
                          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            <span>Based on the search results, here's a comprehensive overview of the topic you're exploring.</span>
                          </p>
                          {diagram ? <div className="rounded bg-white dark:bg-gray-900 p-2"><Mermaid code={diagram} /></div> : <div className="rounded bg-white dark:bg-gray-900 p-8 text-center">
                            <div className="text-4xl mb-2">📊</div>
                            <p className="text-gray-500 dark:text-gray-400">Textchart will appear here</p>
                          </div>}
                          <div className="flex gap-2">
                            <button className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm">
                              <span>Text</span>
                            </button>
                            <button className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm">
                              <span>Flowchart</span>
                            </button>
                            <button className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm">
                              <span>Images</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </main>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>;
}
