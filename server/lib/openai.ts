import OpenAI from "openai";
import type { Tool } from "../../client/src/lib/types";
import { Logger } from './logger';

// Initialize OpenAI with credentials from environment
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const logger = new Logger({ prefix: '[OpenAI] ' });

export interface OpenAIResult {
  messages: any[];
}

export async function sendChatMessage(messages: any[], tools: Tool[]): Promise<OpenAIResult> {
  console.log('\n🤖 OpenAI Service Start ----------------');
  console.log('📤 Sending to OpenAI:', {
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    toolCount: tools.length
  });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      tools: tools.map(tool => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema
        }
      })),
      tool_choice: "auto",
      stream: false
    });

    console.log('📥 OpenAI Raw Response:', {
      content: response.choices[0].message.content,
      toolCalls: response.choices[0].message.tool_calls,
      usage: response.usage
    });

    const reply = response.choices[0].message;
    console.log('🤖 OpenAI Service End ----------------\n');

    // Format the message based on whether it's a tool call or regular message
    if (reply.tool_calls) {
      // Only include the text content in the content array
      const assistantMessage = {
        role: "assistant",
        content: reply.content || "",
        tool_calls: reply.tool_calls
      };

      return {
        messages: [...messages, assistantMessage]
      };
    }

    // For regular messages without tool calls
    return {
      messages: [...messages, {
        role: "assistant",
        content: reply.content
      }]
    };
  } catch (error: any) {
    logger.error('OpenAI Error:', error);
    throw error;
  } finally {
    logger.groupEnd();
  }
}