import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Bookmark, Filter, Search, BarChart3, Image, FileText } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const recentSearches = [{
  id: '1',
  query: 'Machine Learning',
  timestamp: '2 hours ago',
  preview: '🤖'
}, {
  id: '2',
  query: 'Climate Change',
  timestamp: '1 day ago',
  preview: '🌍'
}, {
  id: '3',
  query: 'Quantum Computing',
  timestamp: '3 days ago',
  preview: '⚛️'
}, {
  id: '4',
  query: 'Space Exploration',
  timestamp: '1 week ago',
  preview: '🚀'
}] as any[];

const savedDiagrams = [{
  id: '1',
  title: 'ML Algorithm Flow',
  type: 'flowchart',
  preview: '📊'
}, {
  id: '2',
  title: 'Climate Data Mind Map',
  type: 'mindmap',
  preview: '🧠'
}, {
  id: '3',
  title: 'Quantum Timeline',
  type: 'timeline',
  preview: '⏰'
}] as any[];

const quickFilters = [{
  id: 'all',
  label: 'All',
  icon: Search,
  active: true
}, {
  id: 'web',
  label: 'Web',
  icon: FileText,
  active: false
}, {
  id: 'images',
  label: 'Images',
  icon: Image,
  active: false
}, {
  id: 'diagrams',
  label: 'Diagrams',
  icon: BarChart3,
  active: false
}] as any[];

const relatedSearches = ['Neural Networks', 'Deep Learning', 'AI Ethics', 'Computer Vision', 'Natural Language Processing'];

// @component: Sidebar
export const Sidebar = ({
  isOpen,
  onClose
}: SidebarProps) => {
  // @return
  return <AnimatePresence>
      {isOpen && <motion.div initial={{
      x: -320
    }} animate={{
      x: 0
    }} exit={{
      x: -320
    }} transition={{
      type: "spring",
      stiffness: 300,
      damping: 30
    }} className="fixed left-0 top-0 h-full w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-40 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                <span>Search Hub</span>
              </h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    <span>Recent Searches</span>
                  </h3>
                </div>
                <div className="space-y-2">
                  {recentSearches.map(search => <button key={search.id} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors text-left">
                      <span className="text-lg">{search.preview}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          <span>{search.query}</span>
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          <span>{search.timestamp}</span>
                        </p>
                      </div>
                    </button>)}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Bookmark className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    <span>Saved Diagrams</span>
                  </h3>
                </div>
                <div className="space-y-2">
                  {savedDiagrams.map(diagram => <button key={diagram.id} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors text-left">
                      <span className="text-lg">{diagram.preview}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          <span>{diagram.title}</span>
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                          <span>{diagram.type}</span>
                        </p>
                      </div>
                    </button>)}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Filter className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    <span>Quick Filters</span>
                  </h3>
                </div>
                <div className="space-y-1">
                  {quickFilters.map(filter => {
                const Icon = filter.icon;
                return <button key={filter.id} className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left ${filter.active ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{filter.label}</span>
                      </button>;
              })}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  <span>Related Searches</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {relatedSearches.map(search => <button key={search} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-xs text-gray-700 dark:text-gray-300 transition-colors">
                      <span>{search}</span>
                    </button>)}
                </div>
              </div>
            </div>
          </div>
        </motion.div>}
    </AnimatePresence>;
};
