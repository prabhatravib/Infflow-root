/**
 * Diagram generation logic for Cloudflare Workers.
 * 
 * This file has been restructured for better maintainability.
 * Individual functions are now organized across specialized modules:
 * 
 * - diagram-generators.ts: Core diagram generation functions
 * - content-generators.ts: Content generation and response parsing
 * - diagram-pipeline.ts: Pipeline orchestration and workflow management
 */

// Re-export functions from the new modular structure
export { 
  generateDiagramCode, 
  generateDeepDiveResponse 
} from './diagram-core';

export { 
  generateCombinedContent,
  generateUnifiedDiagram,
  parseCombinedResponse,
  parseUnifiedResponse,
  UnifiedDiagramResult
} from './content-generators';

export { 
  processDiagramPipeline,
  processDiagramPipelineSequential 
} from './diagram-pipeline';
