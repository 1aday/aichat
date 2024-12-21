import OpenAI from "openai";
import type { Tool } from "../../client/src/lib/types";

// Initialize OpenAI with credentials from environment
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface OpenAIResult {
  messages: any[];
}

export async function sendChatMessage(messages: any[], tools: Tool[]): Promise<OpenAIResult> {
  try {
    // Convert tools to OpenAI function format
    const openAITools = tools.map(tool => ({
      type: "function" as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: "object",
          properties: tool.inputSchema.properties || {},
          required: tool.inputSchema.required || [],
          additionalProperties: false
        }
      },
      strict: true
    }));

    // Make OpenAI API call
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      tools: openAITools,
      stream: false
    });

    const reply = response.choices[0].message;

    // If there are tool calls, include them in the response
    if (reply.tool_calls) {
      return {
        messages: [...messages, {
          role: "assistant",
          content: reply.content,
          tool_calls: reply.tool_calls
        }]
      };
    }

    // Otherwise just return regular message
    return {
      messages: [...messages, {
        role: "assistant",
        content: reply.content
      }]
    };

  } catch (error: any) {
    console.error('OpenAI Error:', error);
    throw error;
  }
}