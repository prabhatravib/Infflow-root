// src/components/NodeLinksPopover.tsx
import React from "react";

type Item = { title: string; url: string; snippet?: string; favicon?: string | null };

export function NodeLinksPopover({
  point,
  query,
  meta,
  onClose,
}: {
  point: { x: number; y: number } | null;
  query: string | null;
  meta?: any;
  onClose: () => void;
}) {
  const [items, setItems] = React.useState<Item[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancel = false;
    async function run() {
      if (!query) return;
      console.log('[NodeLinksPopover] Starting search for query:', query);
      setLoading(true);
      setError(null);
      setItems(null);
      try {
        console.log('[NodeLinksPopover] Making API call to /api/node-search');
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
        console.log('[NodeLinksPopover] API response status:', resp.status);
        console.log('[NodeLinksPopover] API response headers:', Object.fromEntries(resp.headers.entries()));
        
        const data = await resp.json();
        console.log('[NodeLinksPopover] API response data:', data);
        
        if (!cancel) {
          if (data.error) {
            console.error('[NodeLinksPopover] API error:', data.error);
            setError(`API Error: ${data.error}${data.details ? ' - ' + data.details : ''}`);
          } else {
            setItems(data.items || []);
          }
        }
      } catch (e: any) {
        console.error('[NodeLinksPopover] Fetch error:', e);
        if (!cancel) setError(`Network Error: ${e?.message || "Failed to fetch"}`);
      } finally {
        if (!cancel) setLoading(false);
      }
    }
    run();
    return () => {
      cancel = true;
    };
  }, [query]);

  if (!point || !query) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: point.x + 10,
        top: point.y + 10,
        maxWidth: 440,
        zIndex: 9999,
        background: "white",
        border: "1px solid rgba(0,0,0,0.15)",
        borderRadius: 10,
        boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
        padding: 12,
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div style={{ fontWeight: 600, fontSize: 14, lineHeight: "18px", overflow: "hidden", textOverflow: "ellipsis" }}>
          Links for: <span style={{ opacity: 0.85 }}>{query}</span>
        </div>
        <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer" }} aria-label="Close">
          ✕
        </button>
      </div>

      {loading && <div style={{ padding: "8px 0" }}>Searching…</div>}
      {error && (
        <div style={{ padding: "8px 0", color: "crimson", fontSize: "12px", lineHeight: "16px" }}>
          <div style={{ fontWeight: "bold", marginBottom: "4px" }}>Error:</div>
          <div>{error}</div>
        </div>
      )}

      {items && items.length > 0 && (
        <ul style={{ margin: "8px 0 0 0", padding: 0, listStyle: "none" }}>
          {items.map((it, i) => (
            <li key={i} style={{ padding: "8px 0", borderTop: i ? "1px solid rgba(0,0,0,0.06)" : "none" }}>
              <a href={it.url} target="_blank" rel="noreferrer" style={{ 
                fontSize: 14, 
                color: "#0066cc", 
                textDecoration: "none",
                wordBreak: "break-all",
                lineHeight: "20px"
              }}>
                {it.url}
              </a>
            </li>
          ))}
        </ul>
      )}

      {items && items.length === 0 && !loading && <div style={{ paddingTop: 8 }}>No results.</div>}
    </div>
  );
}
