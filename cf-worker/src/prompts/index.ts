/**
 * Prompt exports for easy importing
 */

export { contentPrompt } from './content_prompt';
export { contentSequencePrompt } from './content_sequence_prompt';
export { diagramRadialPrompt } from './diagram_radial_prompt';
export { diagramFlowchartPrompt } from './diagram_flowchart_prompt';
export { diagramSequencePrompt } from './diagram_sequence_prompt';
export { deepDivePrompt } from './deep_dive_prompt';

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
