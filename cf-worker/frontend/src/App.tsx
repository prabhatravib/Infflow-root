import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Mic, Image, Settings, User, Moon, Sun, Menu, X } from 'lucide-react';
import { Header } from './components/Header';
import { Tabs } from './components/Tabs';
import { FiltersBar } from './components/FiltersBar';
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

const mockResults: SearchResult[] = [{
  id: '1',
  title: 'Understanding Machine Learning Fundamentals',
  url: 'https://example.com/ml-fundamentals',
  snippet: 'A comprehensive guide to machine learning concepts, algorithms, and practical applications in modern technology.',
  domain: 'example.com',
  favicon: '🤖'
}, {
  id: '2',
  title: 'The Future of Artificial Intelligence',
  url: 'https://tech.com/ai-future',
  snippet: 'Exploring the potential impact of AI on society, economy, and human interaction in the coming decades.',
  domain: 'tech.com',
  favicon: '🔬'
}];

// @component: InfflowApp
export default function App() {
  const [currentTab, setCurrentTab] = useState('All');
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
      // set results with a lightweight placeholder from description
      setResults(mockResults);
      if (res.render_type === 'html') setDiagram(res.rendered_content);
      else setDiagram(res.diagram || res.rendered_content || null);
    } catch (e) {
      setResults(mockResults);
      setDiagram(null);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  // @return
  return <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      <Header searchQuery={searchQuery} setSearchQuery={setSearchQuery} onSearch={handleSearch} isDark={isDark} toggleTheme={toggleTheme} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      
      <Tabs currentTab={currentTab} setCurrentTab={setCurrentTab} />
      
      <FiltersBar />
      
      <div className="flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <main className="flex-1 transition-all duration-300">
          {!showResults ? <div className="flex flex-col items-center justify-center min-h-[75vh] px-8">
              <motion.div initial={{
            opacity: 0,
            y: 20
          }} animate={{
            opacity: 1,
            y: 0
          }} className="w-full max-w-3xl">
                <div className="text-center mb-12">
                  <div className="flex items-center justify-center mb-8">
                    <Logo size="xl" variant="full" />
                  </div>
                  <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                    Answers, you can See!
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 text-xl font-light">
                    <span>Ask anything. Get responses in Textcharts.</span>
                  </p>
                </div>
                
                <div className="relative mb-12">
                  <div className="flex items-center bg-white dark:bg-gray-800 rounded-3xl shadow-xl shadow-gray-200/20 dark:shadow-gray-900/20 border border-gray-200/60 dark:border-gray-700/60 hover:shadow-2xl hover:shadow-gray-200/30 dark:hover:shadow-gray-900/30 transition-all duration-300">
                    <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSearch(searchQuery)} placeholder="Search, ask, or explore visually…" className="flex-1 px-8 py-5 text-lg bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400" />
                    <button className="p-3.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl transition-colors">
                      <Mic className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>
                    <button className="p-3.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl transition-colors">
                      <Image className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>
                    <button onClick={() => handleSearch(searchQuery)} className="p-3.5 mr-2 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 rounded-2xl transition-colors">
                      <Search className="w-5 h-5 text-white dark:text-gray-900" />
                    </button>
                  </div>
                </div>
                
                <div className="flex flex-wrap justify-center gap-3">
                  {['Details about Paris', 'Pepsi vs Coke', 'Steps to bake a cake'].map(chip => <button key={chip} onClick={() => {
                setSearchQuery(chip);
                handleSearch(chip);
              }} className="px-6 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200/60 dark:border-gray-700/60 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-300 transition-all duration-200 hover:shadow-md">
                      <span>{chip}</span>
                    </button>)}
                </div>
              </motion.div>
            </div> : <div className="flex gap-8 p-8">
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
            </div>}
        </main>
      </div>
    </div>;
}
