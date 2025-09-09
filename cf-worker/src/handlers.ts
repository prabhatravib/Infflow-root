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
