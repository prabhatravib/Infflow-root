/**
 * Content generation and response parsing functions for Cloudflare Workers.
 * Handles combined content generation, unified diagram results, and response parsing.
 */

import { callOpenAI, callOpenAIOptimized, selectOptimalModel, EnvLike } from './openai';
import { getCombinedContentPrompt, getMegaPrompt } from './prompts';
import { createTimer } from './timing';
import { DiagramType } from './diagram-types';

export interface UnifiedDiagramResult {
  diagram_type: DiagramType;
  universal_content: string;
  diagram_content: string;
  mermaid_code: string;
  diagram_meta?: any;
}

export async function generateCombinedContent(
  query: string,
  diagramType: string,
  env: EnvLike
): Promise<{ universalContent: string; diagramContent: string }> {
  const timer = createTimer();
  const combinedPrompt = getCombinedContentPrompt(diagramType);
  
  console.log(`🔵 [${timer.getRequestId()}] Starting combined content generation...`);
  console.log(`Query: ${query}`);
  console.log(`Diagram type: ${diagramType}`);
  console.log(`Using model: ${env.OPENAI_MODEL || "gpt-4.1"}`);
  
  try {
    console.log(`🔵 [${timer.getRequestId()}] Calling OpenAI for combined content generation...`);
    const response = await timer.timeStep("combined_content_llm_call", () => callOpenAI(
      env,
      combinedPrompt,
      query,
      env.OPENAI_MODEL || "gpt-4.1",
      3000,
      0.7
    ), {
      query_length: query.length,
      diagram_type: diagramType,
      model: env.OPENAI_MODEL || "gpt-4.1",
      max_tokens: 3000
    });
    
    console.log(`✅ [${timer.getRequestId()}] OpenAI combined content response received:`);
    console.log(`Response length: ${response?.length || 0}`);
    console.log(`Response preview: ${response?.substring(0, 200)}...`);
    
    if (!response) {
      throw new Error("Empty combined content response from LLM");
    }
    
    // Parse the combined response
    const { universalContent, diagramContent } = await timer.timeStep("response_parsing", async () => {
      return parseCombinedResponse(response);
    }, {
      response_length: response.length
    });
    
    console.log(`✅ [${timer.getRequestId()}] Combined content generation successful`);
    console.log(`Universal content length: ${universalContent.length}`);
    console.log(`Diagram content length: ${diagramContent.length}`);
    
    // Log performance for this function
    timer.logPerformanceReport();
    
    return { universalContent, diagramContent };
    
  } catch (error) {
    console.error(`❌ [${timer.getRequestId()}] Combined content generation failed:`, error);
    timer.logPerformanceReport();
    throw error;
  }
}

export function parseCombinedResponse(response: string): { universalContent: string; diagramContent: string } {
  try {
    // Try to find JSON in the response (it might be wrapped in markdown code blocks)
    let jsonString = response.trim();
    
    // Remove markdown code blocks if present
    if (jsonString.startsWith('```json')) {
      jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonString.startsWith('```')) {
      jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    // Try to find JSON object in the response
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonString = jsonMatch[0];
    }
    
    const parsed = JSON.parse(jsonString);
    
    if (!parsed.universal_content || !parsed.diagram_content) {
      throw new Error("Missing required fields in JSON response");
    }
    
    return {
      universalContent: parsed.universal_content.trim(),
      diagramContent: parsed.diagram_content.trim()
    };
    
  } catch (error) {
    console.warn("⚠️ Could not parse JSON response, using fallback parsing:", error);
    console.warn("⚠️ Raw response:", response.substring(0, 500) + "...");
    
    // Better fallback: try to extract content based on structure
    // Look for the universal content (comprehensive text) vs diagram content (structured format)
    const lines = response.split('\n');
    const universalLines: string[] = [];
    const diagramLines: string[] = [];
    let inUniversalSection = false;
    let inDiagramSection = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Detect universal content (comprehensive paragraphs, not structured)
      if (trimmed.length > 50 && !trimmed.startsWith('Main topic:') && !trimmed.startsWith('- ') && !trimmed.match(/^\d+\./)) {
        if (!inDiagramSection) {
          universalLines.push(line);
          inUniversalSection = true;
        }
      }
      // Detect diagram content (structured format)
      else if (trimmed.startsWith('Main topic:') || trimmed.startsWith('- ') || trimmed.match(/^\d+\./)) {
        diagramLines.push(line);
        inDiagramSection = true;
        inUniversalSection = false;
      }
      // Continue adding to current section
      else if (inUniversalSection && trimmed.length > 0) {
        universalLines.push(line);
      }
      else if (inDiagramSection && trimmed.length > 0) {
        diagramLines.push(line);
      }
    }
    
    const universalContent = universalLines.join('\n').trim();
    const diagramContent = diagramLines.join('\n').trim();
    
    // If we couldn't separate properly, use the original fallback
    if (!universalContent || !diagramContent) {
      const midPoint = Math.floor(response.length / 2);
      return {
        universalContent: response.substring(0, midPoint).trim(),
        diagramContent: response.substring(midPoint).trim()
      };
    }
    
    return {
      universalContent,
      diagramContent
    };
  }
}

export async function generateUnifiedDiagram(
  query: string,
  env: EnvLike
): Promise<UnifiedDiagramResult> {
  const timer = createTimer();
  const megaPrompt = getMegaPrompt();

  console.log(`🚀 [${timer.getRequestId()}] Starting OPTIMIZED UNIFIED diagram generation...`);
  console.log(`Query: ${query}`);

  try {
    // Select optimal model for this query
    const optimalModel = selectOptimalModel(query, env);
    console.log(`🎯 [${timer.getRequestId()}] Selected model: ${optimalModel}`);

    // Optimized token limit - reduced from 5000 to 2000 for faster processing
    const optimizedMaxTokens = 2000;

    // Use optimized OpenAI call with all performance enhancements
    const response = await timer.timeStep("optimized_unified_llm_call", () =>
      callOpenAIOptimized(
        env,
        megaPrompt,
        query,
        optimalModel,
        optimizedMaxTokens,
        0.7,
        {
          usePriority: true,        // Faster queue processing
          useCache: true,          // Cache reusable prompts
          useStructured: true      // Ensure JSON response
        }
      ), {
      query_length: query.length,
      model: optimalModel,
      max_tokens: optimizedMaxTokens,
      optimizations: "priority,cache,structured,early_stop"
    });

    console.log(`✅ [${timer.getRequestId()}] Optimized unified response received, length: ${response?.length || 0}`);

    if (!response) {
      throw new Error("Empty unified response from LLM");
    }

    // Parse the JSON response
    const result = await timer.timeStep("parse_unified_response", async () => {
      return parseUnifiedResponse(response);
    }, {
      response_length: response.length
    });

    console.log(`✅ [${timer.getRequestId()}] Optimized unified generation successful`);
    console.log(`📊 [${timer.getRequestId()}] Results:`, {
      diagram_type: result.diagram_type,
      universal_content_length: result.universal_content.length,
      diagram_content_length: result.diagram_content.length,
      mermaid_code_length: result.mermaid_code.length,
      has_meta: !!result.diagram_meta,
      model_used: optimalModel
    });

    timer.logPerformanceReport();
    return result;

  } catch (error) {
    console.error(`❌ [${timer.getRequestId()}] Optimized unified generation failed:`, error);
    timer.logPerformanceReport();
    throw error;
  }
}

export function parseUnifiedResponse(response: string): UnifiedDiagramResult {
  try {
    // Clean up response if wrapped in markdown
    let jsonString = response.trim();
    if (jsonString.startsWith("```json")) {
      jsonString = jsonString.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (jsonString.startsWith("```")) {
      jsonString = jsonString.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }
    
    // Try to extract JSON object
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonString = jsonMatch[0];
    }
    
    const parsed = JSON.parse(jsonString);
    
    // Validate required fields
    if (!parsed.diagram_type || !parsed.universal_content || 
        !parsed.diagram_content || !parsed.mermaid_code) {
      throw new Error("Missing required fields in unified response");
    }
    
    // Validate diagram type
    const validTypes = ["flowchart", "radial_mindmap", "sequence_comparison"];
    if (!validTypes.includes(parsed.diagram_type)) {
      console.warn(`Invalid diagram type: ${parsed.diagram_type}, defaulting to radial_mindmap`);
      parsed.diagram_type = "radial_mindmap";
    }
    
    return {
      diagram_type: parsed.diagram_type as DiagramType,
      universal_content: parsed.universal_content.trim(),
      diagram_content: parsed.diagram_content.trim(),
      mermaid_code: parsed.mermaid_code.trim(),
      diagram_meta: parsed.diagram_meta || null
    };
    
  } catch (error) {
    console.error("Failed to parse unified response:", error);
    console.error("Raw response:", response.substring(0, 500));
    throw new Error(`Failed to parse unified LLM response: ${error}`);
  }
}
