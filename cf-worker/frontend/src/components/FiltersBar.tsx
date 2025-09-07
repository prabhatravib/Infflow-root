import React, { useState } from 'react';
import { ChevronDown, Calendar, Globe, Shield, SortAsc } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FilterOption {
  id: string;
  label: string;
  value: string;
}

const timeRangeOptions: FilterOption[] = [{
  id: 'any',
  label: 'Any time',
  value: 'any'
}, {
  id: 'hour',
  label: 'Past hour',
  value: 'hour'
}, {
  id: 'day',
  label: 'Past 24 hours',
  value: 'day'
}, {
  id: 'week',
  label: 'Past week',
  value: 'week'
}, {
  id: 'month',
  label: 'Past month',
  value: 'month'
}, {
  id: 'year',
  label: 'Past year',
  value: 'year'
}];

const regionOptions: FilterOption[] = [{
  id: 'all',
  label: 'All regions',
  value: 'all'
}, {
  id: 'us',
  label: 'United States',
  value: 'us'
}, {
  id: 'uk',
  label: 'United Kingdom',
  value: 'uk'
}, {
  id: 'ca',
  label: 'Canada',
  value: 'ca'
}, {
  id: 'au',
  label: 'Australia',
  value: 'au'
}];

const sortOptions: FilterOption[] = [{
  id: 'relevance',
  label: 'Relevance',
  value: 'relevance'
}, {
  id: 'date',
  label: 'Date',
  value: 'date'
}, {
  id: 'popularity',
  label: 'Popularity',
  value: 'popularity'
}];

// @component: FiltersBar
export const FiltersBar = () => {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('any');
  const [siteFilter, setSiteFilter] = useState('');
  const [region, setRegion] = useState('all');
  const [safeSearch, setSafeSearch] = useState(true);
  const [sortBy, setSortBy] = useState('relevance');

  const toggleDropdown = (dropdown: string) => {
    setActiveDropdown(activeDropdown === dropdown ? null : dropdown);
  };

  const handleOptionSelect = (type: string, value: string) => {
    switch (type) {
      case 'time':
        setTimeRange(value);
        break;
      case 'region':
        setRegion(value);
        break;
      case 'sort':
        setSortBy(value);
        break;
    }
    setActiveDropdown(null);
  };

  // @return
  return <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
      <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide">
        <div className="relative">
          <button onClick={() => toggleDropdown('time')} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors whitespace-nowrap">
            <Calendar className="w-4 h-4" />
            <span>{timeRangeOptions.find(opt => opt.value === timeRange)?.label}</span>
            <ChevronDown className="w-4 h-4" />
          </button>
          
          <AnimatePresence>
            {activeDropdown === 'time' && <motion.div initial={{
            opacity: 0,
            y: -10
          }} animate={{
            opacity: 1,
            y: 0
          }} exit={{
            opacity: 0,
            y: -10
          }} className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 min-w-40">
                {timeRangeOptions.map(option => <button key={option.id} onClick={() => handleOptionSelect('time', option.value)} className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg">
                    <span>{option.label}</span>
                  </button>)}
              </motion.div>}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">site:</span>
          <input type="text" value={siteFilter} onChange={e => setSiteFilter(e.target.value)} placeholder="example.com" className="px-2 py-1 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>

        <div className="relative">
          <button onClick={() => toggleDropdown('region')} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors whitespace-nowrap">
            <Globe className="w-4 h-4" />
            <span>{regionOptions.find(opt => opt.value === region)?.label}</span>
            <ChevronDown className="w-4 h-4" />
          </button>
          
          <AnimatePresence>
            {activeDropdown === 'region' && <motion.div initial={{
            opacity: 0,
            y: -10
          }} animate={{
            opacity: 1,
            y: 0
          }} exit={{
            opacity: 0,
            y: -10
          }} className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 min-w-40">
                {regionOptions.map(option => <button key={option.id} onClick={() => handleOptionSelect('region', option.value)} className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg">
                    <span>{option.label}</span>
                  </button>)}
              </motion.div>}
          </AnimatePresence>
        </div>

        <button onClick={() => setSafeSearch(!safeSearch)} className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors whitespace-nowrap ${safeSearch ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
          <Shield className="w-4 h-4" />
          <span>Safe Search</span>
        </button>

        <div className="relative">
          <button onClick={() => toggleDropdown('sort')} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors whitespace-nowrap">
            <SortAsc className="w-4 h-4" />
            <span>{sortOptions.find(opt => opt.value === sortBy)?.label}</span>
            <ChevronDown className="w-4 h-4" />
          </button>
          
          <AnimatePresence>
            {activeDropdown === 'sort' && <motion.div initial={{
            opacity: 0,
            y: -10
          }} animate={{
            opacity: 1,
            y: 0
          }} exit={{
            opacity: 0,
            y: -10
          }} className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 min-w-40">
                {sortOptions.map(option => <button key={option.id} onClick={() => handleOptionSelect('sort', option.value)} className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg">
                    <span>{option.label}</span>
                  </button>)}
              </motion.div>}
          </AnimatePresence>
        </div>
      </div>
    </div>;
};
