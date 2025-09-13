import { json, sanitizeMermaid } from "./utils";
import { processDiagramPipeline, generateDeepDiveResponse } from "./diagram";
import { EnvLike } from "./openai";
import { createTimer } from "./timing";

type DescribeRequest = { query: string };
type DiagramResponse = {
  success: true;
  query: string;
  description: string;
  content: string;
  universal_content: string;
  diagram_type: "flowchart" | "radial_mindmap" | "sequence_comparison";
  diagram: string;
  render_type: "html";
  rendered_content: string;
  cluster_data?: any;
};

type DeepDiveRequest = { selected_text: string; question: string; original_query?: string };

type ClusterRequest = { clusterId: string };
type ClusterResponse = {
  success: true;
  cluster: {
    id: string;
    label: string;
    weight?: number;
    items?: { id: string; url?: string; title?: string; score?: number }[];
    children?: any[];
  };
};

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
      console.log(`🔍 [${timer.getRequestId()}] Preparing response with cluster_data:`, !!result.cluster_data);
      if (result.cluster_data) {
        console.log(`🔍 [${timer.getRequestId()}] Cluster data preview:`, JSON.stringify(result.cluster_data, null, 2).substring(0, 200));
      }
      
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
        cluster_data: result.cluster_data
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

export async function clusterHandler(body: ClusterRequest, env: EnvLike): Promise<Response> {
  const clusterId = (body?.clusterId || "").trim();
  
  if (!clusterId) {
    return json({ 
      success: false, 
      detail: "clusterId is required", 
      error_type: "validation_error" 
    }, 400);
  }

  try {
    console.log(`Cluster request - ID: ${clusterId}`);
    
    // TODO: Implement actual cluster data generation based on clusterId
    // For now, generate sample cluster data based on the ID
    const cluster = await generateClusterData(clusterId, env);
    
    return json({ 
      success: true, 
      cluster: cluster 
    }, 200);
    
  } catch (error) {
    console.error("Cluster handler error:", error);
    return json({ 
      success: false, 
      detail: `Error generating cluster data: ${error instanceof Error ? error.message : 'Unknown error'}`, 
      error_type: "internal_error" 
    }, 500);
  }
}

// Helper function to generate cluster data
async function generateClusterData(clusterId: string, env: EnvLike): Promise<ClusterResponse['cluster']> {
  // This is where you'd implement the actual cluster generation logic
  // For now, return sample data that demonstrates the structure
  
  const baseCluster = {
    id: clusterId,
    label: `Cluster ${clusterId}`,
    weight: Math.floor(Math.random() * 10) + 1,
    items: [
      { id: `${clusterId}-item-1`, title: `Item 1 in ${clusterId}`, url: 'https://example.com/1', score: 0.9 },
      { id: `${clusterId}-item-2`, title: `Item 2 in ${clusterId}`, url: 'https://example.com/2', score: 0.8 },
      { id: `${clusterId}-item-3`, title: `Item 3 in ${clusterId}`, url: 'https://example.com/3', score: 0.7 },
    ],
    children: [
      {
        id: `${clusterId}-child-1`,
        label: `Sub-cluster 1`,
        weight: 3,
        items: [
          { id: `${clusterId}-child-1-1`, title: `Child item 1`, url: 'https://example.com/child1', score: 0.85 },
          { id: `${clusterId}-child-1-2`, title: `Child item 2`, url: 'https://example.com/child2', score: 0.75 },
        ]
      },
      {
        id: `${clusterId}-child-2`,
        label: `Sub-cluster 2`,
        weight: 2,
        items: [
          { id: `${clusterId}-child-2-1`, title: `Another child item`, url: 'https://example.com/child3', score: 0.65 },
        ]
      }
    ]
  };

  return baseCluster;
}
