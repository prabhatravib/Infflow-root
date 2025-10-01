/**
 * Cluster data generation logic for FoamTree topic maps.
 * Handles hierarchical cluster data generation for visualization.
 */

import { callOpenAI, callOpenAIOptimized, selectOptimalModel, EnvLike } from './openai';
import { clusterPrompt } from './prompts/cluster_prompt';
import { createTimer } from './timing';

/**
 * Generates hierarchical cluster data (FoamTree topic map) for a given query.
 */
export async function generateClusterData(
  query: string,
  env: EnvLike
): Promise<any> {
  const timer = createTimer();
  console.log(`🟡 [${timer.getRequestId()}] Starting OPTIMIZED cluster generation...`);

  try {
    // Select optimal model for cluster generation
    const optimalModel = selectOptimalModel(query, env);
    console.log(`🎯 [${timer.getRequestId()}] Selected model for cluster: ${optimalModel}`);

    // Optimized token limit - reduced from 2000 to 1500 for faster processing
    const optimizedMaxTokens = 1500;

    const response = await timer.timeStep(
      'optimized_cluster_generation_llm_call',
      () =>
        callOpenAIOptimized(
          env,
          clusterPrompt,
          query,
          optimalModel,
          optimizedMaxTokens,
          0.7,
          {
            usePriority: true,        // Faster queue processing
            useCache: true,          // Cache reusable prompts
            useStructured: true      // Ensure JSON response
          }
        ),
      {
        query_length: query.length,
        model: optimalModel,
        max_tokens: optimizedMaxTokens,
        optimizations: "priority,cache,structured,early_stop"
      }
    );

    let text = (response || '').trim();
    if (!text) throw new Error('Empty cluster JSON');

    // Try to strip code fences if present
    if (text.startsWith('```')) {
      text = text.replace(/^```[a-zA-Z]*\n?/, '').replace(/```\s*$/, '').trim();
    }

    // If still not parseable, try to extract the first top-level JSON object
    let clusterData: any;
    try {
      clusterData = JSON.parse(text);
    } catch (_e) {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        const candidate = text.slice(start, end + 1);
        clusterData = JSON.parse(candidate);
      } else {
        throw _e;
      }
    }
    console.log(`✅ [${timer.getRequestId()}] Optimized cluster generation successful.`);
    return clusterData;
  } catch (error) {
    console.error(`❌ [${timer.getRequestId()}] Optimized cluster generation failed:`, error);
    throw error;
  }
}
