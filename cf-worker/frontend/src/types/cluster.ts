export type ClusterNode = {
  id: string;
  label: string;
  headline?: string;         // engaging title for display
  description?: string;      // 2-3 sentences describing the cluster
  weight?: number;          // default: items.length or 1
  items?: { id: string; url?: string; title?: string; score?: number }[];
  children?: ClusterNode[];
};
