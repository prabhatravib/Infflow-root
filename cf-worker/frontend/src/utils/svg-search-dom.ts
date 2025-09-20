/**
 * DOM utilities for SVG manipulation and node finding.
 * Handles finding nodes, clearing visuals, and reading node dimensions.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
const XHTML_NS = 'http://www.w3.org/1999/xhtml';

/**
 * Try to locate the central node "A" in various Mermaid outputs.
 */
export function findNodeA(svg: SVGSVGElement): SVGGElement | null {
  const selectors = [
    'g[id^="flowchart-A"]',
    '[data-id="A"]',
    '[id$="-A"]',
    '#A',
    '.node#A',
    '.node[id*="A"]',
  ];
  for (const sel of selectors) {
    const el = svg.querySelector(sel) as SVGGElement | null;
    if (el) return el;
  }

  // Fallback: find group whose text is exactly 'A'
  const groups = Array.from(svg.querySelectorAll('g')) as SVGGElement[];
  const byText = groups.find(g => (g.textContent || '').trim() === 'A');
  return byText || null;
}

/**
 * Remove visual children of a node
 */
export function clearNodeVisuals(node: SVGGElement) {
  const visuals = node.querySelectorAll('rect, text, .label, foreignObject, path, polygon, ellipse, circle');
  visuals.forEach(el => el.parentElement?.removeChild(el));
}

/**
 * Read node box from its primary rect if present
 */
export function getNodeBox(node: SVGGElement): { x: number; y: number; width: number; height: number } {
  const rect = node.querySelector('rect') as SVGRectElement | null;
  if (rect) {
    const width = Number(rect.getAttribute('width') || '0');
    const height = Number(rect.getAttribute('height') || '0');
    const xAttr = rect.getAttribute('x');
    const yAttr = rect.getAttribute('y');
    const x = xAttr !== null ? Number(xAttr) : -width / 2;
    const y = yAttr !== null ? Number(yAttr) : -height / 2;
    return { x, y, width, height };
  }

  const bbox = node.getBBox();
  const width = bbox.width;
  const height = bbox.height;
  return { x: -width / 2, y: -height / 2, width, height };
}

/**
 * Update the value of the central search input
 */
export function updateCentralSearchValue(svg: SVGSVGElement, value: string) {
  const input = svg.querySelector('input[data-central-search-input]') as HTMLInputElement;
  if (input && input.value !== value) {
    input.value = value;
  }
}

/**
 * Remove the central node A completely from the SVG
 * This includes the node itself and all its connections
 */
export function removeCentralNodeA(svg: SVGSVGElement) {
  if (!svg) {
    console.log('[remove-node-a] No SVG provided');
    return;
  }

  console.log('[remove-node-a] Starting removal process...');
  console.log('[remove-node-a] SVG element:', svg);

  const nodeA = findNodeA(svg);
  if (!nodeA) {
    console.log('[remove-node-a] Node A not found in SVG');
    // Let's try to find all possible nodes to debug
    const allGroups = svg.querySelectorAll('g');
    console.log('[remove-node-a] All groups found:', allGroups.length);
    allGroups.forEach((group, index) => {
      console.log(`[remove-node-a] Group ${index}:`, {
        id: group.id,
        textContent: group.textContent?.trim(),
        className: group.className
      });
    });
    return;
  }

  console.log('[remove-node-a] Found node A:', nodeA);
  console.log('[remove-node-a] Node A details:', {
    id: nodeA.id,
    textContent: nodeA.textContent?.trim(),
    className: nodeA.className
  });

  // Find all connections/edges that involve node A
  const edges = svg.querySelectorAll('path[id*="flowchart-A"], path[id*="-A-"], .edge[id*="A"], path[id*="A-"], path[id*="-A"]');
  console.log(`[remove-node-a] Found ${edges.length} edges connected to node A`);
  
  // Remove all edges connected to node A
  edges.forEach((edge, index) => {
    console.log(`[remove-node-a] Removing edge ${index}:`, edge);
    edge.parentElement?.removeChild(edge);
  });

  // Remove the node A itself
  console.log('[remove-node-a] Removing node A itself...');
  nodeA.parentElement?.removeChild(nodeA);
  
  console.log('[remove-node-a] Successfully removed central node A and its connections');
}

/**
 * SVG and XHTML namespace constants
 */
export const SVG_NAMESPACES = {
  SVG: SVG_NS,
  XHTML: XHTML_NS
} as const;
