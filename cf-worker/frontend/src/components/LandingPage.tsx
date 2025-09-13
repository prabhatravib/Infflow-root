import { motion } from 'framer-motion';
import { Search, Mic, Image, Moon, Sun } from 'lucide-react';
import Logo from './Logo';
import { Tabs } from './Tabs';

interface LandingPageProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSearch: (query: string) => void;
  isDark: boolean;
  toggleTheme: () => void;
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  diagramViewTab?: 'visual' | 'text';
  setDiagramViewTab?: (tab: 'visual' | 'text') => void;
  showResults?: boolean;
}

export default function LandingPage({
  searchQuery,
  setSearchQuery,
  onSearch,
  isDark,
  toggleTheme,
  currentTab,
  setCurrentTab,
  diagramViewTab,
  setDiagramViewTab,
  showResults = false
}: LandingPageProps) {
  const suggestionChips = ['Details about Paris', 'Pepsi vs Coke', 'Steps to bake a cake','Rome Foamtree'];

  return (
    <motion.div 
      key="landing"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="flex flex-col items-center justify-start px-8 relative -mt-24 pb-8 min-h-screen"
    >
      {/* Floating theme toggle for landing page */}
      <button 
        onClick={toggleTheme} 
        className="absolute top-6 right-6 p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors z-10"
      >
        {isDark ? <Sun className="w-6 h-6 text-gray-600 dark:text-gray-400" /> : <Moon className="w-6 h-6 text-gray-600 dark:text-gray-400" />}
      </button>
      
      {/* Main content container with better vertical centering */}
      <div className="w-full max-w-4xl flex flex-col items-center">
        <div className="text-center mb-0">
          <div className="flex items-center justify-center" style={{ marginBottom: '-6rem' }}>
            <Logo size="xl" variant="full" isDark={isDark} />
          </div>
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Answers, you can See and Hear!
          </h1>
          
        </div>
        
        {/* Suggestion chips with "Try:" text */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <span className="text-gray-600 dark:text-gray-400 text-lg font-medium">Try asking:</span>
          {suggestionChips.map(chip => (
            <button 
              key={chip} 
              onClick={() => {
                setSearchQuery(chip);
              }} 
              className="px-[1.6rem] py-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200/60 dark:border-gray-700/60 rounded-2xl text-base font-medium text-gray-700 dark:text-gray-300 transition-all duration-200 hover:shadow-lg hover:scale-105"
            >
              {chip}
            </button>
          ))}
        </div>
        
        {/* Search box with better spacing */}
        <div className="relative w-full">
          <div className="flex items-center bg-white dark:bg-gray-800 rounded-3xl shadow-2xl shadow-gray-200/30 dark:shadow-gray-900/30 border border-gray-200/60 dark:border-gray-700/60 hover:shadow-3xl hover:shadow-gray-200/40 dark:hover:shadow-gray-900/40 transition-all duration-300">
            <input 
              type="text" 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              onKeyPress={e => e.key === 'Enter' && onSearch(searchQuery)} 
              placeholder="Explore visually..."
              className="flex-1 px-6 py-3.5 text-lg bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400" 
            />
            <button className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl transition-colors">
              <Mic className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
            <button className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl transition-colors">
              <Image className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
            <button 
              onClick={() => onSearch(searchQuery)} 
              className="p-2.5 mr-2 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 rounded-2xl transition-colors"
            >
              <Search className="w-5 h-5 text-white dark:text-gray-900" />
            </button>
          </div>
        </div>

        {/* Tagline moved below search */}
        <p className="text-gray-600 dark:text-gray-400 text-2xl font-light mt-6">
          Ask anything. Get responses in Textcharts.
        </p>
      </div>
      
      {/* Bottom Navigation */}
      <Tabs 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        position="bottom"
        diagramViewTab={diagramViewTab}
        setDiagramViewTab={setDiagramViewTab}
        showResults={showResults}
      />
    </motion.div>
  );
}



