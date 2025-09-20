/**
 * Diagram generation logic for Cloudflare Workers.
 * Handles content generation, diagram creation, and pipeline orchestration.
 */

import { callOpenAI, EnvLike } from './openai';
import { getCombinedContentPrompt, getDeepDivePrompt } from './prompts';
import { createTimer } from './timing';
import { DiagramType, DiagramResult, selectDiagramType } from './diagram-types';

export interface CombinedContentResult {
  universalContent: string;
  diagramContent: string;
  diagramMermaid: string;
  diagramMeta?: any;
}

const COMBINED_CONTENT_CACHE_TTL_MS = 2 * 60 * 1000;
const combinedContentCache = new Map<string, { expires: number; value: CombinedContentResult }>();

function buildCacheKey(diagramType: string, query: string): string {
  return `${diagramType.toLowerCase()}::${query.trim().toLowerCase()}`;
}

export async function generateCombinedContent(
  query: string,
  diagramType: string,
  env: EnvLike
): Promise<CombinedContentResult> {
  const timer = createTimer();
  timer.markStart('cache_lookup', { diagram_type: diagramType });

  const key = buildCacheKey(diagramType, query);
  const cached = combinedContentCache.get(key);
  if (cached && cached.expires > Date.now()) {
    timer.markEnd('cache_lookup', { hit: true });
    console.log(`[combined-content] Cache hit for ${diagramType}`);
    timer.logPerformanceReport();
    return cached.value;
  }
  timer.markEnd('cache_lookup', { hit: false });

  const combinedPrompt = getCombinedContentPrompt(diagramType);
  const model = (env as Record<string, string | undefined>)?.OPENAI_COMBINED_MODEL || env.OPENAI_MODEL || 'gpt-4o-mini';

  console.log(`dY"� [${timer.getRequestId()}] Starting combined content generation...`);
  console.log(`Query: ${query}`);
  console.log(`Diagram type: ${diagramType}`);
  console.log(`Using model: ${model}`);

  try {
    const response = await timer.timeStep('combined_content_llm_call', () => callOpenAI(
      env,
      combinedPrompt,
      query,
      model,
      1600,
      0.4
    ), {
      query_length: query.length,
      diagram_type: diagramType,
      model,
      max_tokens: 1600
    });

    console.log(`�o. [${timer.getRequestId()}] OpenAI combined content response received:`);
    console.log(`Response length: ${response?.length || 0}`);
    console.log(`Response preview: ${response?.substring(0, 200)}...`);

    if (!response) {
      throw new Error('Empty combined content response from LLM');
    }

    const parsed = await timer.timeStep('response_parsing', async () => {
      return parseCombinedResponse(response, query);
    }, {
      response_length: response.length
    });

    combinedContentCache.set(key, {
      expires: Date.now() + COMBINED_CONTENT_CACHE_TTL_MS,
      value: parsed
    });

    console.log(`�o. [${timer.getRequestId()}] Combined content generation successful`);
    console.log(`Universal content length: ${parsed.universalContent.length}`);
    console.log(`Diagram content length: ${parsed.diagramContent.length}`);

    timer.logPerformanceReport();
    return parsed;
  } catch (error) {
    console.error(`�?O [${timer.getRequestId()}] Combined content generation failed:`, error);
    timer.logPerformanceReport();
    throw error;
  }
}

function parseCombinedResponse(response: string, query: string): CombinedContentResult {
  let universalContent = '';
  let diagramContent = '';
  let diagramMermaid = '';
  let diagramMeta: any = undefined;

  let candidate = response.trim();
  if (candidate.startsWith('```')) {
    candidate = candidate.replace(/^```[a-zA-Z]*\s*/, '').replace(/\s*```$/, '');
  }

  const jsonMatch = candidate.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    candidate = jsonMatch[0];
  }

  try {
    const parsed = JSON.parse(candidate);
    universalContent = String(parsed.universal_content ?? parsed.universalContent ?? '').trim();
    diagramContent = String(parsed.diagram_content ?? parsed.diagramContent ?? '').trim();
    diagramMermaid = String(parsed.diagram_mermaid ?? parsed.diagramMermaid ?? '').trim();
    diagramMeta = parsed.diagram_meta ?? parsed.diagramMeta ?? undefined;
  } catch (error) {
    console.warn('�s��,? Failed to parse JSON combined response, applying heuristics:', error);
  }

  if (!universalContent || !diagramContent) {
    const split = fallbackContentSplit(response);
    universalContent = universalContent || split.universalContent;
    diagramContent = diagramContent || split.diagramContent;
  }

  if (typeof diagramMeta === 'string') {
    try {
      diagramMeta = JSON.parse(diagramMeta);
    } catch {
      diagramMeta = undefined;
    }
  }

  diagramMermaid = sanitizeMermaidCandidate(diagramMermaid || extractMermaid(response));

  if (!diagramMermaid) {
    throw new Error('Unable to locate Mermaid diagram in combined response');
  }

  return {
    universalContent: universalContent || `Summary unavailable for ${query}`,
    diagramContent: diagramContent || 'Main topic: ' + query,
    diagramMermaid,
    diagramMeta
  };
}

function sanitizeMermaidCandidate(value: string): string {
  const trimmed = (value || '').trim();
  if (!trimmed) {
    return '';
  }

  let sanitized = trimmed;
  sanitized = sanitized.replace(/^```(?:mermaid)?\s*/i, '').replace(/\s*```$/, '');
  sanitized = sanitized.replace(/\\n/g, '\n');
  sanitized = sanitized.replace(/\r\n?/g, '\n');
  return sanitized.trim();
}

function extractMermaid(source: string): string {
  if (!source) return '';

  const codeBlock = source.match(/```(?:mermaid)?\s*([\s\S]*?)```/i);
  if (codeBlock) {
    return codeBlock[1].trim();
  }

  const initIndex = source.indexOf('%%{init');
  if (initIndex !== -1) {
    return source.slice(initIndex).trim();
  }

  const flowchartIndex = source.indexOf('flowchart');
  if (flowchartIndex !== -1) {
    return source.slice(flowchartIndex).trim();
  }

  const sequenceIndex = source.indexOf('sequenceDiagram');
  if (sequenceIndex !== -1) {
    return source.slice(sequenceIndex).trim();
  }

  return '';
}

function fallbackContentSplit(raw: string): { universalContent: string; diagramContent: string } {
  const lines = raw.split('\n');
  const universalLines: string[] = [];
  const diagramLines: string[] = [];
  let inUniversal = true;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('Main topic:') || trimmed.startsWith('- ') || /^\d+\./.test(trimmed)) {
      inUniversal = false;
      diagramLines.push(line);
    } else if (inUniversal) {
      universalLines.push(line);
    } else {
      diagramLines.push(line);
    }
  }

  const universalContent = universalLines.join('\n').trim();
  const diagramContent = diagramLines.join('\n').trim();

  if (!universalContent || !diagramContent) {
    const midpoint = Math.floor(raw.length / 2);
    return {
      universalContent: (universalContent || raw.substring(0, midpoint)).trim(),
      diagramContent: (diagramContent || raw.substring(midpoint)).trim()
    };
  }

  return { universalContent, diagramContent };
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
      env.OPENAI_MODEL || 'gpt-4o-mini',
      500,
      0.7
    );

    if (!response) {
      throw new Error('Empty deep dive response from LLM');
    }

    return response.trim();
  } catch (error) {
    console.error('Deep dive generation failed:', error);
    throw error;
  }
}

export async function processDiagramPipeline(
  query: string,
  env: EnvLike
): Promise<DiagramResult> {
  const timer = createTimer();
  console.log(`dYs? [${timer.getRequestId()}] Starting diagram pipeline for query:`, query);

  try {
    const diagramType = await timer.timeStep('diagram_type_selection', () => selectDiagramType(query, env), {
      query_length: query.length
    });
    console.log(`�o. [${timer.getRequestId()}] Selected diagram type: ${diagramType}`);

    const combined = await timer.timeStep('combined_generation', () => generateCombinedContent(query, diagramType, env), {
      query_length: query.length,
      diagram_type: diagramType
    });

    console.log(`�o. [${timer.getRequestId()}] Combined generation complete`);

    const result = await timer.timeStep('result_preparation', async () => {
      const diagramResult: DiagramResult = {
        diagram_type: diagramType as DiagramType,
        description: combined.diagramContent,
        content: combined.diagramContent,
        universal_content: combined.universalContent,
        diagram: combined.diagramMermaid,
        render_type: 'html',
        rendered_content: combined.diagramMermaid,
        diagram_meta: combined.diagramMeta
      };
      return diagramResult;
    }, {
      universal_content_length: combined.universalContent.length,
      diagram_length: combined.diagramMermaid.length
    });

    console.log(`dYZ% [${timer.getRequestId()}] Pipeline completed successfully!`);
    console.log(`dY"S [${timer.getRequestId()}] Final result:`, JSON.stringify({
      diagram_type: result.diagram_type,
      description_length: result.description.length,
      universal_content_length: result.universal_content.length,
      diagram_length: result.diagram.length,
      render_type: result.render_type
    }, null, 2));

    timer.logPerformanceReport();
    return result;
  } catch (error) {
    console.error(`�?O [${timer.getRequestId()}] Diagram pipeline failed:`, error);
    console.error('Pipeline error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Pipeline error details:', JSON.stringify(error, null, 2));
    timer.logPerformanceReport();
    throw error;
  }
}
