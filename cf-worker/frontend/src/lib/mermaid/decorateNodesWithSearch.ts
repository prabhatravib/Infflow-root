// src/lib/mermaid/decorateNodesWithSearch.ts
type DecorateOptions = {
  svg: SVGSVGElement;
  originalQuery: string;
  diagramMeta?: { nodes: Record<string, any> };
  onOpenPopover: (arg: {
    clientX: number;
    clientY: number;
    nodeText: string;
    nodeId: string;
    query: string;
    meta?: any;
  }) => void;
  excludeIds?: Set<string>;
};

function getNodeText(g: SVGGElement): string {
  const text = g.querySelector("text");
  return (text?.textContent || "").trim().replace(/\s+/g, " ");
}

function isSubgraph(g: SVGGElement): boolean {
  // Check if this is a subgraph container by looking for characteristic subgraph elements
  const id = g.getAttribute("id") || "";
  const className = g.className.baseVal || "";

  // Subgraphs typically have these characteristics:
  // 1. ID contains "subgraph" or "cluster"
  // 2. Contains nested groups (child nodes)
  // 3. Has a rect element that serves as the container background
  // 4. Contains multiple child groups that are actual nodes

  if (id.includes("subgraph") || id.includes("cluster") || className.includes("cluster")) {
    return true;
  }

  // Check if this group contains other groups (indicating it's a container)
  const childGroups = g.querySelectorAll(":scope > g");
  if (childGroups.length > 1) {
    // Additional check: see if it has a background rect (typical for subgraphs)
    const backgroundRect = g.querySelector("rect[fill], rect[stroke]");
    if (backgroundRect) {
      return true;
    }
  }

  return false;
}

export function decorateNodesWithSearch(opts: DecorateOptions) {
  const { svg, originalQuery, diagramMeta, onOpenPopover, excludeIds = new Set() } = opts;

  // CLEANUP: Remove all existing decorations from previous renders to prevent duplicates
  console.log('[decorateNodesWithSearch] Cleaning up existing decorations...');
  const existingDecorations = svg.querySelectorAll('g.__search');
  console.log(`[decorateNodesWithSearch] Found ${existingDecorations.length} existing __search decorations to remove`);
  existingDecorations.forEach(decoration => {
    decoration.parentElement?.removeChild(decoration);
  });

  // Also remove any duplicate filter definitions
  const existingFilters = svg.querySelectorAll('filter[id="search-shadow"]');
  if (existingFilters.length > 1) {
    console.log(`[decorateNodesWithSearch] Found ${existingFilters.length} duplicate search-shadow filters, removing extras`);
    // Keep only the first one, remove the rest
    Array.from(existingFilters).slice(1).forEach(filter => {
      filter.parentElement?.removeChild(filter);
    });
  }

  // Expand the SVG viewBox to accommodate icons that extend beyond the content
  const svgDataset = (svg as unknown as HTMLElement).dataset as DOMStringMap | undefined;
  const currentViewBox = svg.getAttribute('viewBox');
  const originalViewBox = svgDataset?.searchOriginalViewBox || currentViewBox;

  if (svgDataset && !svgDataset.searchOriginalViewBox && currentViewBox) {
    svgDataset.searchOriginalViewBox = currentViewBox;
  }

  if (originalViewBox) {
    const viewBoxValues = originalViewBox.split(' ').map(Number);
    if (viewBoxValues.length === 4 && viewBoxValues.every(v => Number.isFinite(v))) {
      const [x, y, width, height] = viewBoxValues;
      const margin = 50; // Add 50px margin on all sides
      svg.setAttribute('viewBox', `${x - margin} ${y - margin} ${width + margin * 2} ${height + margin * 2}`);
    }
  }

  console.log('[decorateNodesWithSearch] Starting decoration with query:', originalQuery);
  console.log('[decorateNodesWithSearch] SVG element:', svg);
  console.log('[decorateNodesWithSearch] SVG innerHTML preview:', svg.innerHTML.substring(0, 500) + '...');
  console.log('[decorateNodesWithSearch] diagramMeta structure:', diagramMeta);
  console.log('[decorateNodesWithSearch] diagramMeta.facts:', Array.isArray(diagramMeta) ? diagramMeta : (diagramMeta as any)?.facts);

  // Try multiple selectors to find Mermaid nodes (excluding subgraphs/clusters)
  const selectors = [
    "g.node",
    "g.nodes > g",
    // Removed "g.cluster" - this targets subgraphs, not individual nodes
    "g.flowchart-label",
    // Removed "g[id*='flowchart']" - this is too broad and includes subgraphs
    "g[id*='node']",
    "g[id*='A']",
    "g[id*='B']",
    "g[id*='C']",
    "g[id*='D']",
    "g[id*='E']",
    "g[id*='F']",
    "g[id*='G']",
    "g[id*='H']",
    "g[id*='I']",
    "g[id*='J']",
    "g[id*='K']",
    "g[id*='L']",
    "g[id*='M']",
    "g[id*='N']",
    "g[id*='O']",
    "g[id*='P']",
    "g[id*='Q']",
    "g[id*='R']",
    "g[id*='S']",
    "g[id*='T']",
    "g[id*='U']",
    "g[id*='V']",
    "g[id*='W']",
    "g[id*='X']",
    "g[id*='Y']",
    "g[id*='Z']",
    // Additional selectors for different Mermaid diagram types
    "g[id*='-node-']",
    "g[id*='-A-']",
    "g[id*='-B-']",
    "g[id*='-C-']",
    "g[id*='-D-']",
    "g[id*='-E-']",
    "g[id*='-F-']",
    "g[id*='-G-']",
    "g[id*='-H-']",
    "g[id*='-I-']",
    "g[id*='-J-']",
    "g[id*='-K-']",
    "g[id*='-L-']",
    "g[id*='-M-']",
    "g[id*='-N-']",
    "g[id*='-O-']",
    "g[id*='-P-']",
    "g[id*='-Q-']",
    "g[id*='-R-']",
    "g[id*='-S-']",
    "g[id*='-T-']",
    "g[id*='-U-']",
    "g[id*='-V-']",
    "g[id*='-W-']",
    "g[id*='-X-']",
    "g[id*='-Y-']",
    "g[id*='-Z-']"
  ];

  const nodeGroups = new Set<SVGGElement>();

  selectors.forEach(selector => {
    const found = svg.querySelectorAll<SVGGElement>(selector);
    found.forEach(g => nodeGroups.add(g));
  });

  // Fallback: find any group with text content that looks like a node
  if (nodeGroups.size === 0) {
    console.log('[decorateNodesWithSearch] No nodes found with selectors, trying fallback approach...');
    const allGroups = svg.querySelectorAll('g');
    allGroups.forEach(g => {
      const text = g.textContent?.trim();
      if (text && text.length > 0 && text.length < 100 && !text.includes('flowchart') && !text.includes('svg')) {
        // Skip subgraphs in fallback too
        if (isSubgraph(g)) {
          return;
        }

        // Check if this group has a rect, polygon, or other shape element (indicating it's a node)
        const hasShape = g.querySelector('rect, polygon, path, ellipse, circle');
        if (hasShape) {
          nodeGroups.add(g);
        }
      }
    });
  }

  const nodeGroupsArray = Array.from(nodeGroups);

  console.log('[decorateNodesWithSearch] Found node groups:', nodeGroupsArray.length);
  nodeGroupsArray.forEach((g, index) => {
    console.log(`[decorateNodesWithSearch] Node ${index}:`, {
      id: g.getAttribute("id"),
      className: g.className,
      textContent: g.textContent?.trim(),
      children: g.children.length
    });
  });

  // Create shadow filter once for all search buttons (outside the loop)
  const defs = svg.querySelector('defs') || svg.insertBefore(document.createElementNS("http://www.w3.org/2000/svg", "defs"), svg.firstChild);
  if (!svg.querySelector('filter[id="search-shadow"]')) {
    const filter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
    filter.setAttribute("id", "search-shadow");
    filter.setAttribute("x", "-50%");
    filter.setAttribute("y", "-50%");
    filter.setAttribute("width", "200%");
    filter.setAttribute("height", "200%");

    const feDropShadow = document.createElementNS("http://www.w3.org/2000/svg", "feDropShadow");
    feDropShadow.setAttribute("dx", "2");
    feDropShadow.setAttribute("dy", "2");
    feDropShadow.setAttribute("stdDeviation", "3");
    feDropShadow.setAttribute("flood-color", "rgba(0,0,0,0.5)");

    filter.appendChild(feDropShadow);
    defs.appendChild(filter);
    console.log('[decorateNodesWithSearch] Created search-shadow filter definition');
  }

  nodeGroupsArray.forEach((g) => {
    const id = g.getAttribute("id") || "";
    if (!id || excludeIds.has(id)) return;

    // Skip subgraphs/clusters - they should not have search buttons
    if (isSubgraph(g)) {
      console.log('[decorateNodesWithSearch] Skipping subgraph:', id);
      return;
    }

    if (g.querySelector(":scope > g.__search")) return; // avoid double-inject

    const rect = (g.querySelector("rect, polygon, path, ellipse") as SVGGraphicsElement) || g;
    const bbox = rect.getBBox();

    const searchButton = document.createElementNS("http://www.w3.org/2000/svg", "g");
    searchButton.classList.add("__search");
    searchButton.setAttribute("cursor", "pointer");
    searchButton.setAttribute("role", "button");
    searchButton.setAttribute("aria-label", "Search for this node");
    searchButton.setAttribute("opacity", "0"); // Hide by default
    searchButton.style.transition = "opacity 0.2s ease-in-out"; // Smooth transition

    const r = Math.max(12, Math.min(16, Math.round(Math.min(bbox.width, bbox.height) * 0.12)));

    // Smart positioning: try left side first, fallback to right side if too close to edge
    let cx = bbox.x - r - 8; // Position on the left side, outside the node
    const cy = bbox.y + bbox.height / 2; // Center vertically on the left edge

    // Check if search button would be too close to viewport edge (within 20px)
    const buttonLeft = cx - r;
    if (buttonLeft < 20) {
      // Move to right side instead
      cx = bbox.x + bbox.width + r + 8;

      // Check if right side is also too close to viewport edge
      const buttonRight = cx + r;
      const viewportWidth = window.innerWidth;
      if (buttonRight > viewportWidth - 20) {
        // If both sides are problematic, position on the side with more space
        const leftSpace = bbox.x - r - 8;
        const rightSpace = viewportWidth - (bbox.x + bbox.width + r + 8);
        if (leftSpace > rightSpace) {
          cx = bbox.x - r - 8;
        } else {
          cx = bbox.x + bbox.width + r + 8;
        }
      }
    }

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", String(cx));
    circle.setAttribute("cy", String(cy));
    circle.setAttribute("r", String(r));
    circle.setAttribute("fill", "#ff4444"); // Bright red for visibility
    circle.setAttribute("stroke", "#ffffff");
    circle.setAttribute("stroke-width", "3");
    circle.setAttribute("filter", "url(#search-shadow)");

    // Create magnifying glass icon using lucide's Search icon path data
    const searchPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const iconSize = r * 1.2; // Scale factor for the icon (doubled from 0.6)

    // Lucide Search icon path data (scaled and positioned)
    const pathData = `M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z`;

    // Create a transform to scale and position the icon
    const scale = iconSize / 24; // Lucide icons are typically 24x24
    const translateX = cx - (24 * scale / 2);
    const translateY = cy - (24 * scale / 2);

    searchPath.setAttribute("d", pathData);
    searchPath.setAttribute("transform", `translate(${translateX}, ${translateY}) scale(${scale})`);
    searchPath.setAttribute("stroke", "#ffffff");
    searchPath.setAttribute("stroke-width", "2");
    searchPath.setAttribute("stroke-linecap", "round");
    searchPath.setAttribute("stroke-linejoin", "round");
    searchPath.setAttribute("fill", "none");
    searchPath.setAttribute("opacity", "1");

    searchButton.appendChild(circle);
    searchButton.appendChild(searchPath);

    console.log('[decorateNodesWithSearch] Created search button elements:', {
      circle: circle.outerHTML,
      searchPath: searchPath.outerHTML,
      position: { cx, cy, r }
    });

    // Add hover effects for the search button itself
    searchButton.addEventListener("mouseenter", () => {
      circle.setAttribute("fill", "#ff6666");
      circle.setAttribute("r", String(r + 2));
      searchPath.setAttribute("stroke-width", "3");
    });

    searchButton.addEventListener("mouseleave", () => {
      circle.setAttribute("fill", "#ff4444");
      circle.setAttribute("r", String(r));
      searchPath.setAttribute("stroke-width", "2");
    });

    // Add hover effects to the node to show/hide the search icon
    g.addEventListener("mouseenter", () => {
      searchButton.setAttribute("opacity", "1");
    });

    g.addEventListener("mouseleave", () => {
      searchButton.setAttribute("opacity", "0");
    });

    searchButton.addEventListener("mousedown", (e: Event) => e.stopPropagation());
    searchButton.addEventListener("click", (e: Event) => {
      e.stopPropagation();
      const nodeText = getNodeText(g);
      const nodeId = id;
      const q = `${originalQuery} "${nodeText}"`;
      // Extract the actual node letter from the nodeId (e.g., "D" from "flowchart-D-3")
      const nodeLetter = nodeId.match(/flowchart-([A-Z])-\d+/)?.[1] || nodeId.match(/^([A-Z])/)?.[1];

      // Get the fact metadata for this node
      let factMeta = {};

      // Handle the metadata structure - it should be { facts: [...] }
      const factsArray = (diagramMeta as any)?.facts || diagramMeta;

      if (factsArray && Array.isArray(factsArray)) {
        // Map node letters to fact indices: B=0, C=1, D=2, E=3, F=4 (since A is removed)
        const nodeIndex = nodeLetter ? nodeLetter.charCodeAt(0) - 66 : -1; // B=0, C=1, etc.
        if (nodeIndex >= 0 && nodeIndex < factsArray.length) {
          factMeta = factsArray[nodeIndex] || {};
        }
      }

      // Debug: log what we're getting from metadata
      console.log('[decorateNodesWithSearch] Fact metadata for node', nodeLetter, ':', factMeta);
      console.log('[decorateNodesWithSearch] All facts array:', Array.isArray(diagramMeta) ? diagramMeta : (diagramMeta as any)?.facts);

      // Create meta object with theme information
      const meta = {
        ...factMeta,
        nodeId: nodeId,
        nodeText: nodeText
      };

      console.log('[decorateNodesWithSearch] Search button clicked!', {
        nodeText,
        nodeId,
        nodeLetter,
        nodeIndex: nodeLetter ? nodeLetter.charCodeAt(0) - 65 : -1,
        query: q,
        factMeta,
        meta,
        allFacts: Array.isArray(diagramMeta) ? diagramMeta : (diagramMeta as any)?.facts,
        diagramMetaStructure: Array.isArray(diagramMeta) ? 'array' : 'object'
      });

      // Log the specific fact metadata for debugging
      console.log('[decorateNodesWithSearch] Fact metadata for node', nodeLetter, ':', factMeta);
      console.log('[decorateNodesWithSearch] All facts array:', Array.isArray(diagramMeta) ? diagramMeta : (diagramMeta as any)?.facts);
      onOpenPopover({
        clientX: (e as MouseEvent).clientX,
        clientY: (e as MouseEvent).clientY,
        nodeText,
        nodeId,
        query: q,
        meta,
      });
    });

    g.appendChild(searchButton);
    console.log('[decorateNodesWithSearch] Added search button to node:', id, 'at position:', cx, cy);
  });
}
