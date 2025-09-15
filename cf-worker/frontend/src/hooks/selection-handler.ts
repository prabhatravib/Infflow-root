import { DiagramTypeDetector, DiagramType } from './diagram-type-detector';
import { TextExtractor } from './text-extractor';

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

  private scrollToDeepDive() {
    // Add a small delay to ensure the deep dive panel is rendered
    setTimeout(() => {
      const deepDivePanel = document.querySelector('.deep-dive-panel');
      if (deepDivePanel) {
        deepDivePanel.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
      }
    }, 100);
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
    const diagramType = DiagramTypeDetector.detectDiagramType(svg);
    
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
    // Nodes - exclude only the actual central node from selection
    const nodes = svg.querySelectorAll('g.node, .node');
    nodes.forEach((node, index) => {
      // Only skip the actual central node (A) - check for exact match
      const nodeId = node.getAttribute('id');
      const isCentralNode = nodeId === 'A';
      
      if (isCentralNode) {
        console.log('🚫 Skipping central node (A) from selection to preserve search bar');
        return;
      }
      
      (node as HTMLElement).style.cursor = 'pointer';
      node.addEventListener('click', (e) => {
        e.stopPropagation();
        const text = TextExtractor.extractNodeText(node);
        console.log('🖱️ Node clicked:', text);
        if (text) {
          this.selectElement(node, text);
          this.scrollToDeepDive();
        }
      });
    });

    // Edge labels
    const edgeLabels = svg.querySelectorAll('.edgeLabel, g.edgeLabel');
    edgeLabels.forEach(label => {
      (label as HTMLElement).style.cursor = 'pointer';
      label.addEventListener('click', (e) => {
        e.stopPropagation();
        const text = TextExtractor.extractEdgeText(label);
        if (text) {
          this.selectElement(label, text);
          this.scrollToDeepDive();
        }
      });
    });
  }

  private setupSequenceSelection(svg: SVGElement) {
    // Participants/actors - make entire actor area clickable
    // Different Mermaid versions render actors differently, so target multiple variants
    const actorCandidates = svg.querySelectorAll(
      'g.actor, .actor, rect.actor, text.actor'
    );

    actorCandidates.forEach(candidate => {
      // Try to find a readable label near/within the candidate
      let labelText = '';
      let labelElement: Element | null = null;

      if (candidate.tagName.toLowerCase() === 'g') {
        labelElement = candidate.querySelector('text');
      } else if (candidate.tagName.toLowerCase() === 'rect') {
        // Look for a sibling or a child text node for rect-based actors
        labelElement = candidate.parentElement?.querySelector('text') || null;
      } else if (candidate.tagName.toLowerCase() === 'text' || candidate.tagName.toLowerCase() === 'tspan') {
        labelElement = candidate;
      }

      if (labelElement) {
        labelText = (labelElement.textContent || '').trim();
      }

      if (labelText) {
        // Make the candidate clickable
        (candidate as HTMLElement).style.cursor = 'pointer';
        
        // Add hover effects
        candidate.addEventListener('mouseenter', () => {
          candidate.classList.add('actor-hover');
        });
        candidate.addEventListener('mouseleave', () => {
          candidate.classList.remove('actor-hover');
        });
        
        candidate.addEventListener('click', (e) => {
          e.stopPropagation();
          this.selectElement(candidate, labelText);
          this.scrollToDeepDive();
        });

        // Also make the label text clickable for better UX
        if (labelElement !== candidate && labelElement) {
          (labelElement as HTMLElement).style.cursor = 'pointer';
          labelElement.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectElement(labelElement, labelText);
            this.scrollToDeepDive();
          });
        }
      }
    });
    
    // Notes and messages - make entire note area clickable
    const notes = svg.querySelectorAll('g.note, .note');
    notes.forEach(note => {
      (note as HTMLElement).style.cursor = 'pointer';
      
      // Add hover effects
      note.addEventListener('mouseenter', () => {
        note.classList.add('note-hover');
      });
      note.addEventListener('mouseleave', () => {
        note.classList.remove('note-hover');
      });
      
      // Make the entire note clickable
      note.addEventListener('click', (e) => {
        e.stopPropagation();
        const text = TextExtractor.extractNoteText(note);
        if (text) {
          this.selectElement(note, text);
          this.scrollToDeepDive();
        }
      });
      
      // Also make all text elements within the note clickable
      const textElements = note.querySelectorAll('text, tspan');
      textElements.forEach(textEl => {
        if (textEl.textContent?.trim()) {
          (textEl as HTMLElement).style.cursor = 'pointer';
          textEl.addEventListener('click', (e) => {
            e.stopPropagation();
            const fullText = TextExtractor.extractNoteText(note);
            if (fullText) {
              this.selectElement(note, fullText);
              this.scrollToDeepDive();
            }
          });
        }
      });
    });
    
    // Numbered lines in notes - make individual lines clickable
    const tspans = svg.querySelectorAll('tspan');
    tspans.forEach(tspan => {
      const text = (tspan.textContent || '').trim();
      if (/^\d+[\.\)]\s/.test(text)) {
        (tspan as SVGTSpanElement).style.cursor = 'pointer';
        tspan.addEventListener('click', (e) => {
          e.stopPropagation();
          const fullBulletContent = TextExtractor.extractBulletPointContent(tspan, svg);
          this.selectElement(tspan, fullBulletContent);
          this.scrollToDeepDive();
        });
      }
    });
    
    // Also handle text elements that might contain numbered bullets
    const texts = svg.querySelectorAll('text');
    texts.forEach(text => {
      const textContent = text.textContent?.trim();
      if (textContent && /^\d+[\.\)]\s/.test(textContent)) {
        (text as SVGTextElement).style.cursor = 'pointer';
        text.addEventListener('click', (e) => {
          e.stopPropagation();
          const fullBulletContent = TextExtractor.extractBulletPointContent(text, svg);
          this.selectElement(text, fullBulletContent);
          this.scrollToDeepDive();
        });
      }
    });
    
    // Background rectangles for blocks
    const rects = svg.querySelectorAll('rect');
    rects.forEach(rect => {
      if (TextExtractor.isSelectableRect(rect)) {
        (rect as SVGRectElement).style.cursor = 'pointer';
        rect.addEventListener('click', (e) => {
          e.stopPropagation();
          const text = TextExtractor.extractBlockText(rect, svg);
          if (text) {
            this.selectElement(rect, text);
            this.scrollToDeepDive();
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
          this.scrollToDeepDive();
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
          this.scrollToDeepDive();
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
