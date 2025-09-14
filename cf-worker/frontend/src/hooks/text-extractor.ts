// Utility for extracting text content from different SVG elements
export class TextExtractor {
  static cleanTextContent(text: string): string {
    return text
      .replace(/<br\s*\/?>/gi, ' ')  // Replace <br> tags with spaces
      .replace(/\n/g, ' ')           // Replace newlines with spaces
      .replace(/[\r\t]/g, ' ')       // Replace carriage returns and tabs with spaces
      .replace(/\s+/g, ' ')          // Replace multiple whitespace with single space
      .replace(/\s*([.,;:!?])\s*/g, '$1 ')  // Fix spacing around punctuation
      .replace(/\s+/g, ' ')          // Clean up any new multiple spaces
      .trim();
  }

  static extractNodeText(node: Element): string {
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

  static extractEdgeText(label: Element): string {
    const text = label.querySelector('text, span');
    const extracted = text ? (text.textContent || '') : (label.textContent || '');
    return this.cleanTextContent(extracted);
  }

  static extractNoteText(note: Element): string {
    const texts = note.querySelectorAll('text');
    const text = Array.from(texts)
      .map(t => t.textContent || '')
      .filter(Boolean)
      .join(' ');
    return this.cleanTextContent(text);
  }

  static extractBlockText(rect: Element, svg: SVGElement): string {
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

  static extractBulletPointContent(clickedElement: Element, _svg: SVGElement): string {
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

  static isSelectableRect(rect: Element): boolean {
    const fill = rect.getAttribute('fill');
    
    if (!fill || ['#fff', '#ffffff', 'white', 'none', 'transparent'].includes(fill.toLowerCase())) {
      return false;
    }
    
    const width = parseFloat(rect.getAttribute('width') || '0');
    const height = parseFloat(rect.getAttribute('height') || '0');
    
    return width > 100 && height > 40;
  }
}
