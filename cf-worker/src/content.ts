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
  
  console.log("🔵 Starting content generation...");
  console.log("Query:", query);
  console.log("Diagram type:", diagramType);
  console.log("Using model:", env.OPENAI_MODEL || "gpt-4o-mini");
  
  try {
    console.log("🔵 Calling OpenAI for content generation...");
    const response = await callOpenAI(
      env,
      prompt,
      query,
      env.OPENAI_MODEL || "gpt-4o-mini",
      1000,
      0.7
    );
    
    console.log("✅ OpenAI content response received:");
    console.log("Response length:", response?.length || 0);
    console.log("Response preview:", response?.substring(0, 200) + "...");
    
    if (!response) {
      throw new Error("Empty content response from LLM");
    }
    
    // Validate content structure
    console.log("🔵 Validating content structure...");
    const isValid = validateContent(response, diagramType);
    console.log("Content validation result:", isValid);
    
    if (!isValid) {
      console.error("❌ Content validation failed");
      console.error("Full content:", response);
      throw new Error("Invalid content structure");
    }
    
    // Parse content
    console.log("🔵 Parsing content...");
    const parsed = parseContent(response, diagramType);
    console.log("Parsed content:", JSON.stringify(parsed, null, 2));
    
    return {
      content: response,
      parsed
    };
    
  } catch (error) {
    console.error("❌ Content generation failed:", error);
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
  // Fix common spacing issues
  return text
    // Fix missing space before "like" when it follows a word ending in 's'
    .replace(/([a-zA-Z]s)like/g, '$1 like')
    // Fix missing space before "for" when it follows a word ending in 's'
    .replace(/([a-zA-Z]s)for/g, '$1 for')
    // Fix missing space before "and" when it follows a word ending in 's'
    .replace(/([a-zA-Z]s)and/g, '$1 and')
    // Fix missing space before "or" when it follows a word ending in 's'
    .replace(/([a-zA-Z]s)or/g, '$1 or')
    // Fix missing space before "with" when it follows a word ending in 's'
    .replace(/([a-zA-Z]s)with/g, '$1 with')
    // Fix missing space before "in" when it follows a word ending in 's'
    .replace(/([a-zA-Z]s)in/g, '$1 in')
    // Fix missing space before "on" when it follows a word ending in 's'
    .replace(/([a-zA-Z]s)on/g, '$1 on')
    // Fix missing space before "at" when it follows a word ending in 's'
    .replace(/([a-zA-Z]s)at/g, '$1 at')
    // Fix missing space before "to" when it follows a word ending in 's'
    .replace(/([a-zA-Z]s)to/g, '$1 to')
    // Fix missing space before "of" when it follows a word ending in 's'
    .replace(/([a-zA-Z]s)of/g, '$1 of')
    // Fix missing space before "the" when it follows a word ending in 's'
    .replace(/([a-zA-Z]s)the/g, '$1 the')
    // Fix missing space before "a" when it follows a word ending in 's'
    .replace(/([a-zA-Z]s)a\b/g, '$1 a')
    // Fix missing space before "an" when it follows a word ending in 's'
    .replace(/([a-zA-Z]s)an\b/g, '$1 an')
    // Normalize multiple spaces to single space
    .replace(/\s+/g, ' ')
    .trim();
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
