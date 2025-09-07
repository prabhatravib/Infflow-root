export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

export function toMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function sanitizeMermaid(input: string): string {
  let text = (input || "").trim();
  
  // STEP 1: Extract and preserve the init block
  let initBlock = null;
  const initPattern = /(%%\{init:.*?\}%%)/;
  const initMatch = text.match(initPattern);
  
  if (initMatch) {
    initBlock = initMatch[0];
    text = text.replace(initBlock, '###MERMAID_INIT_BLOCK_PLACEHOLDER###');
  }
  
  // STEP 2: Apply all sanitization steps
  text = removeMarkdownFences(text);
  text = decodeHtmlEntities(text);
  text = sanitizeSpecialChars(text);
  text = normalizeUnicode(text);
  text = fixLineBreaks(text);
  text = fixFlowchartSpacing(text);
  
  // STEP 3: Process line by line
  const fixedLines: string[] = [];
  for (const line of text.split('\n')) {
    if (line.includes('###MERMAID_INIT_BLOCK_PLACEHOLDER###')) {
      fixedLines.push(line);
    } else {
      fixedLines.push(processLine(line));
    }
  }
  
  text = fixedLines.join('\n');
  
  // STEP 4: Final cleanup
  text = finalCleanup(text);
  
  // STEP 5: Restore the original init block
  if (initBlock) {
    text = text.replace('###MERMAID_INIT_BLOCK_PLACEHOLDER###', initBlock);
  }
  
  // STEP 6: Final validation
  text = validateFlowchartStructure(text);
  
  return text;
}

function removeMarkdownFences(text: string): string {
  return text
    .replace(/^```(?:mermaid)?\s*/gm, '')
    .replace(/```$/gm, '');
}

function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = { 
    "&amp;": "&", 
    "&lt;": "<", 
    "&gt;": ">", 
    "&quot;": '"', 
    "&#39;": "'" 
  };
  
  // Decode twice to catch double-encoding
  for (const [k, v] of Object.entries(entities)) {
    text = text.split(k).join(v);
  }
  for (const [k, v] of Object.entries(entities)) {
    text = text.split(k).join(v);
  }
  
  return text;
}

function sanitizeSpecialChars(text: string): string {
  const lines = text.split('\n');
  const sanitizedLines: string[] = [];
  
  for (const line of lines) {
    const stripped = line.trim();
    
    // Skip Mermaid directives
    if (stripped.startsWith('%%{init:') || 
        stripped.startsWith('flowchart') || 
        stripped.startsWith('sequenceDiagram') || 
        stripped.startsWith('classDiagram') || 
        stripped.startsWith('graph') ||
        stripped.startsWith('participant') ||
        stripped.startsWith('activate') ||
        stripped.startsWith('deactivate')) {
      sanitizedLines.push(line);
      continue;
    }
    
    // Skip placeholder lines
    if (line.includes('###MERMAID_INIT_BLOCK_PLACEHOLDER###')) {
      sanitizedLines.push(line);
      continue;
    }
    
    // Process regular content lines
    let result = line;
    
    // Replace problematic characters
    const replacements: Record<string, string> = {
      ';': ',',
      '–': '-',
      '—': '-',
      '"': '"',
      '"': '"',
      ''': "'",
      ''': "'",
      '\u00A0': ' ',
      '\u200B': '',
      '…': '...',
      '•': '-',
      '$': 'USD ',
      '™': ' TM',
      '®': ' (R)',
      '©': ' (C)',
      '\\': '/',
      '`': "'",
    };
    
    for (const [old, new_] of Object.entries(replacements)) {
      result = result.replace(new RegExp(old, 'g'), new_);
    }
    
    sanitizedLines.push(result);
  }
  
  return sanitizedLines.join('\n');
}

function normalizeUnicode(text: string): string {
  return text
    .replace(/\u2013|\u2014/g, "-")
    .replace(/\u201C|\u201D/g, '"')
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u00A0/g, " ")
    .replace(/\u200B/g, "");
}

function fixLineBreaks(text: string): string {
  return text.replace(/<\s*br\s*\/?\s*>/gi, '<br>');
}

function fixFlowchartSpacing(text: string): string {
  // Fix flowchart declarations followed immediately by node IDs
  text = text.replace(/(flowchart\s+(?:TD|TB|LR|RL))\s*(\w\()/g, "$1\n    $2");
  text = text.replace(/(graph\s+(?:TD|TB|LR|RL))\s*(\w\()/g, "$1\n    $2");
  
  // Ensure proper indentation for node declarations
  const lines = text.split('\n');
  const fixedLines: string[] = [];
  let inFlowchart = false;
  
  for (const line of lines) {
    const stripped = line.trim();
    
    if (stripped.startsWith('flowchart') || stripped.startsWith('graph')) {
      inFlowchart = true;
      fixedLines.push(line);
      continue;
    }
    
    if (inFlowchart && stripped && /^[A-Za-z]/.test(stripped) && stripped.includes('(') && stripped.includes(')')) {
      // This is a node declaration - ensure proper indentation
      if (!line.startsWith('    ')) {
        fixedLines.push('    ' + stripped);
      } else {
        fixedLines.push(line);
      }
      continue;
    }
    
    if (inFlowchart && stripped && !(/^[A-Za-z]/.test(stripped) && stripped.includes('(') && stripped.includes(')'))) {
      if (stripped.startsWith('style') || stripped.startsWith('<') || stripped.startsWith('>')) {
        fixedLines.push(line);
        continue;
      } else {
        inFlowchart = false;
      }
    }
    
    fixedLines.push(line);
  }
  
  return fixedLines.join('\n');
}

function processLine(line: string): string {
  const stripped = line.trim();
  
  // Fix subgraph declarations
  if (stripped.toLowerCase().startsWith('subgraph')) {
    return fixSubgraph(stripped);
  }
  
  // Fix bracket nodes with stray quotes
  const bracketMatch = stripped.match(/^(\w+)\[\"([^\"]+)\"\](.*)$/);
  if (bracketMatch) {
    const [, nodeId, label, rest] = bracketMatch;
    return `${nodeId}["${label}"]${rest}`;
  }
  
  // Fix circular nodes
  if (stripped.includes('((') && stripped.includes('))')) {
    return stripped.replace(/\(\(([^)]+)\)\)/g, (match, content) => {
      return `((${content.replace(/"/g, "'")}))`;
    });
  }
  
  // Fix general quotes
  if (!stripped.toLowerCase().startsWith('subgraph')) {
    return fixGeneralQuotes(stripped);
  }
  
  return stripped;
}

function fixSubgraph(line: string): string {
  const content = line.substring(8).trim(); // Remove "subgraph"
  const idMatch = content.match(/^(\w+)/);
  
  if (idMatch) {
    let safeId = idMatch[1].replace(/_+$/, '').replace(/_+/g, '_');
    if (!/^[A-Za-z]\w*$/.test(safeId)) {
      safeId = 'Subgraph';
    }
    return `subgraph ${safeId}`;
  }
  
  return 'subgraph Subgraph';
}

function fixGeneralQuotes(line: string): string {
  return line.replace(/(\b[^\s\[\]]+)?\[([^\]]+)\]/g, (match, nodeId, label) => {
    const cleanLabel = label.trim().replace(/"/g, "'");
    return `${nodeId || ''}[${cleanLabel}]`;
  });
}

function finalCleanup(text: string): string {
  return text.replace(/\"\[/g, '[');
}

function validateFlowchartStructure(text: string): string {
  // Fix flowchart declarations followed immediately by node IDs
  text = text.replace(/(flowchart\s+(?:TD|TB|LR|RL))\s*(\w\()/g, "$1\n    $2");
  text = text.replace(/(graph\s+(?:TD|TB|LR|RL))\s*(\w\()/g, "$1\n    $2");
  
  return text;
}

export function safeParseJSON<T extends Record<string, unknown>>(raw: string, required: string[]): T {
  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    const slice = start >= 0 && end > start ? raw.slice(start, end + 1) : raw;
    const data = JSON.parse(slice);
    for (const k of required) if (!(k in data)) throw new Error(`Missing key ${k}`);
    return data as T;
  } catch (e) {
    return {
      diagram_type: "flowchart",
      description: raw.slice(0, 200),
      mermaid: "flowchart TD\n  A[Start]-->B[End]",
    } as unknown as T;
  }
}

export function normalizeDiagramType(t: string): "flowchart" | "radial_mindmap" | "sequence_comparison" {
  const v = (t || "").toLowerCase();
  if (["flowchart", "graph"].includes(v)) return "flowchart";
  if (["radial_mindmap", "mindmap", "radial"].includes(v)) return "radial_mindmap";
  if (["sequence_comparison", "sequence"].includes(v)) return "sequence_comparison";
  return "flowchart";
}
