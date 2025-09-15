export type Theme = string; // free-form, provided by the model

export type NodeMeta = {
  theme: Theme;        // e.g., "roman history"
  keywords?: string[]; // e.g., ["founding","republic","empire"]
  search?: string;     // optional prebuilt query
  entity?: string;     // e.g., "Rome"
};

export type DiagramMeta = { nodes: Record<string, NodeMeta> };

export type DiagramResponse = {
  diagram_type: string;
  description?: string;
  diagram: string;
  diagram_meta?: DiagramMeta;
};

export type NodeSearchRequest = {
  query: string;       // original user query ("Details about Rome")
  entity?: string;
  theme?: Theme;
  keywords?: string[];
  search?: string;
  phrase?: string;     // visible node text (fallback)
};

export type NodeSearchItem = {
  title: string;
  url: string;
  snippet?: string | null;
  favicon?: string | null;
};

export type NodeSearchResponse = {
  items: NodeSearchItem[];
  debug?: any;
};
