import { motion } from 'framer-motion';
import { useState } from 'react';
import { Header } from './Header';
import { Tabs } from './Tabs';
import { Sidebar } from './Sidebar';
import Mermaid from './Mermaid';
import { DeepDive } from './DeepDive';
import { HexaWorker } from './HexaWorker';

interface SearchResultsProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSearch: (query: string) => void;
  isDark: boolean;
  toggleTheme: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  onBackToHome: () => void;
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  diagram: string | null;
  diagramData: {mermaidCode: string; diagramImage: string; prompt: string} | null;
  contentData: {content: string; description: string; universal_content: string} | null;
  codeFlowStatus: 'sent' | 'not-sent';
  selection: {
    hasSelection: boolean;
    selectedText: string;
  };
  deepDive: {
    isProcessing: boolean;
    response: string | null;
    history: Array<{
      selectedText: string;
      question: string;
      response: string;
      timestamp: number;
    }>;
  };
  setupSelectionHandler: (container: HTMLElement) => void;
  handleDeepDiveAsk: (question: string) => void;
  clearSelection: () => void;
  handleSaveText: () => void;
  handleSavePNG: () => void;
}

export default function SearchResults({
  searchQuery,
  setSearchQuery,
  onSearch,
  isDark,
  toggleTheme,
  sidebarOpen,
  setSidebarOpen,
  onBackToHome,
  currentTab,
  setCurrentTab,
  diagram,
  diagramData,
  contentData,
  codeFlowStatus,
  selection,
  deepDive,
  setupSelectionHandler,
  handleDeepDiveAsk,
  clearSelection,
  handleSaveText,
  handleSavePNG
}: SearchResultsProps) {
  const [diagramViewTab, setDiagramViewTab] = useState<'visual' | 'text'>('visual');
  return (
    <motion.div 
      key="search"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="w-full"
    >
      <Header 
        searchQuery={searchQuery} 
        setSearchQuery={setSearchQuery} 
        onSearch={onSearch} 
        isDark={isDark} 
        toggleTheme={toggleTheme} 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen}
        showResults={true}
        onBackToHome={onBackToHome}
      />
      
      <div className="flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        {/* HexaWorker Component */}
        <div className="fixed left-4 top-[60%] transform -translate-y-1/2 z-50">
          <HexaWorker 
            codeFlowStatus={codeFlowStatus} 
            diagramData={diagramData} 
          />
        </div>
        
        <main className="flex-1 transition-all duration-500">
          <div className="flex justify-center p-4">
            <div className="w-full max-w-6xl space-y-2">

              {/* Diagram Container */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6">
                <div className="space-y-4">
                  {/* Sub-tabs for diagram panel */}
                  <div className="flex space-x-1 bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
                    <button
                      onClick={() => setDiagramViewTab('visual')}
                      className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                        diagramViewTab === 'visual'
                          ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      Visual
                    </button>
                    <button
                      onClick={() => setDiagramViewTab('text')}
                      className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                        diagramViewTab === 'text'
                          ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      Text
                    </button>
                  </div>

                  {/* Content based on selected tab */}
                  {diagramViewTab === 'visual' ? (
                    diagram ? (
                      <div className="relative">
                        <div className="rounded bg-white dark:bg-gray-900 p-2 mermaid-container">
                          <Mermaid 
                            code={diagram} 
                            onSetupSelection={setupSelectionHandler}
                          />
                        </div>
                        {/* Save PNG Button - positioned on the right side */}
                        <div className="absolute bottom-2 right-2">
                          <button
                            onClick={handleSavePNG}
                            className="px-4 py-2 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-black dark:text-white text-sm font-medium rounded-lg transition-colors shadow-md border border-gray-200 dark:border-gray-600"
                            title="Save as PNG image"
                          >
                            Save PNG
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded bg-white dark:bg-gray-900 p-8 text-center">
                        <div className="mb-2">
                          <img 
                            src="/textchart-icon.png" 
                            alt="Textchart" 
                            className="w-16 h-16 mx-auto"
                          />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400">Textchart being generated...</p>
                      </div>
                    )
                  ) : (
                    <div className="relative rounded bg-white dark:bg-gray-900 p-6">
                      {contentData && contentData.universal_content ? (
                        <div className="space-y-4">
                          <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap prose max-w-none">
                            {contentData.universal_content}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center text-gray-500 dark:text-gray-400">
                          <p>No text content available</p>
                        </div>
                      )}
                      {/* Save Text Button - positioned in bottom right corner */}
                      {contentData && contentData.universal_content && (
                        <div className="absolute bottom-4 right-4">
                          <button
                            onClick={handleSaveText}
                            className="px-4 py-2 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-black dark:text-white text-sm font-medium rounded-lg transition-colors shadow-md border border-gray-200 dark:border-gray-600"
                            title="Save as text file"
                          >
                            Save text
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Deep Dive Panel */}
              {selection.hasSelection && (
                <DeepDive
                  selectedText={selection.selectedText}
                  isProcessing={deepDive.isProcessing}
                  response={deepDive.response}
                  history={deepDive.history}
                  onAsk={handleDeepDiveAsk}
                  onClose={clearSelection}
                />
              )}
            </div>
          </div>
        </main>
      </div>
      
      {/* Bottom Navigation */}
      <Tabs currentTab={currentTab} setCurrentTab={setCurrentTab} position="bottom" />
    </motion.div>
  );
}
