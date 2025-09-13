import { useEffect, useRef, useCallback } from 'react';
import { FoamTree } from '@carrotsearch/foamtree';
import { ClusterNode } from '../../types/cluster';
import { toFoamTreeData } from '../../lib/foamtree/adapter';

type Props = {
  data: ClusterNode;
  onSelect?: (nodeIds: string[]) => void;          // reflect selection in results panel
  onOpen?: (nodeId: string) => void;               // request lazy load of children
  onExpose?: (nodeId: string) => void;             // sync breadcrumb
  className?: string;
};

export function FoamTreeView({ 
  data, 
  onSelect, 
  onOpen, 
  onExpose, 
  className = '' 
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const foamTreeRef = useRef<FoamTree | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const resizeTimeoutRef = useRef<number | null>(null);

  // Debounced resize handler
  const handleResize = useCallback(() => {
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    
    resizeTimeoutRef.current = window.setTimeout(() => {
      if (foamTreeRef.current && containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        if (width > 0 && height > 0) {
          foamTreeRef.current.resize();
        }
      }
    }, 250);
  }, []);

  // Initialize FoamTree
  useEffect(() => {
    if (!containerRef.current) return;

    // Check if element has dimensions
    const { width, height } = containerRef.current.getBoundingClientRect();
    if (width === 0 || height === 0) {
      console.warn('FoamTreeView: Container has zero dimensions, skipping initialization');
      return;
    }

    // Check if already embedded
    if (containerRef.current.querySelector('.foamtree')) {
      console.warn('FoamTreeView: Visualization already embedded, skipping initialization');
      return;
    }

    try {
      foamTreeRef.current = new FoamTree({
        element: containerRef.current,
        pixelRatio: window.devicePixelRatio || 1,
        // Event handlers
        onGroupClick: (event: any) => {
          const nodeIds = event.group ? [event.group.id] : [];
          onSelect?.(nodeIds);
        },
        onGroupSelectionChanged: (event: any) => {
          const nodeIds = event.selection ? event.selection.map((g: any) => g.id) : [];
          onSelect?.(nodeIds);
        },
        onGroupOpenOrClose: (event: any) => {
          if (event.group?.id) {
            onOpen?.(event.group.id);
          }
        },
        onGroupExposed: (event: any) => {
          if (event.group?.id) {
            onExpose?.(event.group.id);
          }
        }
      });

      // Set initial data
      const foamData = toFoamTreeData(data);
      foamTreeRef.current.set({ dataObject: foamData });

      // Setup resize observer
      resizeObserverRef.current = new ResizeObserver(handleResize);
      resizeObserverRef.current.observe(containerRef.current);

    } catch (error) {
      console.error('FoamTreeView: Failed to initialize FoamTree:', error);
    }

    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      if (foamTreeRef.current) {
        try {
          foamTreeRef.current.dispose();
        } catch (error) {
          console.warn('FoamTreeView: Error disposing FoamTree:', error);
        }
        foamTreeRef.current = null;
      }
    };
  }, []); // Only run once on mount

  // Update data when it changes
  useEffect(() => {
    if (foamTreeRef.current) {
      try {
        const foamData = toFoamTreeData(data);
        foamTreeRef.current.set({ dataObject: foamData });
      } catch (error) {
        console.error('FoamTreeView: Failed to update data:', error);
      }
    }
  }, [data]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && foamTreeRef.current) {
        try {
          foamTreeRef.current.reset();
        } catch (error) {
          console.warn('FoamTreeView: Error resetting view:', error);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`${className} w-full h-full min-h-[400px]`}
      style={{ minHeight: '400px' }}
    />
  );
}
