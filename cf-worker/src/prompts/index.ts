/**
 * Prompt exports for easy importing
 */

import { contentPrompt } from './content_prompt';
import { contentSequencePrompt } from './content_sequence_prompt';
import { diagramRadialPrompt } from './diagram_radial_prompt';
import { diagramFlowchartPrompt } from './diagram_flowchart_prompt';
import { diagramSequencePrompt } from './diagram_sequence_prompt';
import { deepDivePrompt } from './deep_dive_prompt';

// Re-export for external use
export { contentPrompt, contentSequencePrompt, diagramRadialPrompt, diagramFlowchartPrompt, diagramSequencePrompt, deepDivePrompt };

// Convenience functions for getting prompts by type
export function getContentPrompt(diagramType: string): string {
  if (diagramType === "sequence_comparison") {
    return contentSequencePrompt;
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
