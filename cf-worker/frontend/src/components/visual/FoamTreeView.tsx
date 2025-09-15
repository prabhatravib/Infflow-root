import { useEffect, useRef, useCallback } from 'react';
import { FoamTree } from '@carrotsearch/foamtree';
import { ClusterNode } from '../../types/cluster';
import { toFoamTreeData } from '../../lib/foamtree/adapter';

type Props = {
  data: ClusterNode;
  onSelect?: (nodeIds: string[]) => void;          // reflect selection in results panel
  onOpen?: (nodeId: string) => void;               // request lazy load of children
  onExpose?: (nodeId: string) => void;             // sync breadcrumb
  onSetupSelection?: (container: HTMLElement) => void; // for deep dive functionality
  className?: string;
};

export function FoamTreeView({ 
  data, 
  onSelect, 
  onOpen, 
  onExpose, 
  onSetupSelection,
  className = '' 
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const foamTreeRef = useRef<FoamTree | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const resizeTimeoutRef = useRef<number | null>(null);

  // Deterministic string hash for stable color assignment
  const hashString = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
  };

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

  // Setup text selection for deep dive functionality
  const setupTextSelection = useCallback(() => {
    if (!containerRef.current || !onSetupSelection) return;

    // Wait for FoamTree to render
    setTimeout(() => {
      const foamTreeContainer = containerRef.current?.querySelector('.foamtree');
      if (!foamTreeContainer) return;

      // Setup the selection handler for the foam tree container
      onSetupSelection(foamTreeContainer as HTMLElement);
    }, 100);
  }, [onSetupSelection]);

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
        // Hide the library title bar overlay
        maxLabelSizeForTitleBar: 0,
        titleBarDecorator: () => {},
        // Disable zoom functionality
        zoomMin: 1,
        zoomMax: 1,
        wheelZoom: false,
        doubleClickZoom: false,
        // Professional subtle color palette with varied muted colors
        groupColorDecorator: (_opts: any, params: any, vars: any) => {
          // Carefully curated, low-saturation palette (no yellow or pink)
          const palette = [
            '#E3F2FD', // very light blue
            '#E8EAF6', // very light indigo
            '#E0F2F1', // very light teal
            '#E0F7FA', // very light cyan
            '#E8F5E9', // very light green
            '#ECEFF1', // cool gray
            '#F0F4F8', // blue-gray
            '#F3F4F6'  // neutral gray
          ];

          // Derive a stable color per-group using its id + parent id + depth
          const gid = String(params?.group?.id ?? '');
          const parentId = String((params && (params.parent?.id || params.group?.parent?.id)) || 'root');
          const depth = Number((params as any)?.depth ?? 0);
          const colorIdx = (hashString(gid) + hashString(parentId) + depth) % palette.length;
          const color = palette[colorIdx];
          vars.groupColor = color;
          // Ensure label has strong contrast
          vars.groupLabelColor = '#1F2937'; // gray-800
          // Subtle border
          vars.groupBorderColor = '#E5E7EB'; // gray-200
          return color;
        },
        // Prefer plain fills to avoid gradients
        groupFillType: 'plain' as any,
        groupBorderWidth: 1,
        groupBorderColor: '#E0E0E0',
        groupBorderRadius: 0,
        // Text styling for headlines and descriptions
        groupLabelVerticalAlignment: 'center',
        groupLabelHorizontalAlignment: 'center',
        groupLabelMaxTotalHeight: 0.8,
        groupLabelMaxFontSize: 22,
        groupLabelMinFontSize: 12,
        groupLabelFontFamily: 'system-ui, -apple-system, sans-serif',
        groupLabelFontWeight: 'normal',
        groupLabelLineHeight: 1.3,
        groupLabelMaxLines: 6,
        groupLabelWordWrap: 'break-word',
        groupLabelColor: '#2C3E50',
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

      // Setup text selection for deep dive functionality
      if (onSetupSelection) {
        setupTextSelection();
      }

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
        
        // Setup text selection after data update
        if (onSetupSelection) {
          setupTextSelection();
        }
      } catch (error) {
        console.error('FoamTreeView: Failed to update data:', error);
      }
    }
  }, [data, onSetupSelection, setupTextSelection]);

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
      style={{ 
        minHeight: '400px',
        transform: 'scaleX(0.8)',
        transformOrigin: 'center'
      }}
    />
  );
}
