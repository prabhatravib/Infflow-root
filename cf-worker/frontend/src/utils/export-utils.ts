/**
 * Export utilities for saving diagrams as text and PNG
 * Based on pitext_desktop implementation
 */

export interface ExportOptions {
  scale?: number;
  backgroundColor?: string;
  quality?: number;
}

/**
 * Extract text content from rendered SVG nodes
 */
function extractTextFromSVG(svg: SVGElement): string {
  const textElements: string[] = [];
  
  // Extract text from node labels
  const nodeTexts = svg.querySelectorAll('.node text, .node .label, .nodeLabel');
  nodeTexts.forEach(textEl => {
    const text = textEl.textContent?.trim();
    if (text && !textElements.includes(text)) {
      textElements.push(text);
    }
  });
  
  // Extract text from sequence diagram participants
  const participants = svg.querySelectorAll('.actor text, .participant text');
  participants.forEach(textEl => {
    const text = textEl.textContent?.trim();
    if (text && !textElements.includes(text)) {
      textElements.push(text);
    }
  });
  
  // Extract text from notes and labels
  const notes = svg.querySelectorAll('.note text, .noteLabel text, .edgeLabel text');
  notes.forEach(textEl => {
    const text = textEl.textContent?.trim();
    if (text && !textElements.includes(text)) {
      textElements.push(text);
    }
  });
  
  return textElements.join('\n');
}

/**
 * Export diagram content as text file
 */
export async function exportDiagramAsText(
  svg: SVGElement,
  query: string,
  filename?: string
): Promise<void> {
  if (!svg) {
    throw new Error('No diagram available to save');
  }

  const extractedText = extractTextFromSVG(svg);
  
  if (!extractedText.trim()) {
    throw new Error('No text content found in diagram');
  }

  const contentLines = [];
  contentLines.push(`Query: "${query}"`);
  contentLines.push(`Generated: ${new Date().toLocaleString()}`);
  contentLines.push('');
  contentLines.push('--- Diagram Text ---');
  contentLines.push('');
  contentLines.push(extractedText);

  const fileContent = contentLines.join('\n');
  const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
  
  const finalFilename = filename || getFilename('txt');
  downloadBlob(blob, finalFilename);
}

/**
 * Export SVG as PNG
 */
export async function exportDiagramAsPNG(
  svg: SVGElement,
  options: ExportOptions = {}
): Promise<void> {
  const {
    scale = 4,
    backgroundColor = 'white',
    quality = 0.95
  } = options;

  try {
    const blob = await svgToBlob(svg, scale, backgroundColor, quality);
    const filename = getFilename('png');
    downloadBlob(blob, filename);
  } catch (error) {
    console.error('PNG export failed:', error);
    throw new Error('Failed to export PNG');
  }
}

/**
 * Convert SVG to blob for download
 */
async function svgToBlob(
  svg: SVGElement,
  scale: number,
  backgroundColor: string,
  quality: number
): Promise<Blob> {
  const clone = svg.cloneNode(true) as SVGElement;
  const viewBox = (clone.getAttribute('viewBox') || '').split(' ').map(Number);
  let width, height;

  if (viewBox.length === 4) {
    [, , width, height] = viewBox;
  } else {
    const bbox = (svg as any).getBBox();
    width = bbox.width;
    height = bbox.height;
    clone.setAttribute('viewBox', `0 0 ${width} ${height}`);
  }

  clone.setAttribute('width', (width * scale).toString());
  clone.setAttribute('height', (height * scale).toString());
  
  // Add background rectangle
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('width', '100%');
  rect.setAttribute('height', '100%');
  rect.setAttribute('fill', backgroundColor);
  clone.insertBefore(rect, clone.firstChild);
  
  const svgString = new XMLSerializer().serializeToString(clone);
  
  // Convert to base64 data URL to prevent canvas tainting
  const url = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(blob => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      }, 'image/png', quality);
    };
    img.onerror = () => {
      reject(new Error('Failed to load SVG into image element'));
    };
    img.src = url;
  });
}

/**
 * Download blob as file
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 250);
}

/**
 * Generate filename with timestamp
 */
function getFilename(extension: string): string {
  const date = new Date();
  const timestamp = date.toISOString().replace(/[:.]/g, '-').slice(0, -5);
  return `infflow-diagram-${timestamp}.${extension}`;
}
