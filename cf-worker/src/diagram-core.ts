/**
 * Core diagram generation functions for Cloudflare Workers.
 * Handles individual diagram code generation and deep dive responses.
 */

import { callOpenAI, callOpenAIOptimized, selectOptimalModel, EnvLike } from './openai';
import { getDiagramPrompt, getDeepDivePrompt } from './prompts';
import { createTimer } from './timing';
import { DiagramType } from './diagram-types';

export async function generateDiagramCode(
  contentDescription: string,
  originalQuery: string,
  diagramType: DiagramType,
  env: EnvLike
): Promise<string> {
  const timer = createTimer();
  const diagramPrompt = getDiagramPrompt(diagramType);

  console.log(`🟡 [${timer.getRequestId()}] Starting OPTIMIZED diagram generation...`);
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
${contentDescription}

IMPORTANT: The central node A must contain exactly this text: "${originalQuery}"
Use the format: A("${originalQuery}")

Make sure the central node A is visible and contains the exact query text.`;
  }

  console.log(`🟡 [${timer.getRequestId()}] User message for diagram generation: ${userMessage.substring(0, 300)}...`);

  try {
    // Select optimal model for this specific diagram generation task
    const optimalModel = selectOptimalModel(originalQuery, env);
    console.log(`🎯 [${timer.getRequestId()}] Selected model for diagram: ${optimalModel}`);

    // Optimized token limit - reduced from 2000 to 1200 for faster processing
    const optimizedMaxTokens = 1200;

    console.log(`🟡 [${timer.getRequestId}] Calling OpenAI with optimizations for diagram generation...`);
    const response = await timer.timeStep("optimized_diagram_llm_call", () => callOpenAIOptimized(
      env,
      diagramPrompt,
      userMessage,
      optimalModel,
      optimizedMaxTokens,
      0.7,
        {
          usePriority: true,        // Faster queue processing
          useCache: true,          // Cache reusable prompts
          useStructured: false     // Text response, not JSON
        }
    ), {
      diagram_type: diagramType,
      content_length: contentDescription.length,
      query_length: originalQuery.length,
      model: optimalModel,
      max_tokens: optimizedMaxTokens,
      optimizations: "priority,cache,early_stop"
    });

    console.log(`✅ [${timer.getRequestId()}] Optimized diagram response received:`);
    console.log(`Response length: ${response?.length || 0}`);
    console.log(`Response preview: ${response?.substring(0, 300)}...`);

    if (!response) {
      throw new Error("Empty diagram response from LLM");
    }

    console.log(`✅ [${timer.getRequestId()}] Optimized diagram generation successful`);

    // Log performance for this function
    timer.logPerformanceReport();

    return response;

  } catch (error) {
    console.error(`❌ [${timer.getRequestId()}] Optimized diagram generation failed:`, error);
    timer.logPerformanceReport();
    throw error;
  }
}

export async function generateDeepDiveResponse(
  selectedText: string,
  question: string,
  originalQuery: string,
  env: EnvLike
): Promise<string> {
  const timer = createTimer();
  const deepDivePrompt = getDeepDivePrompt();

  console.log(`🔍 [${timer.getRequestId()}] Starting OPTIMIZED deep dive response generation...`);
  console.log(`Selected text length: ${selectedText.length}`);
  console.log(`Question length: ${question.length}`);
  console.log(`Original query length: ${originalQuery.length}`);

  const userMessage = `Selected text from diagram: "${selectedText}"

User's question: ${question}

Original query that generated the diagram: ${originalQuery}`;

  try {
    // Select optimal model for deep dive (usually simpler, so use mini)
    const optimalModel = selectOptimalModel(question, env);
    console.log(`🎯 [${timer.getRequestId()}] Selected model for deep dive: ${optimalModel}`);

    // Optimized token limit - reduced from 500 to 300 for faster processing
    const optimizedMaxTokens = 300;

    console.log(`🔍 [${timer.getRequestId()}] Calling OpenAI with optimizations for deep dive generation...`);
    const response = await timer.timeStep("optimized_deep_dive_llm_call", () => callOpenAIOptimized(
      env,
      deepDivePrompt,
      userMessage,
      optimalModel,
      optimizedMaxTokens,
      0.7,
        {
          usePriority: true,        // Faster queue processing
          useCache: true,          // Cache reusable prompts
          useStructured: false     // Text response, not JSON
        }
    ), {
      selected_text_length: selectedText.length,
      question_length: question.length,
      original_query_length: originalQuery.length,
      model: optimalModel,
      max_tokens: optimizedMaxTokens,
      optimizations: "priority,cache,early_stop"
    });

    if (!response) {
      throw new Error("Empty deep dive response from LLM");
    }

    console.log(`✅ [${timer.getRequestId()}] Optimized deep dive response generated successfully`);
    console.log(`Response length: ${response.length}`);

    // Log performance for this function
    timer.logPerformanceReport();

    return response.trim();

  } catch (error) {
    console.error(`❌ [${timer.getRequestId()}] Optimized deep dive generation failed:`, error);
    timer.logPerformanceReport();
    throw error;
  }
}
