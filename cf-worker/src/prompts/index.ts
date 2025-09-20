/**
 * Prompt exports for easy importing
 */

import { contentPrompt } from './content_prompt';
import { contentSequencePrompt } from './content_sequence_prompt';
import { contentUniversalPrompt } from './content_universal_prompt';
import { diagramRadialPrompt } from './diagram_radial_prompt';
import { diagramFlowchartPrompt } from './diagram_flowchart_prompt';
import { diagramSequencePrompt } from './diagram_sequence_prompt';
import { deepDivePrompt } from './deep_dive_prompt';

// Re-export for external use
export { contentPrompt, contentSequencePrompt, contentUniversalPrompt, diagramRadialPrompt, diagramFlowchartPrompt, diagramSequencePrompt, deepDivePrompt };

// Convenience functions for getting prompts by type
export function getContentPrompt(diagramType: string): string {
  if (diagramType === 'sequence_comparison') {
    return contentSequencePrompt;
  }
  if (diagramType === 'universal') {
    return contentUniversalPrompt;
  }
  return contentPrompt;
}

export function getDiagramPrompt(diagramType: string): string {
  switch (diagramType) {
    case 'flowchart':
      return diagramFlowchartPrompt;
    case 'sequence_comparison':
      return diagramSequencePrompt;
    case 'radial_mindmap':
    default:
      return diagramRadialPrompt;
  }
}

export function getDeepDivePrompt(): string {
  return deepDivePrompt;
}

export function getUniversalContentPrompt(): string {
  return contentUniversalPrompt;
}

const UNIVERSAL_GUIDANCE = `Write two concise paragraphs (roughly 160-220 words total) that explain the topic clearly. Lead with a 1 sentence overview, then expand with key context, practical relevance, and any timely considerations. Use natural sentences, no bullet points, no headings, and avoid repeating the query verbatim.`;

function getStructuredSummaryGuidance(diagramType: string): string {
  const base = `Format exactly as:\nMain topic: <succinct 2-4 word title>\n\n- Fact 1 describing a distinct aspect (10-16 words)\n- Fact 2 (10-16 words)\n- Fact 3 (10-16 words)\n- Fact 4 (optional, same length)\n- Fact 5 (optional)\n- Fact 6 (optional)\n\nRules:\n- Provide 4-6 bullets.\n- Each fact should be self-contained and unique.\n- Use everyday language with active verbs.`;

  if (diagramType === 'flowchart') {
    return `${base}\n- Emphasise actions or decision points (start each fact with a strong verb).`;
  }

  if (diagramType === 'sequence_comparison') {
    return `${base}\n- Highlight similarities or contrasts; name the compared items in each fact.`;
  }

  return `${base}\n- Cover the most important characteristics, subtopics, or impacts of the central idea.`;
}

const RADIAL_INIT_BLOCK = `%%{init:{"theme":"base","fontFamily":"sans-serif","fontSize":"16px","flowchart":{"htmlLabels":false,"wrap":true,"useMaxWidth":true},"themeVariables":{"primaryColor":"#ffffff","primaryTextColor":"#000000","primaryBorderColor":"#000000","lineColor":"#eeeeee","arrowColor":"#eeeeee","arrowheadColor":"#000000"},"themeCSS":".node text{font-size:16px!important;line-height:1.2!important;padding:8px!important;}.node[id*='A']{min-width:300px!important;min-height:60px!important;}.node[id*='A'] text{padding:15px 20px!important;text-align:center!important;}"}}%%`;

const FLOWCHART_INIT_BLOCK = `%%{init:{"theme":"base","flowchart":{"useMaxWidth":true,"fontFamily":"sans-serif","fontSize":"16px"},"themeVariables":{"lineColor":"#fbbf24","arrowheadColor":"#fbbf24","primaryTextColor":"#000000","primaryColor":"#ffffff"},"themeCSS":".cluster rect{rx:12px;ry:12px}.cluster text{fill:#000000!important;color:#000000!important}"}}%%`;

const SEQUENCE_INIT_BLOCK = `%%{init:{"themeVariables":{"fontFamily":"sans-serif","fontSize":"16px","noteTextColor":"#000000","noteBkgColor":"#ffffff","noteBorderColor":"#000000"},"sequence":{"useMaxWidth":false,"wrap":false,"width":350,"mirrorActors":false,"noteAlign":"center","messageMargin":10,"boxMargin":10,"noteMargin":10,"wrapPadding":5,"diagramMarginX":50,"diagramMarginY":30,"actorMargin":40,"boxTextMargin":8,"noteTextMargin":8},"themeCSS":".actor-line{stroke-width:0.0001px!important}.noteText{white-space:normal!important;overflow-wrap:break-word!important;font-size:16px!important;line-height:1.2!important;padding:8px!important;margin:0!important;hyphens:auto!important;text-shadow:none!important;font-family:Arial,sans-serif!important}.note{padding:5px!important;margin:2px 0!important;stroke-width:2px!important}.sequenceDiagram text{text-shadow:none!important}.note rect,rect.note{rx:12px!important;ry:12px!important}.rect rect,rect.rect{rx:12px!important;ry:12px!important}.actor{cursor:pointer!important;transition:all 0.2s ease!important;pointer-events:auto!important;font-size:28px!important;font-weight:700!important}.actor:hover{filter:brightness(1.1) drop-shadow(0 0 6px rgba(255,255,255,0.5))!important;transform:scale(1.02)!important}.actor:hover rect{stroke-width:3px!important;filter:brightness(1.1)!important}.actor text,.actor .label,.actor-label,.participant text{font-size:22.4px!important;font-weight:bold!important;fill:#000000!important;text-shadow:none!important;font-family:Arial,sans-serif!important;cursor:pointer!important;transition:all 0.2s ease!important}.actor rect{fill:#ffffff!important;stroke:#000000!important;stroke-width:2px!important;transition:all 0.2s ease!important;cursor:pointer!important}.note{cursor:pointer!important;transition:all 0.2s ease!important}.note:hover{filter:brightness(1.1) drop-shadow(0 0 6px rgba(255,255,255,0.5))!important;transform:scale(1.02)!important}.note:hover rect{stroke-width:3px!important;filter:brightness(1.1)!important}.note:hover text,.note:hover tspan{filter:brightness(1.1)!important;font-weight:500!important}.actor.element-selected{filter:drop-shadow(0 0 6px #ffb300)!important}.actor.element-selected rect{stroke:#ffb300!important;stroke-width:3px!important}.actor.element-selected text{font-weight:400!important;filter:drop-shadow(0 0 4px #ffb300)!important}.note.element-selected{filter:drop-shadow(0 0 6px #ffb300)!important}.note.element-selected rect{stroke:#ffb300!important;stroke-width:3px!important}.note.element-selected text{font-weight:400!important;filter:drop-shadow(0 0 4px #ffb300)!important}"}}%%`;

function getDiagramMermaidGuidance(diagramType: string): string {
  if (diagramType === 'flowchart') {
    return [
      `- Begin with this exact header then \'flowchart TB\':\n${FLOWCHART_INIT_BLOCK}`,
      '- Create a `Context` subgraph (direction LR) with 2-3 concise background nodes.',
      '- Create a `Details` subgraph (direction TB) describing 4-5 ordered steps.',
      '- Include at least one decision node using `{Question?}` syntax with labelled yes/no branches.',
      '- Use `~~~` between context nodes and `-->` for process flows.',
      '- Keep node labels short; use `<br>` for manual line breaks.',
      '- Conclude with class definitions for processStyle/decisionStyle mirroring the template.'
    ].join('\n');
  }

  if (diagramType === 'sequence_comparison') {
    return [
      `- Begin with this header then \'sequenceDiagram\':\n${SEQUENCE_INIT_BLOCK}`,
      '- Create one participant per compared item; use quoted labels when the name contains spaces.',
      '- Add a green `rect` block covering the first and last participant for shared similarities; list 3 concise numbered points using `<br>` inside the note.',
      '- For each item, add a red `rect` block with a numbered list of unique traits (max 3, <=6 words each).',
      '- Maintain activation bars (`activate`/`deactivate`) for participants as in the template.',
      '- Keep text single-line inside notes, using `<br>` to wrap.',
      '- No prose outside the diagram.'
    ].join('\n');
  }

  return [
    `- Begin with this header then \'flowchart TD\':\n${RADIAL_INIT_BLOCK}`,
    '- Use `A("<exact user query>")` for the centre node.',
    '- Create 4-6 surrounding nodes (B, C, D, ...) with short multi-line summaries using `<br>`.',
    '- Connect every node to A using `<==>` for thick links.',
    '- After the connections, add `style` lines for A and each fact node with white fill and black stroke.',
    '- Avoid extra subgraphs or commentary.'
  ].join('\n');
}

export function getCombinedContentPrompt(diagramType: string): string {
  const structuredGuidance = getStructuredSummaryGuidance(diagramType);
  const mermaidGuidance = getDiagramMermaidGuidance(diagramType);

  return [
    'You are Infflow\'s unified response generator. The user message will contain the raw query.',
    'Respond decisively and keep the total answer under 650 tokens.',
    'Return ONLY valid JSON (no code fences, no commentary) with these exact keys: "universal_content", "diagram_content", "diagram_mermaid", "diagram_meta".',
    'General rules:\n- Use double quotes for all strings.\n- Escape newlines inside strings with `\n`.\n- Never include backticks or Markdown fences.',
    `universal_content requirements:\n${UNIVERSAL_GUIDANCE}`,
    `diagram_content requirements:\n${structuredGuidance}`,
    'diagram_meta requirements:\n- Provide an object `{ "facts": [...] }`.\n- Add one entry per bullet in diagram_content and preserve order.\n- Each fact object must include: "theme" (1-3 lowercase words), "keywords" (3-6 lower-case search tokens), "search" (optional short query), "entity" (main subject).\n- Keep keywords concise; omit empty fields rather than using placeholders.',
    `diagram_mermaid requirements:\n${mermaidGuidance}`,
    'Final checks:\n- Inject the exact user query text wherever the template requests it.\n- Keep facts and diagram nodes aligned.\n- Prefer crisp, modern vocabulary; avoid filler or apologies.'
  ].join('\n\n');
}
