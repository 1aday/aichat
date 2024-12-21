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
      }
    }));

    // Make OpenAI API call
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      tools: openAITools,
      tool_choice: "auto",
      stream: false
    });

    const reply = response.choices[0].message;

    // If there are tool calls, format them for the frontend
    if (reply.tool_calls) {
      const formattedContent = [
        { type: "text", text: reply.content || "" }
      ];

      // Add tool call information
      reply.tool_calls.forEach((toolCall: any) => {
        formattedContent.push({
          type: "tool_call",
          tool: toolCall.function.name,
          input: JSON.parse(toolCall.function.arguments)
        });
      });

      return {
        messages: [...messages, {
          role: "assistant",
          content: formattedContent,
          tool_calls: reply.tool_calls
        }]
      };
    }

    // For regular messages, just return the content
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