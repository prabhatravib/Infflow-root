const SVG_NS = 'http://www.w3.org/2000/svg';

type NodeInfo = {
  el: SVGGElement;
  id: string;
  width: number;
  height: number;
  translateX: number;
  translateY: number;
  centerX: number;
  centerY: number;
};

function parseTranslate(transform: string | null): { x: number; y: number } {
  if (!transform) return { x: 0, y: 0 };
  const match = /translate\(([-0-9.]+)[ ,]([-0-9.]+)\)/.exec(transform);
  if (!match) return { x: 0, y: 0 };
  return { x: Number(match[1]), y: Number(match[2]) };
}

function buildNodeInfo(el: SVGGElement): NodeInfo {
  const id = el.getAttribute('id') || el.getAttribute('data-id') || '';
  const { x, y } = parseTranslate(el.getAttribute('transform'));
  const bbox = el.getBBox();
  const width = bbox.width;
  const height = bbox.height;
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  return { el, id, width, height, translateX: x, translateY: y, centerX, centerY };
}

function findRootNode(nodes: NodeInfo[]): NodeInfo | null {
  return nodes.find(n => /(^|-)A(\b|$)/.test(n.id)) || null;
}

function computeRadius(root: NodeInfo, leaves: NodeInfo[]): number {
  const leafMax = leaves.reduce((acc, n) => Math.max(acc, Math.max(n.width, n.height)), 0);
  const rootSize = Math.max(root.width, root.height);
  const base = Math.max(rootSize, leafMax);
  const minRadius = base * 1.8 + 80;
  return Math.max(minRadius, 260 + leafMax * 0.9);
}

function makeEdgePath(start: { x: number; y: number }, end: { x: number; y: number }, controlScale: number): string {
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  const vx = end.x - start.x;
  const vy = end.y - start.y;
  const length = Math.max(Math.hypot(vx, vy), 1);
  const nx = -vy / length;
  const ny = vx / length;
  const controlX = midX + nx * controlScale;
  const controlY = midY + ny * controlScale;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} Q ${controlX.toFixed(2)} ${controlY.toFixed(2)} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

export function enforceRadialFanout(svg: SVGSVGElement) {
  if (!svg) return;

  const nodeGroups = Array.from(svg.querySelectorAll<SVGGElement>('g.node'));
  if (nodeGroups.length === 0) return;

  const nodeInfos = nodeGroups.map(buildNodeInfo);
  const root = findRootNode(nodeInfos);
  if (!root) return;

  const leaves = nodeInfos.filter(n => n !== root);
  if (leaves.length === 0) return;

  const radius = computeRadius(root, leaves);
  const angleStep = (Math.PI * 2) / leaves.length;
  const startAngle = -Math.PI / 2; // start at top

  leaves.forEach((leaf, index) => {
    const angle = startAngle + angleStep * index;
    const targetCenterX = root.centerX + Math.cos(angle) * radius;
    const targetCenterY = root.centerY + Math.sin(angle) * radius;
    const targetTranslateX = targetCenterX - leaf.width / 2;
    const targetTranslateY = targetCenterY - leaf.height / 2;
    leaf.el.setAttribute('transform', `translate(${targetTranslateX.toFixed(2)}, ${targetTranslateY.toFixed(2)})`);
    leaf.centerX = targetCenterX;
    leaf.centerY = targetCenterY;
    leaf.translateX = targetTranslateX;
    leaf.translateY = targetTranslateY;
  });

  const edgesContainer = svg.querySelector('g.edgePaths');
  if (edgesContainer) {
    edgesContainer.replaceChildren();
  }

  const labelsContainer = svg.querySelector('g.edgeLabels');
  labelsContainer?.replaceChildren();

  const marker = svg.querySelector('marker[id*="arrowhead"]');
  const markerUrl = marker ? `url(#${marker.id})` : '';

  const controlScale = Math.max(radius * 0.45, 80);

  leaves.forEach((leaf, idx) => {
    if (edgesContainer) {
      const wrapper = document.createElementNS(SVG_NS, 'g');
      wrapper.setAttribute('class', 'edgePath radial');
      wrapper.setAttribute('id', `radial-edge-${leaf.id || idx}`);

      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('class', 'edge-path radial-edge');
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', '#000000');
      path.setAttribute('stroke-width', '2.5');
      if (markerUrl) {
        path.setAttribute('marker-start', markerUrl);
        path.setAttribute('marker-end', markerUrl);
      }
      const d = makeEdgePath({ x: root.centerX, y: root.centerY }, { x: leaf.centerX, y: leaf.centerY }, controlScale);
      path.setAttribute('d', d);
      path.setAttribute('data-radial-target', leaf.id || `node-${idx}`);
      wrapper.appendChild(path);
      edgesContainer.appendChild(wrapper);
    }
  });

  // Expand viewBox if needed
  const bounds = svg.getBBox();
  const padding = 40;
  svg.setAttribute('viewBox', `${Math.floor(bounds.x - padding)} ${Math.floor(bounds.y - padding)} ${Math.ceil(bounds.width + padding * 2)} ${Math.ceil(bounds.height + padding * 2)}`);
}
