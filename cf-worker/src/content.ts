/**
 * Content generation logic adapted from pitext_desktop for Cloudflare Workers.
 * Handles generating structured content descriptions from user queries.
 */

import { callOpenAI, EnvLike } from './openai';
import { getContentPrompt } from './prompts';

export interface ContentResult {
  content: string;
  parsed: {
    topic: string;
    facts: string[];
  };
}

export async function generateContent(
  query: string,
  diagramType: string,
  env: EnvLike
): Promise<ContentResult> {
  const prompt = getContentPrompt(diagramType);
  
  try {
    const response = await callOpenAI(
      env,
      prompt,
      query,
      env.OPENAI_MODEL || "gpt-4o-mini",
      1000,
      0.7
    );
    
    if (!response) {
      throw new Error("Empty content response from LLM");
    }
    
    // Validate content structure
    if (!validateContent(response, diagramType)) {
      throw new Error("Invalid content structure");
    }
    
    // Parse content
    const parsed = parseContent(response, diagramType);
    
    return {
      content: response,
      parsed
    };
    
  } catch (error) {
    console.error("Content generation failed:", error);
    throw error;
  }
}

function validateContent(content: string, diagramType: string): boolean {
  if (diagramType === "sequence_comparison") {
    return validateComparisonContent(content);
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
  
  // Must have at least one fact
  let factCount = 0;
  for (const line of lines) {
    if (line.startsWith('- ')) {
      factCount++;
    } else if (/^\d+\.\s+/.test(line)) {
      factCount++;
    } else if (/fact/i.test(line)) {
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

function parseContent(content: string, diagramType: string): { topic: string; facts: string[] } {
  if (diagramType === "sequence_comparison") {
    return parseComparisonContent(content);
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
    } else if (trimmed.startsWith('- ')) {
      result.facts.push(trimmed.substring(2).trim());
    } else if (/^\d+\.\s+/.test(trimmed)) {
      result.facts.push(trimmed.replace(/^\d+\.\s+/, '').trim());
    }
  }
  
  return result;
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
      result.facts.push(trimmed);
    }
  }
  
  return result;
}
