import React from "react";

type Item = { title: string; url: string; snippet?: string; favicon?: string | null };

interface ExternalLinksSectionProps {
  query: string | null;
  meta?: any;
  onClose?: () => void;
}

export function ExternalLinksSection({
  query,
  meta,
  onClose,
}: ExternalLinksSectionProps) {
  const [items, setItems] = React.useState<Item[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Extract display text from meta and query
  const getDisplayText = React.useCallback(() => {
    if (!query) return '';
    
    // Extract main query from the search query
    // Format: "Details about Paris 'Renowned for café culture,culinary'"
    const mainQueryMatch = query.match(/^(.+?)(?:\s+['""].*)?$/);
    
    if (mainQueryMatch) {
      const mainQuery = mainQueryMatch[1].trim();
      
      // Use the theme directly from meta object
      if (meta?.theme) {
        return `${mainQuery} - ${meta.theme}`;
      }
      
      // Fallback: extract theme from quoted text in query
      const quotedMatch = query.match(/['""](.+?)['""]/);
      if (quotedMatch) {
        return `${mainQuery} - ${quotedMatch[1].trim()}`;
      }
      
      return mainQuery;
    }
    
    // Fallback: just return the main query
    const detailsMatch = query.match(/Details about\s+(.+?)(?:\s+["""].*)?$/i);
    if (detailsMatch) {
      return detailsMatch[1].trim();
    }
    
    // Fallback: take first few words if query is too long
    if (query.length > 50) {
      const words = query.split(' ');
      if (words.length > 4) {
        return words.slice(0, 4).join(' ') + '...';
      }
    }
    
    return query;
  }, [query, meta]);

  React.useEffect(() => {
    let cancel = false;
    async function run() {
      if (!query) return;
      console.log('[ExternalLinksSection] Starting search for query:', query);
      setLoading(true);
      setError(null);
      setItems(null);
      
      // Ensure minimum loading time for better UX
      const startTime = Date.now();
      const minLoadingTime = 800; // 800ms minimum loading time
      
      try {
        console.log('[ExternalLinksSection] Making API call to /api/node-search');
        const body = {
          query,
          phrase: query,
          entity: meta?.entity || undefined,
          theme: meta?.theme || undefined,
          keywords: meta?.keywords || undefined,
          search: meta?.search || undefined,
        };
        const resp = await fetch("/api/node-search", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        console.log('[ExternalLinksSection] API response status:', resp.status);
        console.log('[ExternalLinksSection] API response headers:', Object.fromEntries(resp.headers.entries()));
        
        const data = await resp.json();
        console.log('[ExternalLinksSection] API response data:', data);
        console.log('[ExternalLinksSection] Request body sent:', body);
        console.log('[ExternalLinksSection] Meta object received:', meta);
        
        if (!cancel) {
          if (data.error) {
            console.error('[ExternalLinksSection] API error:', data.error);
            setError(`API Error: ${data.error}${data.details ? ' - ' + data.details : ''}`);
          } else {
            setItems(data.items || []);
          }
        }
      } catch (e: any) {
        console.error('[ExternalLinksSection] Fetch error:', e);
        if (!cancel) setError(`Network Error: ${e?.message || "Failed to fetch"}`);
      } finally {
        // Ensure minimum loading time has passed
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, minLoadingTime - elapsedTime);
        
        if (remainingTime > 0) {
          await new Promise(resolve => setTimeout(resolve, remainingTime));
        }
        
        if (!cancel) setLoading(false);
      }
    }
    run();
    return () => {
      cancel = true;
    };
  }, [query, meta]);

  // Don't render anything if there's no query
  if (!query) return null;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg max-h-full overflow-hidden rounded-lg">
      <div className="px-4 py-3 max-h-full overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Links related to: <span className="font-medium">{getDisplayText()}</span>
              </h3>
            </div>
          </div>
          {onClose && (
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              aria-label="Close external links"
            >
              <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="space-y-2">
          {loading && (
            <div className="flex items-center gap-3 py-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-gray-600 dark:text-gray-400 text-sm">Searching for related links...</span>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <div className="font-medium text-red-800 dark:text-red-200">Error</div>
                  <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
                </div>
              </div>
            </div>
          )}

          {items && items.length > 0 && (
            <div className="space-y-2">
              {items.slice(0, 5).map((item, index) => (
                <div 
                  key={index} 
                  className="group p-2 bg-gray-50 dark:bg-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <a 
                    href={item.url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="block"
                  >
                    <div className="flex items-start gap-2">
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {item.title && (
                          <div className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium text-xs leading-4 underline">
                            {item.title}
                          </div>
                        )}
                        {item.snippet && (
                          <div className="text-gray-600 dark:text-gray-400 text-xs mt-0.5 line-clamp-1">
                            {item.snippet}
                          </div>
                        )}
                      </div>
                      
                      {/* External link icon */}
                      <div className="flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </div>
                    </div>
                  </a>
                </div>
              ))}
              {items.length > 5 && (
                <div className="text-center py-1 text-xs text-gray-500 dark:text-gray-400">
                  Showing 5 of {items.length} results
                </div>
              )}
            </div>
          )}

          {items && items.length === 0 && !loading && (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.571M15 6.343A7.962 7.962 0 0012 5c-2.34 0-4.29 1.009-5.824 2.571" />
                </svg>
              </div>
              <p className="text-gray-500 dark:text-gray-400">No external links found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
