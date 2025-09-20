import { json, sanitizeMermaid } from "./utils";
import { processDiagramPipeline, generateDeepDiveResponse, generateCombinedContent } from "./diagram-generator";
import { generateClusterData } from "./cluster-generator";
import { DiagramType } from "./diagram-types";
import { EnvLike } from "./openai";
import { createTimer } from "./timing";

type DescribeRequest = { query: string };
type DiagramResponse = {
  success: true;
  query: string;
  description: string;
  content: string;
  universal_content: string;
  diagram_type: DiagramType;
  diagram: string;
  render_type: "html";
  rendered_content: string;
  diagram_meta?: any;
};

type DeepDiveRequest = { selected_text: string; question: string; original_query?: string };

export async function describeHandler(body: DescribeRequest, env: EnvLike): Promise<Response> {
  const query = (body?.query || "").trim();
  if (!query) {
    return json({ 
      success: false, 
      detail: "Query cannot be empty", 
      error_type: "validation_error" 
    }, 400);
  }

  // Create performance timer for this request
  const timer = createTimer();
  timer.markStart("request_validation", { query_length: query.length });

  try {
    // If FoamTree/topic map is explicitly requested, skip Mermaid pipeline.
    const q = query.toLowerCase();
    if (
      q.includes('foamtree') ||
      q.includes('foam tree') ||
      q.includes('foam-tree') ||
      q.includes('topic map') ||
      q.includes('topic maps') ||
      q.includes('topic-map') ||
      q.includes('topicmap')
    ) {
      console.log(`FoamTree requested; skipping diagram pipeline for query: ${query}`);
      const response: DiagramResponse = {
        success: true,
        query,
        description: '',
        content: '',
        universal_content: '',
        diagram_type: 'radial_mindmap',
        diagram: '',
        render_type: 'html',
        rendered_content: '',
      };
      timer.logPerformanceReport();
      return json(response, 200);
    }
    console.log(`🚀 [${timer.getRequestId()}] Processing describe request: ${query.substring(0, 50)}...`);
    
    // Use the sophisticated pipeline from pitext_desktop
    const result = await timer.timeStep("diagram_pipeline", () => processDiagramPipeline(query, env), {
      query_length: query.length
    });
    
    // Sanitize the diagram code
    const sanitizedDiagram = await timer.timeStep("diagram_sanitization", async () => {
      return sanitizeMermaid(result.diagram);
    }, {
      diagram_length: result.diagram.length,
      diagram_type: result.diagram_type
    });
    
    // Prepare final response
    const response = await timer.timeStep("response_preparation", async () => {
      const response: DiagramResponse = {
        success: true,
        query,
        description: result.description,
        content: result.content,
        universal_content: result.universal_content,
        diagram_type: result.diagram_type,
        diagram: sanitizedDiagram,
        render_type: "html",
        rendered_content: sanitizedDiagram,
        diagram_meta: result.diagram_meta,
      };
      return response;
    }, {
      response_size: JSON.stringify({ success: true, query, diagram_type: result.diagram_type }).length
    });
    
    timer.markEnd("request_validation");
    
    // Log performance report
    timer.logPerformanceReport();
    
    console.log(`✅ [${timer.getRequestId()}] Generated ${result.diagram_type} diagram for query: ${query.substring(0, 50)}`);
    
    return json(response, 200);
    
  } catch (error) {
    timer.markEnd("request_validation", { success: false, error: error instanceof Error ? error.message : String(error) });
    
    // Log performance report even for errors
    timer.logPerformanceReport();
    
    console.error(`❌ [${timer.getRequestId()}] Describe handler error:`, error);
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    console.error("Error details:", JSON.stringify(error, null, 2));
    return json({ 
      success: false, 
      detail: `Error generating diagram: ${error instanceof Error ? error.message : 'Unknown error'}`, 
      error_type: "internal_error",
      debug_info: error instanceof Error ? error.stack : String(error)
    }, 500);
  }
}

export async function deepDiveHandler(body: DeepDiveRequest, env: EnvLike): Promise<Response> {
  const selected = (body?.selected_text || "").trim();
  const question = (body?.question || "").trim();
  const original = (body?.original_query || "").trim();
  
  if (!selected || !question) {
    return json({ 
      success: false, 
      detail: "selected_text and question are required", 
      error_type: "validation_error" 
    }, 400);
  }

  try {
    console.log(`Deep-dive request - Text: ${selected.substring(0, 30)}..., Question: ${question.substring(0, 50)}...`);
    
    const response = await generateDeepDiveResponse(selected, question, original, env);
    
    return json({ 
      success: true, 
      response: response 
    }, 200);
    
  } catch (error) {
    console.error("Deep dive handler error:", error);
    return json({ 
      success: false, 
      detail: `Error generating deep dive response: ${error instanceof Error ? error.message : 'Unknown error'}`, 
      error_type: "internal_error" 
    }, 500);
  }
}

type ClusterRequest = { clusterId: string };

export async function clusterHandler(body: ClusterRequest, env: EnvLike): Promise<Response> {
  const clusterId = (body?.clusterId || '').trim();

  if (!clusterId) {
    return json({
      success: false,
      detail: 'clusterId is required',
      error_type: 'validation_error',
    }, 400);
  }

  try {
    console.log(`Cluster request - ID: ${clusterId}`);

    const cluster = await generateClusterData(clusterId, env);

    // Also generate universal text content to populate the Text tab
    let universal_content = '';
    try {
      const { universalContent } = await generateCombinedContent(clusterId, 'radial_mindmap', env);
      universal_content = universalContent || '';
    } catch (e) {
      console.warn('Universal content generation failed for cluster:', e);
      universal_content = '';
    }

    return json({
      success: true,
      cluster,
      universal_content,
    }, 200);
  } catch (error) {
    console.error('Cluster handler error:', error);
    return json({
      success: false,
      detail: `Error generating cluster data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error_type: 'server_error',
    }, 500);
  }
}
