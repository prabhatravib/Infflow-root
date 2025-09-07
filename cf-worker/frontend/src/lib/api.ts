export type DiagramResponse = {
  success: true;
  query: string;
  description: string;
  content: string;
  diagram_type: string;
  diagram: string;
  render_type: string;
  rendered_content: string;
};

export async function describe(query: string): Promise<DiagramResponse> {
  const res = await fetch('/api/describe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query }) });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}
