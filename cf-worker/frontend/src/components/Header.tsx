import { Search, Mic, Image, Settings, User, Moon, Sun, Menu } from 'lucide-react';
import Logo from './Logo';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSearch: (query: string) => void;
  isDark: boolean;
  toggleTheme: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  showResults: boolean;
  onBackToHome: () => void;
  diagramViewTab?: 'visual' | 'text';
  setDiagramViewTab?: (tab: 'visual' | 'text') => void;
}

// @component: Header
export const Header = ({
  searchQuery,
  setSearchQuery,
  onSearch,
  isDark,
  toggleTheme,
  sidebarOpen,
  setSidebarOpen,
  showResults,
  onBackToHome,
  diagramViewTab,
  setDiagramViewTab
}: HeaderProps) => {
  // @return
  return <header className={`sticky top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 transition-all duration-300 ${showResults ? 'shadow-sm' : 'shadow-none'}`}>
      <div className={`flex items-center justify-between px-6 transition-all duration-300 ${showResults ? 'py-2' : 'py-3'}`}>
        <div className="flex items-center gap-4">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors lg:hidden">
            <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          
          <div className="flex items-center gap-2">
            <button onClick={onBackToHome} className="hover:opacity-80 transition-opacity">
              <Logo size={showResults ? "sm" : "md"} variant="full" isDark={isDark} />
            </button>
            
            {/* Visual/Text tabs - only show on results page */}
            {showResults && diagramViewTab && setDiagramViewTab && (
              <div className="flex space-x-1 bg-gray-200 dark:bg-gray-700 rounded-lg p-1 ml-4">
                <button
                  onClick={() => setDiagramViewTab('visual')}
                  className={`py-1.5 px-3 text-sm font-medium rounded-md transition-colors ${
                    diagramViewTab === 'visual'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  Visual
                </button>
                <button
                  onClick={() => setDiagramViewTab('text')}
                  className={`py-1.5 px-3 text-sm font-medium rounded-md transition-colors ${
                    diagramViewTab === 'text'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  Text
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Center spacer for results page when search bar is hidden */}
        {showResults && <div className="flex-1"></div>}

        {/* Hide search bar on results page - only show on landing page */}
        {!showResults && (
          <div className="flex-1 max-w-2xl mx-8 hidden md:block">
            <div className="relative">
              <div className="flex items-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 hover:shadow-lg hover:shadow-gray-200/20 dark:hover:shadow-gray-900/20 transition-all duration-300 shadow-none">
                <input 
                  type="text" 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                  onKeyPress={e => e.key === 'Enter' && onSearch(searchQuery)} 
                  placeholder="Explore visually…" 
                  className="flex-1 px-5 py-3 bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm" 
                />
                <button className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
                  <Mic className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>
                <button className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
                  <Image className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>
                <button onClick={() => onSearch(searchQuery)} className="p-2.5 mr-1 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 rounded-xl transition-colors">
                  <Search className="w-4 h-4 text-white dark:text-gray-900" />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
            {isDark ? <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" /> : <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
          </button>
          
          <button className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
            <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          
          <button className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
            <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>
    </header>;
};
