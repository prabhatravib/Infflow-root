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
  
  console.log("🟡 Starting diagram generation...");
  console.log("Diagram type:", diagramType);
  console.log("Content description:", contentDescription.substring(0, 200) + "...");
  console.log("Original query:", originalQuery);
  
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
  
  console.log("🟡 User message for diagram generation:", userMessage.substring(0, 300) + "...");
  
  try {
    console.log("🟡 Calling OpenAI for diagram generation...");
    const response = await callOpenAI(
      env,
      diagramPrompt,
      userMessage,
      env.OPENAI_MODEL || "gpt-4o-mini",
      2000,
      0.7
    );
    
    console.log("✅ OpenAI diagram response received:");
    console.log("Response length:", response?.length || 0);
    console.log("Response preview:", response?.substring(0, 300) + "...");
    
    if (!response) {
      throw new Error("Empty diagram response from LLM");
    }
    
    console.log("✅ Diagram generation successful");
    return response;
    
  } catch (error) {
    console.error("❌ Diagram generation failed:", error);
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
  console.log("🚀 Starting diagram pipeline for query:", query);
  
  try {
    // Step 1: Select diagram type
    console.log("🔵 Step 1: Selecting diagram type...");
    const diagramType = await selectDiagramType(query, env);
    console.log(`✅ Selected diagram type: ${diagramType}`);
    
    // Step 2: Generate content
    console.log("🔵 Step 2: Generating content...");
    const contentResult = await generateContent(query, diagramType, env);
    console.log(`✅ Generated content: ${contentResult.content.substring(0, 100)}...`);
    
    // Step 3: Generate diagram code
    console.log("🔵 Step 3: Generating diagram code...");
    const diagramCode = await generateDiagramCode(
      contentResult.content,
      query,
      diagramType,
      env
    );
    console.log(`✅ Generated diagram code: ${diagramCode.substring(0, 100)}...`);
    
    // Step 4: Sanitize diagram (handled in utils.ts)
    console.log("🔵 Step 4: Preparing final result...");
    const sanitizedDiagram = diagramCode; // Will be sanitized in handlers
    
    const result = {
      diagram_type: diagramType,
      description: contentResult.content,
      content: contentResult.content,
      diagram: sanitizedDiagram,
      render_type: "html",
      rendered_content: sanitizedDiagram
    };
    
    console.log("🎉 Pipeline completed successfully!");
    console.log("Final result:", JSON.stringify({
      diagram_type: result.diagram_type,
      description_length: result.description.length,
      diagram_length: result.diagram.length,
      render_type: result.render_type
    }, null, 2));
    
    return result;
    
  } catch (error) {
    console.error("❌ Diagram pipeline failed:", error);
    console.error("Pipeline error stack:", error instanceof Error ? error.stack : 'No stack trace');
    console.error("Pipeline error details:", JSON.stringify(error, null, 2));
    throw error;
  }
}
