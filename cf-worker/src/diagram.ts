/**
 * Diagram generation logic adapted from pitext_desktop for Cloudflare Workers.
 * Handles diagram type selection, content generation, and diagram creation.
 */

import { callOpenAI, EnvLike } from './openai';
import { getDiagramPrompt, getDeepDivePrompt, getCombinedContentPrompt } from './prompts';
import { generateContent, ContentResult } from './content';
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

export async function generateDiagramCode(
  contentDescription: string,
  originalQuery: string,
  diagramType: DiagramType,
  env: EnvLike
): Promise<string> {
  const timer = createTimer();
  const diagramPrompt = getDiagramPrompt(diagramType);
  
  console.log(`🟡 [${timer.getRequestId()}] Starting diagram generation...`);
  console.log(`Diagram type: ${diagramType}`);
  console.log(`Content description: ${contentDescription.substring(0, 200)}...`);
  console.log(`Original query: ${originalQuery}`);
  
  // Build user message based on diagram type
  let userMessage: string;
  
  if (diagramType === "flowchart") {
    userMessage = `Create a Mermaid flowchart that answers this query:

${originalQuery}

Content details:
${contentDescription}`;
  } else if (diagramType === "sequence_comparison") {
    userMessage = `Create a Mermaid sequence diagram for this comparison query:

${originalQuery}

Content details:
${contentDescription}`;
  } else { // radial_mindmap
    userMessage = `Create a radial Mermaid mind-map from this content:
${contentDescription}`;
  }
  
  console.log(`🟡 [${timer.getRequestId()}] User message for diagram generation: ${userMessage.substring(0, 300)}...`);
  
  try {
    console.log(`🟡 [${timer.getRequestId()}] Calling OpenAI for diagram generation...`);
    const response = await timer.timeStep("diagram_generation_llm_call", () => callOpenAI(
      env,
      diagramPrompt,
      userMessage,
      env.OPENAI_MODEL || "gpt-4o-mini",
      2000,
      0.7
    ), {
      diagram_type: diagramType,
      content_length: contentDescription.length,
      query_length: originalQuery.length,
      model: env.OPENAI_MODEL || "gpt-4o-mini",
      max_tokens: 2000
    });
    
    console.log(`✅ [${timer.getRequestId()}] OpenAI diagram response received:`);
    console.log(`Response length: ${response?.length || 0}`);
    console.log(`Response preview: ${response?.substring(0, 300)}...`);
    
    if (!response) {
      throw new Error("Empty diagram response from LLM");
    }
    
    console.log(`✅ [${timer.getRequestId()}] Diagram generation successful`);
    
    // Log performance for this function
    timer.logPerformanceReport();
    
    return response;
    
  } catch (error) {
    console.error(`❌ [${timer.getRequestId()}] Diagram generation failed:`, error);
    timer.logPerformanceReport();
    throw error;
  }
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

function parseCombinedResponse(response: string): { universalContent: string; diagramContent: string } {
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
    // Fallback: split response roughly in half
    const midPoint = Math.floor(response.length / 2);
    return {
      universalContent: response.substring(0, midPoint).trim(),
      diagramContent: response.substring(midPoint).trim()
    };
  }
}

export async function generateDeepDiveResponse(
  selectedText: string,
  question: string,
  originalQuery: string,
  env: EnvLike
): Promise<string> {
  const deepDivePrompt = getDeepDivePrompt();
  
  const userMessage = `Selected text from diagram: "${selectedText}"

User's question: ${question}

Original query that generated the diagram: ${originalQuery}`;
  
  try {
    const response = await callOpenAI(
      env,
      deepDivePrompt,
      userMessage,
      env.OPENAI_MODEL || "gpt-4o-mini",
      500,
      0.7
    );
    
    if (!response) {
      throw new Error("Empty deep dive response from LLM");
    }
    
    return response.trim();
    
  } catch (error) {
    console.error("Deep dive generation failed:", error);
    throw error;
  }
}

export async function processDiagramPipeline(
  query: string,
  env: EnvLike
): Promise<DiagramResult> {
  const timer = createTimer();
  console.log(`🚀 [${timer.getRequestId()}] Starting diagram pipeline for query:`, query);
  
  try {
    // Step 1: Select diagram type
    const diagramType = await timer.timeStep("diagram_type_selection", () => selectDiagramType(query, env), {
      query_length: query.length
    });
    console.log(`✅ [${timer.getRequestId()}] Selected diagram type: ${diagramType}`);
    
    // Step 2: Generate both universal content and diagram-specific content in one call
    const { universalContent, diagramContent } = await timer.timeStep("combined_content_generation", () => 
      generateCombinedContent(query, diagramType, env), {
      query_length: query.length,
      diagram_type: diagramType
    });
    console.log(`✅ [${timer.getRequestId()}] Generated universal content: ${universalContent.substring(0, 100)}...`);
    console.log(`✅ [${timer.getRequestId()}] Generated diagram content: ${diagramContent.substring(0, 100)}...`);
    
    // Create a ContentResult object for compatibility
    const contentResult: ContentResult = {
      content: diagramContent,
      parsed: {
        topic: '',
        facts: []
      }
    };
    
    // Step 3: Generate diagram code
    const diagramCode = await timer.timeStep("diagram_code_generation", () => 
      generateDiagramCode(contentResult.content, query, diagramType, env), {
      content_length: contentResult.content.length,
      diagram_type: diagramType
    });
    console.log(`✅ [${timer.getRequestId()}] Generated diagram code: ${diagramCode.substring(0, 100)}...`);
    
    // Step 4: Prepare final result
    const result = await timer.timeStep("result_preparation", async () => {
      const sanitizedDiagram = diagramCode; // Will be sanitized in handlers
      
      const result: DiagramResult = {
        diagram_type: diagramType,
        description: diagramContent,
        content: diagramContent,
        universal_content: universalContent,
        diagram: sanitizedDiagram,
        render_type: "html" as const,
        rendered_content: sanitizedDiagram
      };
      
      return result;
    }, {
      diagram_length: diagramCode.length,
      universal_content_length: universalContent.length
    });
    
    console.log(`🎉 [${timer.getRequestId()}] Pipeline completed successfully!`);
    console.log(`📊 [${timer.getRequestId()}] Final result:`, JSON.stringify({
      diagram_type: result.diagram_type,
      description_length: result.description.length,
      universal_content_length: result.universal_content.length,
      diagram_length: result.diagram.length,
      render_type: result.render_type
    }, null, 2));
    
    // Log pipeline performance
    timer.logPerformanceReport();
    
    return result;
    
  } catch (error) {
    console.error(`❌ [${timer.getRequestId()}] Diagram pipeline failed:`, error);
    console.error("Pipeline error stack:", error instanceof Error ? error.stack : 'No stack trace');
    console.error("Pipeline error details:", JSON.stringify(error, null, 2));
    
    // Log performance even for errors
    timer.logPerformanceReport();
    
    throw error;
  }
}
