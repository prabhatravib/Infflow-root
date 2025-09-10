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
    // Nodes - exclude the central node (first node) from selection
    const nodes = svg.querySelectorAll('g.node, .node');
    nodes.forEach((node, index) => {
      // Skip the central node (index 0) as it has the search bar overlay
      if (index === 0) {
        console.log('🚫 Skipping central node from selection to preserve search bar');
        return;
      }
      
      (node as HTMLElement).style.cursor = 'pointer';
      node.addEventListener('click', (e) => {
        e.stopPropagation();
        const text = this.extractNodeText(node);
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
        const text = this.extractEdgeText(label);
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
        const text = this.extractNoteText(note);
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
            const fullText = this.extractNoteText(note);
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
          const fullBulletContent = this.extractBulletPointContent(tspan, svg);
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
          const fullBulletContent = this.extractBulletPointContent(text, svg);
          this.selectElement(text, fullBulletContent);
          this.scrollToDeepDive();
        });
      }
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


  private cleanTextContent(text: string): string {
    return text
      .replace(/<br\s*\/?>/gi, ' ')  // Replace <br> tags with spaces
      .replace(/\n/g, ' ')           // Replace newlines with spaces
      .replace(/[\r\t]/g, ' ')       // Replace carriage returns and tabs with spaces
      .replace(/\s+/g, ' ')          // Replace multiple whitespace with single space
      .replace(/\s*([.,;:!?])\s*/g, '$1 ')  // Fix spacing around punctuation
      .replace(/\s+/g, ' ')          // Clean up any new multiple spaces
      .trim();
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
    // Look for the text element (Mermaid uses .nodeLabel spans)
    const textElement = node.querySelector('text, .nodeLabel, span');
    
    if (textElement) {
      // Get innerHTML to preserve <br> tags, then replace them with spaces
      const htmlContent = textElement.innerHTML || '';
      const rawText = htmlContent.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '');
      return this.cleanTextContent(rawText);
    }
    
    return '';
  }

  private extractEdgeText(label: Element): string {
    const text = label.querySelector('text, span');
    const extracted = text ? (text.textContent || '') : (label.textContent || '');
    return this.cleanTextContent(extracted);
  }

  private extractNoteText(note: Element): string {
    const texts = note.querySelectorAll('text');
    const text = Array.from(texts)
      .map(t => t.textContent || '')
      .filter(Boolean)
      .join(' ');
    return this.cleanTextContent(text);
  }

  private extractBlockText(rect: Element, svg: SVGElement): string {
    const bbox = (rect as SVGRectElement).getBBox();
    
    // Find the main text element that contains the node text
    const textElements = Array.from(svg.querySelectorAll('text')).filter(text => {
      const textBox = (text as SVGTextElement).getBBox();
      return (
        textBox.x >= bbox.x - 5 &&
        textBox.x + textBox.width <= bbox.x + bbox.width + 5 &&
        textBox.y >= bbox.y - 5 &&
        textBox.y + textBox.height <= bbox.y + bbox.height + 5
      );
    });
    
    if (textElements.length === 0) {
      return '';
    }
    
    // If there's only one text element, get its full content
    if (textElements.length === 1) {
      const textElement = textElements[0];
      // Get the full text content including all child tspan elements
      const fullText = textElement.textContent || '';
      return this.cleanTextContent(fullText);
    }
    
    // If there are multiple text elements, try to find the parent text element
    // that contains all the text for this node
    const parentText = textElements.find(text => {
      // Look for a text element that contains other text elements as children
      return text.querySelector('tspan') !== null;
    });
    
    if (parentText) {
      // Get the full text content from the parent element
      const fullText = parentText.textContent || '';
      return this.cleanTextContent(fullText);
    }
    
    // Fallback: sort and join the text elements
    const sortedTexts = textElements.sort((a, b) => {
      const aBox = (a as SVGTextElement).getBBox();
      const bBox = (b as SVGTextElement).getBBox();
      
      // First sort by Y position (top to bottom)
      if (Math.abs(aBox.y - bBox.y) > 5) {
        return aBox.y - bBox.y;
      }
      // Then sort by X position (left to right)
      return aBox.x - bBox.x;
    });
    
    const text = sortedTexts
      .map(t => t.textContent || '')
      .filter(Boolean)
      .join(' ');
    
    return this.cleanTextContent(text);
  }

  private extractBulletPointContent(clickedElement: Element, _svg: SVGElement): string {
    const clickedText = clickedElement.textContent?.trim();
    
    // Check if this is a numbered bullet point
    const bulletMatch = clickedText?.match(/^(\d+[\.\)])\s*(.*)/);
    if (!bulletMatch) {
      return clickedText || ''; // Not a numbered bullet, return as is
    }
    
    const bulletNumber = bulletMatch[1]; // e.g., "1." or "1)"
    
    // Find all text elements in the same note/container
    const container = clickedElement.closest('.note, g.note, .actor, g.actor');
    if (!container) {
      return clickedText || '';
    }
    
    const allTexts = Array.from(container.querySelectorAll('text, tspan'));
    let bulletContent: string[] = [];
    let foundBullet = false;
    
    for (let i = 0; i < allTexts.length; i++) {
      const text = allTexts[i].textContent?.trim();
      
      // Check if this is the start of our bullet point
      if (text?.startsWith(bulletNumber)) {
        foundBullet = true;
        bulletContent.push(text);
        continue;
      }
      
      // If we found our bullet, collect subsequent lines until next numbered bullet
      if (foundBullet) {
        // Check if this is the start of the next numbered bullet
        const nextBulletMatch = text?.match(/^\d+[\.\)]\s/);
        if (nextBulletMatch) {
          break; // Stop at next bullet point
        }
        
        // Add this line to our bullet content
        if (text) {
          bulletContent.push(text);
        }
      }
    }
    
    const text = bulletContent.join(' ');
    return this.cleanTextContent(text);
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
