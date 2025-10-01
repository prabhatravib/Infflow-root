/**
 * Content generation logic adapted from pitext_desktop for Cloudflare Workers.
 * Handles generating structured content descriptions from user queries.
 */

import { callOpenAI, callOpenAIOptimized, selectOptimalModel, EnvLike } from './openai';
import { getContentPrompt } from './prompts';
import { cleanTextContent } from './utils';
import { createTimer } from './timing';
import type { DiagramResponse, NodeMeta } from './types';

export interface ContentResult {
  content: string;
  parsed: {
    topic: string;
    facts: string[];
  };
  metadata?: any;
}

export async function generateContent(
  query: string,
  diagramType: string,
  env: EnvLike
): Promise<ContentResult> {
  const timer = createTimer();
  const prompt = getContentPrompt(diagramType);

  console.log(`🔵 [${timer.getRequestId()}] Starting OPTIMIZED content generation...`);
  console.log(`Query: ${query}`);
  console.log(`Diagram type: ${diagramType}`);

  try {
    // Select optimal model for content generation
    const optimalModel = selectOptimalModel(query, env);
    console.log(`🎯 [${timer.getRequestId()}] Selected model for content: ${optimalModel}`);

    // Optimized token limit - reduced from 1000 to 600 for faster processing
    const optimizedMaxTokens = 600;

    console.log(`🔵 [${timer.getRequestId()}] Calling OpenAI with optimizations for content generation...`);
    const response = await timer.timeStep("optimized_content_llm_call", () => callOpenAIOptimized(
      env,
      prompt,
      query,
      optimalModel,
      optimizedMaxTokens,
      0.7,
        {
          usePriority: true,        // Faster queue processing
          useCache: true,          // Cache reusable prompts
          useStructured: false     // Text response, not JSON
        }
    ), {
      query_length: query.length,
      diagram_type: diagramType,
      model: optimalModel,
      max_tokens: optimizedMaxTokens,
      optimizations: "priority,cache,early_stop"
    });

    console.log(`✅ [${timer.getRequestId()}] Optimized content response received:`);
    console.log(`Response length: ${response?.length || 0}`);
    console.log(`Response preview: ${response?.substring(0, 200)}...`);

    if (!response) {
      throw new Error("Empty content response from LLM");
    }

    // Validate content structure
    console.log(`🔵 [${timer.getRequestId()}] Validating content structure...`);
    const isValid = await timer.timeStep("content_validation", async () => {
      return validateContent(response, diagramType);
    }, {
      response_length: response.length,
      diagram_type: diagramType
    });
    console.log(`Content validation result: ${isValid}`);

    if (!isValid) {
      console.error(`❌ [${timer.getRequestId()}] Content validation failed`);
      console.error(`Full content: ${response}`);
      throw new Error("Invalid content structure");
    }

    // Parse content
    console.log(`🔵 [${timer.getRequestId()}] Parsing content...`);
    const parsed = await timer.timeStep("content_parsing", async () => {
      return parseContent(response, diagramType);
    }, {
      response_length: response.length,
      diagram_type: diagramType
    });
    console.log(`Parsed content: ${JSON.stringify(parsed, null, 2)}`);

    // Extract metadata if present
    const metadata = await timer.timeStep("metadata_extraction", async () => {
      return extractMetadata(response, diagramType);
    }, {
      response_length: response.length,
      diagram_type: diagramType
    });
    console.log(`Extracted metadata: ${metadata ? 'Yes' : 'No'}`);

    // Clean the content by removing JSON metadata
    const cleanedContent = await timer.timeStep("content_cleaning", async () => {
      return cleanContentFromMetadata(response);
    }, {
      original_length: response.length
    });

    // Log performance for this function
    timer.logPerformanceReport();

    console.log(`✅ [${timer.getRequestId()}] Optimized content generation successful`);
    console.log(`Final content length: ${cleanedContent.length}`);

    return {
      content: cleanedContent,
      parsed,
      metadata
    };

  } catch (error) {
    console.error(`❌ [${timer.getRequestId()}] Optimized content generation failed:`, error);
    timer.logPerformanceReport();
    throw error;
  }
}

function validateContent(content: string, diagramType: string): boolean {
  if (diagramType === "sequence_comparison") {
    return validateComparisonContent(content);
  }
  if (diagramType === "universal") {
    return validateUniversalContent(content);
  }
  return validateStandardContent(content);
}

function validateStandardContent(content: string): boolean {
  const lines = content.split('\n').map(l => l.trim()).filter(l => l);
  
  // Must include a topic line
  const hasTopic = lines.some(line => 
    /^(main topic|topic)\s*[:\-]/i.test(line)
  );
  
  if (!hasTopic) return false;
  
  // Must have at least one fact - be more lenient
  let factCount = 0;
  for (const line of lines) {
    if (line.startsWith('- ')) {
      factCount++;
    } else if (/^\d+\.\s+/.test(line)) {
      factCount++;
    } else if (/fact/i.test(line)) {
      factCount++;
    } else if (line.length > 10 && !line.toLowerCase().includes('main topic')) {
      // Any substantial line that's not the topic line counts as a fact
      factCount++;
    }
  }
  
  return factCount >= 1;
}

function validateComparisonContent(content: string): boolean {
  const contentLower = content.toLowerCase();
  return contentLower.includes('items:') && 
         contentLower.includes('similarity') && 
         contentLower.includes('unique');
}

function validateUniversalContent(content: string): boolean {
  // Universal content should be natural, readable text
  // Just check that it's not empty and has reasonable length
  const trimmed = content.trim();
  if (!trimmed || trimmed.length < 50) {
    return false;
  }
  
  // Check that it contains some substantive content (not just headers or formatting)
  const lines = trimmed.split('\n').map(l => l.trim()).filter(l => l);
  const substantiveLines = lines.filter(line => 
    line.length > 20 && // Substantial content
    !line.match(/^[#*\-=]+$/) && // Not just formatting characters
    !line.match(/^\d+\.?\s*$/) // Not just numbers
  );
  
  return substantiveLines.length >= 2; // At least 2 substantive lines
}

function parseContent(content: string, diagramType: string): { topic: string; facts: string[] } {
  if (diagramType === "sequence_comparison") {
    return parseComparisonContent(content);
  }
  if (diagramType === "universal") {
    return parseUniversalContent(content);
  }
  return parseStandardContent(content);
}

function parseStandardContent(content: string): { topic: string; facts: string[] } {
  const lines = content.split('\n');
  const result = { topic: '', facts: [] as string[] };
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    const lower = trimmed.toLowerCase();
    if (lower.startsWith('main topic:') || lower.startsWith('topic:')) {
      result.topic = trimmed.split(':', 1)[1]?.trim() || '';
    } else if (lower.match(/^fact \d+:/)) {
      // Handle "fact 1:", "fact 2:", etc.
      const factText = trimmed.split(':', 1)[1]?.trim() || '';
      if (factText) result.facts.push(fixSpacing(factText));
    } else if (trimmed.startsWith('- ')) {
      result.facts.push(fixSpacing(trimmed.substring(2).trim()));
    } else if (/^\d+\.\s+/.test(trimmed)) {
      result.facts.push(fixSpacing(trimmed.replace(/^\d+\.\s+/, '').trim()));
    } else if (trimmed.length > 10 && !lower.includes('main topic')) {
      // Any substantial line that's not the topic line counts as a fact
      result.facts.push(fixSpacing(trimmed));
    }
  }
  
  return result;
}

function fixSpacing(text: string): string {
  // Use the comprehensive text cleaning utility
  return cleanTextContent(text);
}

function parseComparisonContent(content: string): { topic: string; facts: string[] } {
  // For comparison content, we'll extract the main items as the topic
  // and similarities/unique features as facts
  const lines = content.split('\n');
  const result = { topic: '', facts: [] as string[] };
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    const lower = trimmed.toLowerCase();
    if (lower.startsWith('items:')) {
      const items = trimmed.split(':', 1)[1]?.split(',').map(i => i.trim()) || [];
      result.topic = items.join(' vs ');
    } else if (lower.includes('similarity') || lower.includes('unique')) {
      result.facts.push(fixSpacing(trimmed));
    }
  }
  
  return result;
}

function parseUniversalContent(content: string): { topic: string; facts: string[] } {
  // For universal content, extract the main topic from the first line or heading
  const lines = content.split('\n').map(l => l.trim()).filter(l => l);
  const result = { topic: '', facts: [] as string[] };
  
  if (lines.length === 0) {
    return result;
  }
  
  // Try to extract topic from first line
  const firstLine = lines[0];
  if (firstLine.length > 0) {
    // If it's a heading (starts with a word), use that as topic
    if (/^[A-Z]/.test(firstLine)) {
      result.topic = firstLine.split(' ').slice(0, 3).join(' '); // First few words
    } else {
      result.topic = firstLine.substring(0, 50); // First 50 chars
    }
  }
  
  // Add all lines as "facts" for universal content
  result.facts = lines.map(line => fixSpacing(line));
  
  return result;
}

function cleanContentFromMetadata(response: string): string {
  // Remove JSON metadata blocks from the response
  let cleaned = response;
  
  // Remove JSON code blocks
  cleaned = cleaned.replace(/```json\s*[\s\S]*?\s*```/g, '');
  
  // Remove standalone JSON objects that contain diagram_meta
  cleaned = cleaned.replace(/\{[\s\S]*?"diagram_meta"[\s\S]*?\}/g, '');
  
  // Remove any remaining JSON-like structures at the end
  cleaned = cleaned.replace(/\n\s*\{[\s\S]*?\}\s*$/g, '');
  
  // Clean up extra whitespace and empty lines
  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');
  cleaned = cleaned.trim();
  
  return cleaned;
}

function extractMetadata(response: string, diagramType: string): any {
  // Extract metadata for all diagram types that support it
  if (diagramType !== "radial_mindmap" && diagramType !== "flowchart" && diagramType !== "sequence_comparison") {
    return null;
  }
  
  try {
    // Try to find JSON metadata in the response
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/\{[\s\S]*"diagram_meta"[\s\S]*\}/);
    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonStr);
      if (parsed.diagram_meta) {
        return parsed.diagram_meta;
      }
    }
  } catch (error) {
    console.warn("Failed to parse metadata from content response:", error);
  }
  
  return null;
}

export async function buildDescribeResponse(result: any, originalQuery: string): Promise<DiagramResponse> {
  // Ensure we pass along diagram_meta if the model returned it.
  // If the model forgot "entity", fill it from the user query heuristically.
  try {
    const r = result as DiagramResponse;
    if (r.diagram_meta?.nodes) {
      const entityGuess =
        (r.description || "").split(/[—:-]/)[0].trim() ||
        ""; // harmless if empty
      for (const k of Object.keys(r.diagram_meta.nodes)) {
        const n = r.diagram_meta.nodes[k] as NodeMeta | undefined;
        if (!n) continue;
        if (!n.entity) n.entity = entityGuess;
        if (typeof n.theme === "string") n.theme = n.theme.trim().toLowerCase();
        if (Array.isArray(n.keywords)) {
          n.keywords = n.keywords
            .map((s) => (s || "").toString().trim().toLowerCase())
            .filter(Boolean)
            .slice(0, 8);
        }
        if (typeof n.search === "string") n.search = n.search.trim();
      }
    }
    return r;
  } catch {
    return result as any;
  }
}
