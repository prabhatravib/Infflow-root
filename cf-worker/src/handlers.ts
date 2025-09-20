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
  const timer = createTimer();
  timer.markStart("request_validation");
  
  try {
    const selected = (body?.selected_text || "").trim();
    const question = (body?.question || "").trim();
    const original = (body?.original_query || "").trim();
    
    if (!selected || !question) {
      timer.markEnd("request_validation", { success: false, error: "Missing required fields" });
      timer.logPerformanceReport();
      return json({ 
        success: false, 
        detail: "selected_text and question are required", 
        error_type: "validation_error" 
      }, 400);
    }

    timer.markEnd("request_validation", { 
      success: true,
      selected_length: selected.length,
      question_length: question.length,
      has_original: !!original
    });

    console.log(`🔍 [${timer.getRequestId()}] Deep-dive request - Text: ${selected.substring(0, 30)}..., Question: ${question.substring(0, 50)}...`);
    
    const response = await timer.timeStep("deep_dive_generation", async () => {
      return await generateDeepDiveResponse(selected, question, original, env);
    }, {
      selected_length: selected.length,
      question_length: question.length,
      has_original_query: !!original
    });
    
    timer.logPerformanceReport();
    console.log(`✅ [${timer.getRequestId()}] Deep dive completed successfully`);
    
    return json({ 
      success: true, 
      response: response,
      timing: {
        request_id: timer.getRequestId(),
        total_time: timer.getTotalTime(),
        steps: timer.getTimings().filter(t => t.duration > 0)
      }
    }, 200);
    
  } catch (error) {
    timer.markEnd("request_validation", { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
    timer.logPerformanceReport();
    
    console.error(`❌ [${timer.getRequestId()}] Deep dive handler error:`, error);
    return json({ 
      success: false, 
      detail: `Error generating deep dive response: ${error instanceof Error ? error.message : 'Unknown error'}`, 
      error_type: "internal_error",
      timing: {
        request_id: timer.getRequestId(),
        total_time: timer.getTotalTime(),
        steps: timer.getTimings().filter(t => t.duration > 0)
      }
    }, 500);
  }
}

type ClusterRequest = { clusterId: string };

export async function clusterHandler(body: ClusterRequest, env: EnvLike): Promise<Response> {
  const timer = createTimer();
  timer.markStart("request_validation");
  
  try {
    const clusterId = (body?.clusterId || '').trim();

    if (!clusterId) {
      timer.markEnd("request_validation", { success: false, error: "Missing clusterId" });
      timer.logPerformanceReport();
      return json({
        success: false,
        detail: 'clusterId is required',
        error_type: 'validation_error',
      }, 400);
    }

    timer.markEnd("request_validation", { 
      success: true,
      cluster_id: clusterId,
      cluster_id_length: clusterId.length
    });

    console.log(`🔍 [${timer.getRequestId()}] Cluster request - ID: ${clusterId}`);

    const cluster = await timer.timeStep("cluster_data_generation", async () => {
      return await generateClusterData(clusterId, env);
    }, {
      cluster_id: clusterId
    });

    // Also generate universal text content to populate the Text tab
    const universal_content = await timer.timeStep("universal_content_generation", async () => {
      try {
        const { universalContent } = await generateCombinedContent(clusterId, 'radial_mindmap', env);
        return universalContent || '';
      } catch (e) {
        console.warn(`⚠️ [${timer.getRequestId()}] Universal content generation failed for cluster:`, e);
        return '';
      }
    }, {
      cluster_id: clusterId,
      content_type: 'radial_mindmap'
    });

    timer.logPerformanceReport();
    console.log(`✅ [${timer.getRequestId()}] Cluster generation completed successfully`);

    return json({
      success: true,
      cluster,
      universal_content,
      timing: {
        request_id: timer.getRequestId(),
        total_time: timer.getTotalTime(),
        steps: timer.getTimings().filter(t => t.duration > 0)
      }
    }, 200);
  } catch (error) {
    timer.markEnd("request_validation", { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
    timer.logPerformanceReport();
    
    console.error(`❌ [${timer.getRequestId()}] Cluster handler error:`, error);
    return json({
      success: false,
      detail: `Error generating cluster data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error_type: 'server_error',
      timing: {
        request_id: timer.getRequestId(),
        total_time: timer.getTotalTime(),
        steps: timer.getTimings().filter(t => t.duration > 0)
      }
    }, 500);
  }
}
