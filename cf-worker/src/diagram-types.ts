/**
 * Diagram types and type selection logic.
 * Handles diagram type definitions and selection based on user queries.
 */

import { callOpenAI, EnvLike } from './openai';
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
    const response = await timer.timeStep("diagram_type_llm_call", () => callOpenAI(
      env,
      selectorPrompt,
      query,
      env.OPENAI_MODEL || "gpt-4o-mini",
      50,
      0.3
    ), {
      query_length: query.length,
      model: env.OPENAI_MODEL || "gpt-4o-mini",
      max_tokens: 50
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
