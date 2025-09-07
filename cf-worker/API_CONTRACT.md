API Endpoints
-------------

POST /api/describe
- Request JSON: { "query": "..." }
- Response JSON (200):
  {
    "success": true,
    "query": "...",
    "description": "...",
    "content": "...",
    "diagram_type": "flowchart|radial_mindmap|sequence_comparison",
    "diagram": "<mermaid code>",
    "render_type": "html",
    "rendered_content": "<mermaid code>"
  }

POST /api/deep-dive
- Request JSON: { "selected_text": "...", "question": "...", "original_query": "..." }
- Response JSON (200): { "success": true, "response": "explanation text" }

Frontend snippet (calls from Infflow-magicpath):

```ts
async function describe(query: string) {
  const res = await fetch('/api/describe', { method: 'POST', body: JSON.stringify({ query }), headers: { 'Content-Type': 'application/json' } });
  return res.json();
}
```
