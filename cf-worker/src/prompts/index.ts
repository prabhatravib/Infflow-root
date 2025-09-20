/**
 * Prompt exports for easy importing
 */

import { contentPrompt } from './content_prompt';
import { contentSequencePrompt } from './content_sequence_prompt';
import { contentUniversalPrompt } from './content_universal_prompt';
import { diagramRadialPrompt } from './diagram_radial_prompt';
import { diagramFlowchartPrompt } from './diagram_flowchart_prompt';
import { diagramSequencePrompt } from './diagram_sequence_prompt';
import { deepDivePrompt } from './deep_dive_prompt';

// Re-export for external use
export { contentPrompt, contentSequencePrompt, contentUniversalPrompt, diagramRadialPrompt, diagramFlowchartPrompt, diagramSequencePrompt, deepDivePrompt };

// Convenience functions for getting prompts by type
export function getContentPrompt(diagramType: string): string {
  if (diagramType === "sequence_comparison") {
    return contentSequencePrompt;
  }
  if (diagramType === "universal") {
    return contentUniversalPrompt;
  }
  return contentPrompt;
}

export function getDiagramPrompt(diagramType: string): string {
  switch (diagramType) {
    case "flowchart":
      return diagramFlowchartPrompt;
    case "sequence_comparison":
      return diagramSequencePrompt;
    case "radial_mindmap":
    default:
      return diagramRadialPrompt;
  }
}

export function getDeepDivePrompt(): string {
  return deepDivePrompt;
}

export function getUniversalContentPrompt(): string {
  return contentUniversalPrompt;
}

export function getCombinedContentPrompt(diagramType: string): string {
  const universalPrompt = contentUniversalPrompt;
  const diagramPrompt = getContentPrompt(diagramType);
  
  return `${universalPrompt}

---

${diagramPrompt}

IMPORTANT: You must provide your response in the following exact JSON format. Do not include any text before or after the JSON:

{
  "universal_content": "Your comprehensive answer here (200-500 words, well-structured paragraphs, no bullet points or structured format)",
  "diagram_content": "Your structured diagram content here (Main topic: format with bullet points)"
}

The universal_content should be comprehensive, readable text suitable for human reading. The diagram_content should be structured content suitable for diagram generation.`;
}
