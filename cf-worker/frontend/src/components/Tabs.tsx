import { motion } from 'framer-motion';
import { Globe, MapPin, Newspaper, Eye, FileText } from 'lucide-react';

interface TabsProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  position?: 'top' | 'bottom';
  diagramViewTab?: 'visual' | 'text';
  setDiagramViewTab?: (tab: 'visual' | 'text') => void;
  showResults?: boolean;
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
  showResults = false
}: TabsProps) => {
  const isBottom = position === 'bottom';
  
  // @return
  return <nav className={`${isBottom ? 'border-t' : 'border-b'} border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 ${isBottom ? 'fixed bottom-0 left-0 right-0 z-50' : ''}`}>
      <div className="px-4">
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
        
        {/* Visual/Text tabs - only show when results are displayed */}
        {showResults && diagramViewTab && setDiagramViewTab && (
          <>
            <div className="w-px h-8 bg-gray-300 dark:bg-gray-600 mx-2"></div>
            <div className="flex space-x-1 bg-gray-200 dark:bg-gray-700 rounded-lg p-1 w-[400px]">
              {diagramTabs.map(tab => {
                const isActive = diagramViewTab === tab.id;
                return <button key={tab.id} onClick={() => setDiagramViewTab(tab.id as 'visual' | 'text')} className={`flex-1 py-2 px-12 text-sm font-medium rounded-md transition-colors ${
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
        </div>
      </div>
    </nav>;
};
