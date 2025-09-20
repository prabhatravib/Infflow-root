/**
 * Diagram types and selection heuristics.
 * Uses lightweight keyword heuristics to avoid extra LLM calls.
 */

import type { EnvLike } from './openai';

export type DiagramType = 'flowchart' | 'radial_mindmap' | 'sequence_comparison';

export interface DiagramResult {
  diagram_type: DiagramType;
  description: string;
  content: string;
  universal_content: string;
  diagram: string;
  render_type: 'html';
  rendered_content: string;
  diagram_meta?: any;
}

const COMPARISON_KEYWORDS = [
  ' vs ',
  ' vs. ',
  ' versus ',
  'compare',
  'comparison',
  'comparisons',
  'difference between',
  'differences between',
  'differences',
  'similarities',
  'pros and cons',
  'pros vs cons',
  'advantages and disadvantages'
];

const FLOWCHART_KEYWORDS = [
  'how to ',
  'how do i',
  'how does one',
  'process',
  'workflow',
  'procedure',
  'sequence of steps',
  'steps to',
  'step by step',
  'step-by-step',
  'when should',
  'decision tree',
  'if ',
  'should i',
  'plan for',
  'strategy to'
];

const COMPARISON_REGEX = [
  /\bvs\.?\b/,
  /\bversus\b/,
  /\bcompare(s|d|ing)?\b/,
  /\bcomparison(s)?\b/,
  /\bdifference(s)?\b/,
  /\bsimilarit(y|ies)\b/,
  /\bpros?\s*(and|&)\s*cons?\b/
];

const FLOWCHART_REGEX = [
  /^\s*how\s+(do|does|can|should)\b/,
  /^\s*what\s+is\s+the\s+process\b/,
  /\bworkflow\b/,
  /\bprocess\b/,
  /\bsteps?\b/,
  /\bdecision\b.*\bpath\b/,
  /\bchoose\b.*\bwhen\b/
];

function hasKeyword(haystack: string, keywords: string[]): boolean {
  return keywords.some(keyword => haystack.includes(keyword));
}

function matchesPattern(haystack: string, patterns: RegExp[]): boolean {
  return patterns.some(pattern => pattern.test(haystack));
}

function getOverride(env: EnvLike | undefined): DiagramType | undefined {
  const possible = (env as Record<string, unknown> | undefined)?.DEFAULT_DIAGRAM_TYPE;
  if (typeof possible === 'string') {
    const normalized = possible.toLowerCase().trim();
    if (normalized === 'flowchart' || normalized === 'radial_mindmap' || normalized === 'sequence_comparison') {
      return normalized as DiagramType;
    }
  }
  return undefined;
}

export async function selectDiagramType(query: string, env: EnvLike): Promise<DiagramType> {
  const normalized = (query || '').toLowerCase();

  const override = getOverride(env);
  if (override) {
    console.log(`[diagram-type] Using override: ${override}`);
    return override;
  }

  if (!normalized) {
    console.log('[diagram-type] Empty query, defaulting to radial_mindmap');
    return 'radial_mindmap';
  }

  if (hasKeyword(normalized, COMPARISON_KEYWORDS) || matchesPattern(normalized, COMPARISON_REGEX) || /( vs |\bversus\b)/.test(normalized)) {
    console.log('[diagram-type] Heuristic selection: sequence_comparison');
    return 'sequence_comparison';
  }

  if (hasKeyword(normalized, FLOWCHART_KEYWORDS) || matchesPattern(normalized, FLOWCHART_REGEX)) {
    console.log('[diagram-type] Heuristic selection: flowchart');
    return 'flowchart';
  }

  if (/\b(.{2,40})\s+vs\.?\s+(.{2,40})\b/.test(normalized)) {
    console.log('[diagram-type] Fallback vs-pattern detected, using sequence_comparison');
    return 'sequence_comparison';
  }

  console.log('[diagram-type] Defaulting to radial_mindmap');
  return 'radial_mindmap';
}



