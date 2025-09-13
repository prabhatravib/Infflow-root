import { ClusterNode } from "@/types/cluster";

type FoamGroup = { id?: string; label?: string; weight?: number; groups?: FoamGroup[] };

export function toFoamTreeData(root: ClusterNode): { groups: FoamGroup[] } {
  const map = (n: ClusterNode): FoamGroup => ({
    id: n.id,
    label: n.label,
    weight: n.weight ?? (n.items?.length || 1),
    groups: n.children?.map(map),
  });
  // support both single root and forest
  return root.children ? { groups: root.children.map(map) } : { groups: [map(root)] };
}
