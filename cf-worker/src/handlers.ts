import { json, sanitizeMermaid } from "./utils";
import { processDiagramPipeline, generateDeepDiveResponse } from "./diagram";
import { EnvLike } from "./openai";

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

  try {
    console.log(`Processing describe request: ${query.substring(0, 50)}...`);
    
    // Use the sophisticated pipeline from pitext_desktop
    const result = await processDiagramPipeline(query, env);
    
    // Sanitize the diagram code
    const sanitizedDiagram = sanitizeMermaid(result.diagram);
    
    console.log(`Generated ${result.diagram_type} diagram for query: ${query.substring(0, 50)}`);
    
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
    
    return json(response, 200);
    
  } catch (error) {
    console.error("Describe handler error:", error);
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
