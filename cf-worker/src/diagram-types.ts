/**
 * Diagram types and type selection logic.
 * Handles diagram type definitions and selection based on user queries.
 */

import { callOpenAI, callOpenAIOptimized, selectOptimalModel, EnvLike } from './openai';
import { createTimer } from './timing';

export type DiagramType = "flowchart" | "radial_mindmap" | "sequence_comparison";

export interface DiagramResult {
  diagram_type: DiagramType;
  description: string;
  content: string;
  universal_content: string;
  diagram: string;
  render_type: "html";
  rendered_content: string;
  diagram_meta?: any;
}

export async function selectDiagramType(query: string, env: EnvLike): Promise<DiagramType> {
  const timer = createTimer();
  const selectorPrompt = `You are a diagram-type selector.

As a response to the below query, choose which output representation would be best suited:
- flowchart        : sequential steps, how-to, decision logic
- radial_mindmap   : concept overviews, definitions, characteristics
- sequence_comparison: comparing two or more items, highlighting similarities and unique features

Respond with ONLY one word: "flowchart", "radial_mindmap", or "sequence_comparison".`;

  try {
    // Select optimal model for diagram type selection (usually simple, so use mini)
    const optimalModel = selectOptimalModel(query, env);
    console.log(`🎯 [${timer.getRequestId()}] Selected model for diagram type selection: ${optimalModel}`);

    // Optimized token limit - reduced from 50 to 20 for faster processing
    const optimizedMaxTokens = 20;

    const response = await timer.timeStep("optimized_diagram_type_llm_call", () => callOpenAIOptimized(
      env,
      selectorPrompt,
      query,
      optimalModel,
      optimizedMaxTokens,
      0.3,
        {
          usePriority: true,        // Faster queue processing
          useCache: true,          // Cache reusable prompts
          useStructured: false     // Simple text response
        }
    ), {
      query_length: query.length,
      model: optimalModel,
      max_tokens: optimizedMaxTokens,
      optimizations: "priority,cache,early_stop"
    });

    const validTypes = ["flowchart", "radial_mindmap", "sequence_comparison"];
    const responseClean = response.trim().toLowerCase();

    if (validTypes.includes(responseClean)) {
      console.log(`✅ [${timer.getRequestId()}] Selected diagram type: ${responseClean}`);
      return responseClean as DiagramType;
    }

    // Default to radial_mindmap for general queries
    console.log(`⚠️ [${timer.getRequestId()}] Invalid response, defaulting to radial_mindmap. Response: ${responseClean}`);
    return "radial_mindmap";

  } catch (error) {
    console.error(`❌ [${timer.getRequestId()}] Error selecting diagram type:`, error);
    return "radial_mindmap";
  }
}
