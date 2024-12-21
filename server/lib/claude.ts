import { Anthropic } from '@anthropic-ai/sdk';
import type { ToolDefinition } from '../../client/src/lib/types';
import { executeBigQueryQuery } from './bigquery';

// the newest Anthropic model is "claude-3-5-sonnet-20241022" which was released October 22, 2024
const MODEL = 'claude-3-5-sonnet-20241022';

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY environment variable is required');
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function executeToolWithClaude(
  tool: ToolDefinition,
  input: Record<string, any>,
  prompt: string
): Promise<any> {
  try {
    if (tool.type === 'client' && tool.name === 'bigquery') {
      // Execute BigQuery
      const result = await executeBigQueryQuery(input.query);
      return result;
    }

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      tools: [{
        ...tool,
        input_schema: {
          ...tool.input_schema,
          type: 'object'
        }
      }],
      messages: [{
        role: 'user',
        content: prompt
      }],
    });

    return response.content;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Claude API error: ${error.message}`);
    }
    throw new Error('An unknown error occurred while executing Claude API');
  }
}