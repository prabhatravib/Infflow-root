import { Search, Mic, Image } from 'lucide-react';

interface FixedSearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSearch: (query: string) => void;
}

export function FixedSearchBar({ 
  searchQuery, 
  setSearchQuery, 
  onSearch 
}: FixedSearchBarProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSearch(searchQuery);
    }
  };

  const handleSearch = () => {
    onSearch(searchQuery);
  };

  const handleMicClick = () => {
    // TODO: Implement voice input
    console.log('Voice input clicked');
  };

  const handleImageClick = () => {
    // TODO: Implement image input
    console.log('Image input clicked');
  };

  return (
    <div className="fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
      <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-800/50 rounded-2xl shadow-lg">
        <div className="flex items-center w-96 h-14 px-4">
          {/* Search Input */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Explore visually..."
            className="flex-1 bg-transparent outline-none text-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 font-normal"
          />
          
          {/* Mic Button */}
          <button
            onClick={handleMicClick}
            className="p-2.5 mr-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            title="Voice input"
          >
            <Mic className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
          
          {/* Image Button */}
          <button
            onClick={handleImageClick}
            className="p-2.5 mr-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            title="Image input"
          >
            <Image className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
          
          {/* Search Button */}
          <button
            onClick={handleSearch}
            className="p-2.5 bg-gray-900 dark:bg-white hover:bg-gray-700 dark:hover:bg-gray-200 rounded-xl transition-colors"
            title="Search"
          >
            <Search className="w-5 h-5 text-white dark:text-gray-900" />
          </button>
        </div>
      </div>
    </div>
  );
}
