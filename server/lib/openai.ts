import OpenAI from "openai";
import { OpenAIStream } from 'ai';
import type { Tool } from "../../client/src/lib/types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function sendChatMessage(messages: any[], tools: Tool[]): Promise<Response> {
  try {
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
      }
    }));

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages,
      tools: openAITools,
      tool_choice: "auto",
      stream: true
    });

    // Convert the response into a readable stream
    const stream = OpenAIStream(response);
    
    // Return a streaming response
    return new Response(stream);
  } catch (error: any) {
    console.error('OpenAI Error:', error);
    throw error;
  }
}