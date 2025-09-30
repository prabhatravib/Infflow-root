/**
 * Cluster data generation logic for FoamTree topic maps.
 * Handles hierarchical cluster data generation for visualization.
 */

import { callOpenAI, EnvLike } from './openai';
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
  console.log(`🟡 [${timer.getRequestId()}] Starting cluster generation...`);

  try {
    const response = await timer.timeStep(
      'cluster_generation_llm_call',
      () =>
        callOpenAI(
          env,
          clusterPrompt,
          query,
          env.OPENAI_MODEL || 'gpt-4o-mini',
          2000
        ),
      {
        query_length: query.length,
        model: env.OPENAI_MODEL || 'gpt-4o-mini',
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
    console.log(`✅ [${timer.getRequestId()}] Cluster generation successful.`);
    return clusterData;
  } catch (error) {
    console.error(`❌ [${timer.getRequestId()}] Cluster generation failed:`, error);
    throw error;
  }
}
