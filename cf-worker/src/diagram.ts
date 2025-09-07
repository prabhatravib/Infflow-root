/**
 * Diagram generation logic adapted from pitext_desktop for Cloudflare Workers.
 * Handles diagram type selection, content generation, and diagram creation.
 */

import { callOpenAI, EnvLike } from './openai';
import { getDiagramPrompt, getDeepDivePrompt } from './prompts';
import { generateContent, ContentResult } from './content';

export type DiagramType = "flowchart" | "radial_mindmap" | "sequence_comparison";

export interface DiagramResult {
  diagram_type: DiagramType;
  description: string;
  content: string;
  diagram: string;
  render_type: "html";
  rendered_content: string;
}

export async function selectDiagramType(query: string, env: EnvLike): Promise<DiagramType> {
  const selectorPrompt = `You are a diagram-type selector.

As a response to the below query, choose which output representation would be best suited:
- flowchart        : sequential steps, how-to, decision logic
- radial_mindmap   : concept overviews, definitions, characteristics
- sequence_comparison: comparing two or more items, highlighting similarities and unique features

Respond with ONLY one word: "flowchart", "radial_mindmap", or "sequence_comparison".`;
  
  try {
    const response = await callOpenAI(
      env,
      selectorPrompt,
      query,
      env.OPENAI_MODEL || "gpt-4o-mini",
      50,
      0.3
    );
    
    const validTypes = ["flowchart", "radial_mindmap", "sequence_comparison"];
    const responseClean = response.trim().toLowerCase();
    
    if (validTypes.includes(responseClean)) {
      return responseClean as DiagramType;
    }
    
    // Default to radial_mindmap for general queries
    return "radial_mindmap";
    
  } catch (error) {
    console.error("Error selecting diagram type:", error);
    return "radial_mindmap";
  }
}

export async function generateDiagramCode(
  contentDescription: string,
  originalQuery: string,
  diagramType: DiagramType,
  env: EnvLike
): Promise<string> {
  const diagramPrompt = getDiagramPrompt(diagramType);
  
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
  
  try {
    const response = await callOpenAI(
      env,
      diagramPrompt,
      userMessage,
      env.OPENAI_MODEL || "gpt-4o-mini",
      2000,
      0.7
    );
    
    if (!response) {
      throw new Error("Empty diagram response from LLM");
    }
    
    return response;
    
  } catch (error) {
    console.error("Diagram generation failed:", error);
    throw error;
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
  try {
    // Step 1: Select diagram type
    const diagramType = await selectDiagramType(query, env);
    console.log(`Selected diagram type: ${diagramType}`);
    
    // Step 2: Generate content
    const contentResult = await generateContent(query, diagramType, env);
    console.log(`Generated content: ${contentResult.content.substring(0, 100)}...`);
    
    // Step 3: Generate diagram code
    const diagramCode = await generateDiagramCode(
      contentResult.content,
      query,
      diagramType,
      env
    );
    console.log(`Generated diagram code: ${diagramCode.substring(0, 100)}...`);
    
    // Step 4: Sanitize diagram (handled in utils.ts)
    const sanitizedDiagram = diagramCode; // Will be sanitized in handlers
    
    return {
      diagram_type: diagramType,
      description: contentResult.content,
      content: contentResult.content,
      diagram: sanitizedDiagram,
      render_type: "html",
      rendered_content: sanitizedDiagram
    };
    
  } catch (error) {
    console.error("Diagram pipeline failed:", error);
    throw error;
  }
}
