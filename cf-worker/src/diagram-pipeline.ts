/**
 * Diagram pipeline orchestration and workflow management for Cloudflare Workers.
 * Handles end-to-end diagram generation pipelines and coordination.
 */

import { EnvLike } from './openai';
import { createTimer } from './timing';
import { sanitizeMermaid } from './utils';
import { DiagramType, DiagramResult, selectDiagramType } from './diagram-types';
import { generateContent, ContentResult } from './content';
import { generateDiagramCode } from './diagram-core';
import { generateUnifiedDiagram, UnifiedDiagramResult } from './content-generators';

export async function processDiagramPipelineSequential(
  query: string,
  env: EnvLike
): Promise<DiagramResult> {
  const timer = createTimer();
  console.log(`🚀 [${timer.getRequestId()}] Starting diagram pipeline for query:`, query);
  
  try {
    // Step 1: Select diagram type
    const diagramType = await timer.timeStep("diagram_type_selection", () => selectDiagramType(query, env), {
      query_length: query.length
    });
    console.log(`✅ [${timer.getRequestId()}] Selected diagram type: ${diagramType}`);
    
    // Step 2: Generate content with metadata for all diagram types
    let universalContent: string;
    let diagramContent: string;
    let contentMetadata: any = null;
    
    if (diagramType === "radial_mindmap") {
      // Use individual content generation to get metadata
      const contentResult = await timer.timeStep("content_generation", () => 
        generateContent(query, diagramType, env), {
        query_length: query.length,
        diagram_type: diagramType
      });
      diagramContent = contentResult.content;
      contentMetadata = contentResult.metadata;
      
      // Generate universal content separately
      const universalResult = await timer.timeStep("universal_content_generation", () => 
        generateContent(query, "universal", env), {
        query_length: query.length,
        diagram_type: "universal"
      });
      universalContent = universalResult.content;
    } else {
      // For other diagram types, generate individual content to get metadata
      const contentResult = await timer.timeStep("content_generation", () => 
        generateContent(query, diagramType, env), {
        query_length: query.length,
        diagram_type: diagramType
      });
      diagramContent = contentResult.content;
      contentMetadata = contentResult.metadata;
      
      // Generate universal content separately
      const universalResult = await timer.timeStep("universal_content_generation", () => 
        generateContent(query, "universal", env), {
        query_length: query.length,
        diagram_type: "universal"
      });
      universalContent = universalResult.content;
    }
    
    console.log(`✅ [${timer.getRequestId()}] Generated universal content: ${universalContent.substring(0, 100)}...`);
    console.log(`✅ [${timer.getRequestId()}] Generated diagram content: ${diagramContent.substring(0, 100)}...`);
    console.log(`✅ [${timer.getRequestId()}] Content metadata:`, contentMetadata ? 'Yes' : 'No');
    
    // Create a ContentResult object for compatibility
    const contentResult: ContentResult = {
      content: diagramContent,
      parsed: {
        topic: '',
        facts: []
      },
      metadata: contentMetadata
    };
    
    // Step 3: Generate diagram code
    const diagramCode = await timer.timeStep("diagram_code_generation", () => 
      generateDiagramCode(contentResult.content, query, diagramType, env), {
      content_length: contentResult.content.length,
      diagram_type: diagramType
    });
    console.log(`✅ [${timer.getRequestId()}] Generated diagram code: ${diagramCode.substring(0, 100)}...`);
    
    // Step 4: Prepare final result
    const result = await timer.timeStep("result_preparation", async () => {
      const sanitizedDiagram = diagramCode; // Will be sanitized in handlers
      
      const result: DiagramResult = {
        diagram_type: diagramType,
        description: diagramContent,
        content: diagramContent,
        universal_content: universalContent,
        diagram: sanitizedDiagram,
        render_type: "html" as const,
        rendered_content: sanitizedDiagram,
        diagram_meta: contentMetadata
      };
      
      return result;
    }, {
      diagram_length: diagramCode.length,
      universal_content_length: universalContent.length
    });
    
    console.log(`🎉 [${timer.getRequestId()}] Pipeline completed successfully!`);
    console.log(`📊 [${timer.getRequestId()}] Final result:`, JSON.stringify({
      diagram_type: result.diagram_type,
      description_length: result.description.length,
      universal_content_length: result.universal_content.length,
      diagram_length: result.diagram.length,
      render_type: result.render_type
    }, null, 2));
    
    // Log pipeline performance
    timer.logPerformanceReport();
    
    return result;
    
  } catch (error) {
    console.error(`❌ [${timer.getRequestId()}] Diagram pipeline failed:`, error);
    console.error("Pipeline error stack:", error instanceof Error ? error.stack : 'No stack trace');
    console.error("Pipeline error details:", JSON.stringify(error, null, 2));
    
    // Log performance even for errors
    timer.logPerformanceReport();
    
    throw error;
  }
}

export async function processDiagramPipeline(
  query: string,
  env: EnvLike
): Promise<DiagramResult> {
  const timer = createTimer();
  console.log(`🚀 [${timer.getRequestId()}] Starting OPTIMIZED diagram pipeline for query:`, query);
  
  try {
    // Use the new unified generation approach
    const unifiedResult = await timer.timeStep("unified_generation", () =>
      generateUnifiedDiagram(query, env), {
      query_length: query.length
    });
    
    console.log(`✅ [${timer.getRequestId()}] Unified generation completed`);

    // Sanitize the diagram code
    const sanitizedDiagram = await timer.timeStep("diagram_sanitization", async () => {
      return sanitizeMermaid(unifiedResult.mermaid_code);
    }, {
      diagram_length: unifiedResult.mermaid_code.length,
      diagram_type: unifiedResult.diagram_type
    });
    
    // Prepare final result
    const result = await timer.timeStep("result_preparation", async () => {
      const result: DiagramResult = {
        diagram_type: unifiedResult.diagram_type,
        description: unifiedResult.diagram_content,
        content: unifiedResult.diagram_content,
        universal_content: unifiedResult.universal_content,
        diagram: sanitizedDiagram,
        render_type: "html" as const,
        rendered_content: sanitizedDiagram,
        diagram_meta: unifiedResult.diagram_meta
      };
      
      return result;
    }, {
      diagram_length: sanitizedDiagram.length,
      universal_content_length: unifiedResult.universal_content.length
    });
    
    console.log(`🎉 [${timer.getRequestId()}] OPTIMIZED Pipeline completed successfully!`);
    console.log(`📊 [${timer.getRequestId()}] Final result:`, JSON.stringify({
      diagram_type: result.diagram_type,
      description_length: result.description.length,
      universal_content_length: result.universal_content.length,
      diagram_length: result.diagram.length,
      render_type: result.render_type,
      has_meta: !!result.diagram_meta
    }, null, 2));
    
    timer.logPerformanceReport();
    
    return result;
    
  } catch (error) {
    console.error(`❌ [${timer.getRequestId()}] Optimized pipeline failed:`, error);
    console.error("Pipeline error stack:", error instanceof Error ? error.stack : 'No stack trace');
    
    // Fallback to original sequential approach if unified fails
    console.log(`⚠️ [${timer.getRequestId()}] Falling back to sequential pipeline...`);
    return processDiagramPipelineSequential(query, env);
  }
}
