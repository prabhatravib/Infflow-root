import React from 'react';
import { motion } from 'framer-motion';
import { Globe, MapPin, Newspaper } from 'lucide-react';

interface TabsProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
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

// @component: Tabs
export const Tabs = ({
  currentTab,
  setCurrentTab
}: TabsProps) => {
  // @return
  return <nav className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="px-4">
        <div className="flex space-x-1 overflow-x-auto scrollbar-hide">
          {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return <button key={tab.id} onClick={() => setCurrentTab(tab.id)} className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors duration-200 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}>
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                
                {isActive && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" initial={false} transition={{
              type: "spring",
              stiffness: 500,
              damping: 30
            }} />}
              </button>;
        })}
        </div>
      </div>
    </nav>;
};
