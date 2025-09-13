import { useCallback } from 'react';
import { ClusterNode } from '../types/cluster';
import { fetchClusterChildren } from '../lib/api';

export function useClusterLazyLoading(
  clusters: ClusterNode | null,
  setClusters: (clusters: ClusterNode | null) => void
) {
  const loadClusterChildren = useCallback(async (clusterId: string) => {
    if (!clusters) return;
    
    try {
      console.log('🔄 Loading children for cluster:', clusterId);
      const response = await fetchClusterChildren(clusterId);
      
      if (response.success && response.cluster) {
        // Update the clusters tree with the new children
        const updateClusterWithChildren = (node: ClusterNode): ClusterNode => {
          if (node.id === clusterId) {
            return {
              ...node,
              children: response.cluster.children || []
            };
          }
          
          if (node.children) {
            return {
              ...node,
              children: node.children.map(updateClusterWithChildren)
            };
          }
          
          return node;
        };
        
        const updatedClusters = updateClusterWithChildren(clusters);
        setClusters(updatedClusters);
        
        console.log('✅ Cluster children loaded successfully:', clusterId);
      }
    } catch (error) {
      console.error('❌ Failed to load cluster children:', error);
    }
  }, [clusters, setClusters]);
  
  return { loadClusterChildren };
}
