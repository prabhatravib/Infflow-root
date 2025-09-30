import { useState } from 'react';
import { Search, Mic, Image } from 'lucide-react';

interface SearchBarProps {
  size?: 'default' | 'compact';
  width?: number;
  defaultValue?: string;
  value?: string; // controlled value (optional)
  onChange?: (query: string) => void; // controlled change (optional)
  onSubmit: (query: string) => void;
  autoFocus?: boolean;
}

export const SearchBar = ({ 
  size = 'default', 
  width, 
  defaultValue = '', 
  value,
  onChange,
  onSubmit, 
  autoFocus = false 
}: SearchBarProps) => {
  // Support controlled and uncontrolled modes
  const [internalQuery, setInternalQuery] = useState(defaultValue);
  const searchQuery = value !== undefined ? value : internalQuery;

  const handleSubmit = () => {
    if (searchQuery.trim()) {
      onSubmit(searchQuery.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    if (onChange) onChange(next);
    if (value === undefined) setInternalQuery(next);
  };

  const sizeClasses = size === 'compact' 
    ? 'px-3 py-2 text-sm' 
    : 'px-5 py-3 text-sm';

  return (
    <div 
      className="relative"
      style={{ width: width ? `${width}px` : 'auto' }}
    >
      <div className="flex items-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 hover:shadow-lg hover:shadow-gray-200/20 dark:hover:shadow-gray-900/20 transition-all duration-300 shadow-none">
        <input 
          type="text" 
          value={searchQuery} 
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          placeholder="Get crafted results..." 
          autoFocus={autoFocus}
          className={`flex-1 ${sizeClasses} bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400`}
        />
        <button className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
          <Mic className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>
        <button className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
          <Image className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>
        <button onClick={handleSubmit} className="p-2.5 mr-1 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 rounded-xl transition-colors">
          <Search className="w-4 h-4 text-white dark:text-gray-900" />
        </button>
      </div>
    </div>
  );
};

