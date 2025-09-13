export type ClusterNode = {
  id: string;
  label: string;
  weight?: number;          // default: items.length or 1
  items?: { id: string; url?: string; title?: string; score?: number }[];
  children?: ClusterNode[];
};
