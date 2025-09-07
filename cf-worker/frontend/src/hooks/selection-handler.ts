// SelectionHandler class for managing SVG element interactions
export class SelectionHandler {
  private selectElement: (element: Element, text: string) => void;
  private clearSelection: () => void;
  private currentContainer: HTMLElement | null = null;
  private selectedClass = 'element-selected';

  constructor(
    selectElement: (element: Element, text: string) => void,
    clearSelection: () => void
  ) {
    this.selectElement = selectElement;
    this.clearSelection = clearSelection;
  }

  setupForContainer(container: HTMLElement) {
    this.currentContainer = container;
    const svg = container.querySelector('svg');
    
    if (!svg) {
      console.warn('No SVG found in container');
      return;
    }
    
    this.clearExistingSelection();
    this.setupClickHandlers(svg);
    this.setupCanvasDeselect(svg);
  }

  private clearExistingSelection() {
    if (this.currentContainer) {
      const selected = this.currentContainer.querySelector(`.${this.selectedClass}`);
      if (selected) {
        this.removeSelectionStyling(selected);
      }
    }
  }

  private setupClickHandlers(svg: SVGElement) {
    // Setup for different diagram types
    const diagramType = this.detectDiagramType(svg);
    
    switch (diagramType) {
      case 'flowchart':
      case 'graph':
        this.setupFlowchartSelection(svg);
        break;
      case 'sequence':
        this.setupSequenceSelection(svg);
        break;
      default:
        this.setupGenericSelection(svg);
    }
  }

  private setupFlowchartSelection(svg: SVGElement) {
    // Nodes
    const nodes = svg.querySelectorAll('g.node, .node');
    nodes.forEach(node => {
      (node as HTMLElement).style.cursor = 'pointer';
      node.addEventListener('click', (e) => {
        e.stopPropagation();
        const text = this.extractNodeText(node);
        if (text) {
          this.selectElement(node, text);
        }
      });
    });

    // Edge labels
    const edgeLabels = svg.querySelectorAll('.edgeLabel, g.edgeLabel');
    edgeLabels.forEach(label => {
      (label as HTMLElement).style.cursor = 'pointer';
      label.addEventListener('click', (e) => {
        e.stopPropagation();
        const text = this.extractEdgeText(label);
        if (text) {
          this.selectElement(label, text);
        }
      });
    });
  }

  private setupSequenceSelection(svg: SVGElement) {
    // Participants/actors
    const actorCandidates = svg.querySelectorAll('g.actor, .actor, rect.actor, text.actor');
    actorCandidates.forEach(candidate => {
      let labelText = '';
      let labelElement: Element | null = null;

      if (candidate.tagName.toLowerCase() === 'g') {
        labelElement = candidate.querySelector('text');
      } else if (candidate.tagName.toLowerCase() === 'rect') {
        labelElement = candidate.parentElement?.querySelector('text') || null;
      } else if (candidate.tagName.toLowerCase() === 'text' || candidate.tagName.toLowerCase() === 'tspan') {
        labelElement = candidate;
      }

      if (labelElement) {
        labelText = (labelElement.textContent || '').trim();
      }

      if (labelText) {
        (candidate as HTMLElement).style.cursor = 'pointer';
        candidate.addEventListener('click', (e) => {
          e.stopPropagation();
          this.selectElement(candidate, labelText);
        });

        if (labelElement !== candidate && labelElement) {
          (labelElement as HTMLElement).style.cursor = 'pointer';
          labelElement.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectElement(labelElement, labelText);
          });
        }
      }
    });

    // Notes and messages
    const notes = svg.querySelectorAll('g.note, .note');
    notes.forEach(note => {
      (note as HTMLElement).style.cursor = 'pointer';
      note.addEventListener('click', (e) => {
        e.stopPropagation();
        const text = this.extractNoteText(note);
        if (text) {
          this.selectElement(note, text);
        }
      });
    });

    // Background rectangles for blocks
    const rects = svg.querySelectorAll('rect');
    rects.forEach(rect => {
      if (this.isSelectableRect(rect)) {
        (rect as SVGRectElement).style.cursor = 'pointer';
        rect.addEventListener('click', (e) => {
          e.stopPropagation();
          const text = this.extractBlockText(rect, svg);
          if (text) {
            this.selectElement(rect, text);
          }
        });
      }
    });
  }

  private setupGenericSelection(svg: SVGElement) {
    // Any text element
    const texts = svg.querySelectorAll('text');
    texts.forEach(text => {
      if (text.textContent?.trim()) {
        (text as SVGTextElement).style.cursor = 'pointer';
        text.addEventListener('click', (e) => {
          e.stopPropagation();
          this.selectElement(text, text.textContent!.trim());
        });
      }
    });

    // Any labeled group
    const groups = svg.querySelectorAll('g[id]');
    groups.forEach(group => {
      const text = group.querySelector('text');
      if (text && text.textContent?.trim()) {
        (group as HTMLElement).style.cursor = 'pointer';
        group.addEventListener('click', (e) => {
          e.stopPropagation();
          this.selectElement(group, text.textContent!.trim());
        });
      }
    });
  }

  private setupCanvasDeselect(svg: SVGElement) {
    svg.addEventListener('click', (e) => {
      if (e.target === svg || (e.target as Element).classList.contains('background')) {
        this.clearSelection();
      }
    });
  }


  private removeSelectionStyling(element: Element) {
    if (!element) return;
    
    element.classList.remove(this.selectedClass);
    
    const tagName = element.tagName.toLowerCase();
    
    switch (tagName) {
      case 'text':
      case 'tspan':
        (element as SVGTextElement).style.fontWeight = '';
        (element as SVGTextElement).style.filter = '';
        break;
        
      case 'rect':
        const originalStroke = element.getAttribute('data-original-stroke');
        const originalWidth = element.getAttribute('data-original-stroke-width');
        if (originalStroke !== null) {
          element.setAttribute('stroke', originalStroke);
        }
        if (originalWidth !== null) {
          element.setAttribute('stroke-width', originalWidth);
        }
        (element as SVGRectElement).style.filter = '';
        break;
        
      case 'g':
        const shape = element.querySelector('rect, circle, ellipse, polygon');
        if (shape) {
          const origStroke = shape.getAttribute('data-original-stroke');
          const origWidth = shape.getAttribute('data-original-stroke-width');
          if (origStroke !== null) {
            shape.setAttribute('stroke', origStroke);
          }
          if (origWidth !== null) {
            shape.setAttribute('stroke-width', origWidth);
          }
        }
        const text = element.querySelector('text');
        if (text) {
          (text as SVGTextElement).style.fontWeight = '';
        }
        break;
    }
  }

  private extractNodeText(node: Element): string {
    const textElement = node.querySelector('text, .nodeLabel, span');
    
    if (textElement) {
      const tspans = textElement.querySelectorAll('tspan');
      if (tspans.length > 0) {
        return Array.from(tspans)
          .map(t => t.textContent?.trim())
          .filter(Boolean)
          .join(' ');
      }
      
      return textElement.textContent?.trim() || '';
    }
    
    return '';
  }

  private extractEdgeText(label: Element): string {
    const text = label.querySelector('text, span');
    return text ? (text.textContent?.trim() || '') : (label.textContent?.trim() || '');
  }

  private extractNoteText(note: Element): string {
    const texts = note.querySelectorAll('text');
    return Array.from(texts)
      .map(t => t.textContent?.trim())
      .filter(Boolean)
      .join('\n');
  }

  private extractBlockText(rect: Element, svg: SVGElement): string {
    const bbox = (rect as SVGRectElement).getBBox();
    
    const texts = Array.from(svg.querySelectorAll('text')).filter(text => {
      const textBox = (text as SVGTextElement).getBBox();
      return (
        textBox.x >= bbox.x - 5 &&
        textBox.x + textBox.width <= bbox.x + bbox.width + 5 &&
        textBox.y >= bbox.y - 5 &&
        textBox.y + textBox.height <= bbox.y + bbox.height + 5
      );
    });
    
    return texts
      .map(t => t.textContent?.trim())
      .filter(Boolean)
      .join('\n');
  }

  private isSelectableRect(rect: Element): boolean {
    const fill = rect.getAttribute('fill');
    
    if (!fill || ['#fff', '#ffffff', 'white', 'none', 'transparent'].includes(fill.toLowerCase())) {
      return false;
    }
    
    const width = parseFloat(rect.getAttribute('width') || '0');
    const height = parseFloat(rect.getAttribute('height') || '0');
    
    return width > 100 && height > 40;
  }

  private detectDiagramType(svg: SVGElement): string {
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

  cleanup() {
    if (this.currentContainer) {
      const svg = this.currentContainer.querySelector('svg');
      if (svg) {
        // Remove all event listeners by cloning the SVG
        const newSvg = svg.cloneNode(true) as SVGElement;
        svg.parentNode?.replaceChild(newSvg, svg);
      }
    }
  }
}
