export type DiagramResponse = {
  success: true;
  query: string;
  description: string;
  content: string;
  universal_content: string;
  diagram_type: string;
  diagram: string;
  render_type: string;
  rendered_content: string;
  cluster_data?: any;
};

export type DeepDiveRequest = {
  selected_text: string;
  question: string;
  original_query?: string;
};

export type DeepDiveResponse = {
  success: true;
  response: string;
};

import { ClusterNode } from '../types/cluster';

export type ClusterResponse = {
  success: true;
  cluster: ClusterNode;
};

export async function describe(query: string): Promise<DiagramResponse> {
  const res = await fetch('/api/describe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query }) });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export async function callDeepDiveApi(params: DeepDiveRequest): Promise<DeepDiveResponse> {
  const res = await fetch('/api/deep-dive', { 
    method: 'POST', 
    headers: { 'content-type': 'application/json' }, 
    body: JSON.stringify(params) 
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export async function fetchClusterChildren(clusterId: string): Promise<ClusterResponse> {
  const res = await fetch('/api/cluster', { 
    method: 'POST', 
    headers: { 'content-type': 'application/json' }, 
    body: JSON.stringify({ clusterId }) 
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}
