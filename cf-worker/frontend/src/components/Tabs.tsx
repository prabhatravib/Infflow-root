import { motion } from 'framer-motion';
import { Globe, MapPin, Newspaper, Eye, FileText } from 'lucide-react';

interface TabsProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  position?: 'top' | 'bottom';
  diagramViewTab?: 'visual' | 'text';
  setDiagramViewTab?: (tab: 'visual' | 'text') => void;
  showResults?: boolean;
  // Optional search-in-nav
  showSearch?: boolean;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  onSearch?: (q: string) => void;
  // Save buttons
  handleSavePNG?: () => void;
  handleSaveText?: () => void;
  showSaveButtons?: boolean;
}

const tabs = [{
  id: 'Web',
  label: 'Web',
  icon: Globe
}, {
  id: 'Map',
  label: 'Map',
  icon: MapPin
}, {
  id: 'News',
  label: 'News',
  icon: Newspaper
}] as any[];

const diagramTabs = [{
  id: 'visual',
  label: 'Visual',
  icon: Eye
}, {
  id: 'text',
  label: 'Text',
  icon: FileText
}] as any[];

// @component: Tabs
export const Tabs = ({
  currentTab,
  setCurrentTab,
  position = 'top',
  diagramViewTab,
  setDiagramViewTab,
  showResults = false,
  showSearch = false,
  searchQuery,
  setSearchQuery,
  onSearch,
  handleSavePNG,
  handleSaveText,
  showSaveButtons = false
}: TabsProps) => {
  const isBottom = position === 'bottom';
  
  // @return
  return <nav className={`${isBottom ? 'border-t' : 'border-b'} border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 ${isBottom ? 'bottom-nav-fixed' : ''}`}>
      <div className={`px-2 ${isBottom && showSaveButtons ? 'flex justify-between items-center' : ''}`}>
        <div className="flex space-x-1 overflow-x-auto scrollbar-hide">
          {/* Web/Map/News tabs */}
          {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return <button key={tab.id} onClick={() => setCurrentTab(tab.id)} className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors duration-200 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}>
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                
                {isActive && <motion.div layoutId="activeTab" className={`absolute ${isBottom ? 'top-0' : 'bottom-0'} left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400`} initial={false} transition={{
              type: "spring",
              stiffness: 500,
              damping: 30
            }} />}
              </button>;
        })}
        
        {/* Visual/Text tabs - only when not bottom nav */}
        {showResults && !showSearch && !isBottom && diagramViewTab && setDiagramViewTab && (
          <>
            <div className="w-px h-8 bg-gray-300 dark:bg-gray-600 mx-2"></div>
            <div className="flex space-x-1 bg-gray-200 dark:bg-gray-700 rounded-lg p-1 w-[400px]">
              {diagramTabs.map(tab => {
                const isActive = diagramViewTab === tab.id;
                return <button key={tab.id} onClick={() => setDiagramViewTab(tab.id as 'visual' | 'text')} data-demo-visual-tab={tab.id === 'visual' ? true : undefined} data-demo-text-tab={tab.id === 'text' ? true : undefined} className={`flex-1 py-2 px-12 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}>
                      {tab.label}
                    </button>;
              })}
            </div>
          </>
        )}

        {/* Search bar inside bottom nav when requested */}
        {showSearch && searchQuery !== undefined && setSearchQuery && onSearch && (
          <>
            <div className="w-px h-8 bg-gray-300 dark:bg-gray-600 mx-2"></div>
            <div className="ml-auto mr-3 flex items-center bg-white dark:bg-gray-800 rounded-lg border border-gray-200/60 dark:border-gray-700/60 px-2.5 py-1.5 max-w-md shadow-sm">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && onSearch(searchQuery)}
                placeholder="Search..."
                className="flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 px-1 py-0.5"
              />
              <button onClick={() => onSearch(searchQuery)} className="ml-2 px-2 py-1 rounded-lg bg-gray-900 dark:bg-white">
                <span className="text-white dark:text-gray-900 text-[11px] leading-none">Go</span>
              </button>
            </div>
          </>
        )}

         </div>

         {/* Save buttons - only show on bottom nav when requested */}
         {isBottom && showSaveButtons && (
           <div className="flex items-center gap-2">
             {/* Show Save Text button only when on Text tab */}
             {diagramViewTab === 'text' && (
               <button
                 onClick={handleSaveText}
                 className="px-3 py-2 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-black dark:text-white text-sm font-medium rounded-lg transition-colors shadow-sm border border-gray-200 dark:border-gray-600"
                 title="Save as text file"
               >
                 Save Text
               </button>
             )}
             {/* Show Save PNG button only when on Visual tab */}
             {diagramViewTab === 'visual' && (
               <button
                 onClick={handleSavePNG}
                 className="px-3 py-2 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-black dark:text-white text-sm font-medium rounded-lg transition-colors shadow-sm border border-gray-200 dark:border-gray-600"
                 title="Save as PNG image"
               >
                 Save PNG
               </button>
             )}
           </div>
         )}
       </div>
     </nav>;
};



