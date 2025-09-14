import { useEffect } from 'react';

interface CentralSearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSearch: (query: string) => void;
  radialEnabled: boolean;
  diagramViewTab: 'visual' | 'text';
}

export default function CentralSearchBar({
  searchQuery,
  setSearchQuery,
  onSearch,
  radialEnabled,
  diagramViewTab
}: CentralSearchBarProps) {
  // Create persistent search bar immediately when radial is enabled and visual tab is active
  useEffect(() => {
    if (radialEnabled && diagramViewTab === 'visual') {
      // Check if search bar already exists, if so, just update its value instead of recreating
      const existingOverlay = document.querySelector('.central-search-overlay');
      if (existingOverlay) {
        const input = existingOverlay.querySelector('input');
        if (input && input.value !== searchQuery) {
          input.value = searchQuery;
        }
        console.log('[CentralSearchBar] Updated existing search bar value');
        return; // Don't recreate, just update
      }
      console.log('[CentralSearchBar] Creating persistent search bar at screen center');
      
      // Create search bar directly without waiting for SVG
      const searchBar = document.createElement('div');
      searchBar.className = 'central-search-overlay';
      
      // Calculate screen center position (shorter width than landing page)
      const searchBarWidth = 400; // Shorter than landing page but wider than before
      const searchBarHeight = 56; // Match landing page height
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const left = (viewportWidth - searchBarWidth) / 2;
      const top = (viewportHeight - searchBarHeight) / 2;
      
      // Match landing page styling
      searchBar.style.cssText = `
        position: fixed;
        left: ${left}px;
        top: ${top}px;
        width: ${searchBarWidth}px;
        height: ${searchBarHeight}px;
        display: flex;
        align-items: center;
        z-index: 999999;
        pointer-events: auto;
        background: white;
        border-radius: 24px;
        border: 1px solid rgba(229, 231, 235, 0.6);
        transition: all 0.3s ease;
      `;
      
      // Create input matching landing page
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Explore visually...';
      input.value = searchQuery;
      input.setAttribute('data-central-search-input', 'true');
      input.style.cssText = `
        flex: 1;
        padding: 14px 24px;
        border: none;
        outline: none;
        background: transparent;
        font-size: 18px;
        color: #111827;
        font-weight: 400;
      `;
      
      // Create mic button
      const micButton = document.createElement('button');
      micButton.innerHTML = `
        <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
        </svg>
      `;
      micButton.style.cssText = `
        padding: 10px;
        background: transparent;
        border: none;
        border-radius: 16px;
        cursor: pointer;
        transition: background-color 0.2s;
      `;
      micButton.addEventListener('mouseenter', () => {
        micButton.style.backgroundColor = '#f3f4f6';
      });
      micButton.addEventListener('mouseleave', () => {
        micButton.style.backgroundColor = 'transparent';
      });
      
      // Create image button
      const imageButton = document.createElement('button');
      imageButton.innerHTML = `
        <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
        </svg>
      `;
      imageButton.style.cssText = `
        padding: 10px;
        background: transparent;
        border: none;
        border-radius: 16px;
        cursor: pointer;
        transition: background-color 0.2s;
      `;
      imageButton.addEventListener('mouseenter', () => {
        imageButton.style.backgroundColor = '#f3f4f6';
      });
      imageButton.addEventListener('mouseleave', () => {
        imageButton.style.backgroundColor = 'transparent';
      });
      
      // Create search button matching landing page
      const searchButton = document.createElement('button');
      searchButton.innerHTML = `
        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
      `;
      searchButton.style.cssText = `
        padding: 10px;
        margin-right: 8px;
        background: #111827;
        border: none;
        border-radius: 16px;
        cursor: pointer;
        transition: background-color 0.2s;
      `;
      searchButton.addEventListener('mouseenter', () => {
        searchButton.style.backgroundColor = '#374151';
      });
      searchButton.addEventListener('mouseleave', () => {
        searchButton.style.backgroundColor = '#111827';
      });
      
      // Assemble the search bar (matching landing page order)
      searchBar.appendChild(input);
      searchBar.appendChild(micButton);
      searchBar.appendChild(imageButton);
      searchBar.appendChild(searchButton);
      
      // Add event handlers
      input.addEventListener('input', (e) => {
        setSearchQuery((e.target as HTMLInputElement).value);
      });
      
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onSearch(input.value);
        }
      });
      
      // Search button click handler
      searchButton.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        onSearch(input.value);
      };
      
      // Mic button click handler (placeholder)
      micButton.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        // TODO: Implement voice input
        console.log('Voice input clicked');
      };
      
      // Image button click handler (placeholder)
      imageButton.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        // TODO: Implement image input
        console.log('Image input clicked');
      };
      
      // Add to document body
      document.body.appendChild(searchBar);
      
      // Store cleanup function
      (searchBar as any)._cleanup = () => {
        // No additional cleanup needed for this simple approach
      };
      
      console.log('[CentralSearchBar] Persistent search bar created at screen center');
    }
  }, [radialEnabled, diagramViewTab, setSearchQuery, onSearch, searchQuery]);

  // Remove search bar when switching to text tab
  useEffect(() => {
    if (radialEnabled && diagramViewTab === 'text') {
      const existingOverlay = document.querySelector('.central-search-overlay');
      if (existingOverlay) {
        existingOverlay.remove();
        console.log('[CentralSearchBar] Removed search bar for text tab');
      }
    }
  }, [radialEnabled, diagramViewTab]);

  // Sync the injected search bar value when searchQuery changes
  useEffect(() => {
    if (!radialEnabled) return;
    
    console.log('[CentralSearchBar] Syncing central search value:', searchQuery);
    // Update the overlay input value if it exists (now globally positioned)
    const overlay = document.querySelector('.central-search-overlay');
    if (overlay) {
      const input = overlay.querySelector('input');
      if (input && input.value !== searchQuery) {
        input.value = searchQuery;
      }
    }
  }, [radialEnabled, searchQuery]);

  // Cleanup overlay when radial is disabled
  useEffect(() => {
    if (!radialEnabled) {
      const overlay = document.querySelector('.central-search-overlay');
      if (overlay) {
        if ((overlay as any)._cleanup) {
          (overlay as any)._cleanup();
        }
        overlay.remove();
      }
    }
  }, [radialEnabled]);

  // Clean up any existing search bars immediately when component mounts
  useEffect(() => {
    const existingOverlay = document.querySelector('.central-search-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
      console.log('[CentralSearchBar] Cleaned up existing search bar on component mount');
    }
  }, []);

  return null; // This component only manages DOM manipulation
}
