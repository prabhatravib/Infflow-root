// Utility for detecting diagram types and providing appropriate selectors
export class DiagramTypeDetector {
  static detectDiagramType(svg: SVGElement): DiagramType {
    if (svg.querySelector('.actor, .note, sequenceDiagram')) {
      return 'sequence';
    }
    if (svg.querySelector('.node, .edgePath, .flowchart')) {
      return 'flowchart';
    }
    if (svg.querySelector('.gantt')) {
      return 'gantt';
    }
    if (svg.querySelector('.pie')) {
      return 'pie';
    }
    
    return 'generic';
  }

  static getSelectorsForType(diagramType: DiagramType): DiagramSelectors {
    switch (diagramType) {
      case 'flowchart':
        return {
          nodes: 'g.node, .node',
          edgeLabels: '.edgeLabel, g.edgeLabel',
          text: 'text',
          groups: 'g[id]'
        };
      case 'sequence':
        return {
          actors: 'g.actor, .actor, rect.actor, text.actor',
          notes: 'g.note, .note',
          numberedBullets: 'tspan, text',
          rectangles: 'rect'
        };
      case 'generic':
      default:
        return {
          text: 'text',
          groups: 'g[id]'
        };
    }
  }
}

export type DiagramType = 'sequence' | 'flowchart' | 'gantt' | 'pie' | 'generic';

export interface DiagramSelectors {
  nodes?: string;
  edgeLabels?: string;
  actors?: string;
  notes?: string;
  numberedBullets?: string;
  rectangles?: string;
  text?: string;
  groups?: string;
}
