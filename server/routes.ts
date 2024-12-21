import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { tools, toolExecutions } from "@db/schema";
import { executeBigQueryQuery } from "./lib/bigquery";
import { sendChatMessage } from "./lib/openai";
import { eq } from "drizzle-orm";
import type { Tool, ToolType } from "../client/src/lib/types";

async function executeToolWithOpenAI(toolDef: { name: string; description: string; type: ToolType; function: { name: string; description: string; parameters: any; }; }, input: any): Promise<any> {
  try {
    switch (toolDef.name) {
      case 'bigquery':
        if (!input?.query) {
          throw new Error('Query is required for BigQuery tool');
        }
        const result = await executeBigQueryQuery(input.query);
        return result.rows;
      default:
        throw new Error(`Unknown tool: ${toolDef.name}`);
    }
  } catch (error: any) {
    console.error('Tool execution error:', error);
    throw error;
  }
}

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Setup default tools endpoint
  app.get("/api/setup-default-tools", async (req, res) => {
    try {
      // Check if BigQuery tool exists
      const existingTools = await db.select().from(tools).where(eq(tools.name, 'bigquery'));

      if (existingTools.length === 0) {
        // Create BigQuery tool if it doesn't exist
        const [tool] = await db.insert(tools).values({
          name: "bigquery",
          description: "Execute BigQuery SQL queries to analyze data. Use this tool when you need to query data from BigQuery tables.",
          type: "function" as ToolType,
          config: {},
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The SQL query to execute"
              }
            },
            required: ["query"],
            additionalProperties: false
          }
        }).returning();

        res.json({ message: "Default tools created", tool });
      } else {
        res.json({ message: "Default tools already exist" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Unknown error occurred' });
    }
  });

  // List tools
  app.get("/api/tools", async (req, res) => {
    try {
      const allTools = await db.select().from(tools);
      res.json(allTools);
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Unknown error occurred' });
    }
  });

  // Chat endpoint with SSE for real-time updates
  app.post("/api/chat", async (req, res) => {
    // Set headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      const availableTools = await db.select().from(tools);
      let messages = req.body.messages || [];

      if (!Array.isArray(messages)) {
        messages = [{ role: "user", content: req.body.message }];
      }

      // Get initial response from OpenAI
      const response = await sendChatMessage(messages, availableTools as Tool[]);
      const lastMessage = response.messages[response.messages.length - 1];

      // Send initial assistant message
      res.write(`data: ${JSON.stringify({
        type: "assistant_message",
        message: lastMessage
      })}\n\n`);

      // Handle tool calls
      if (lastMessage.tool_calls) {
        const toolCalls = lastMessage.tool_calls;
        const tool = availableTools.find(t => t.name === toolCalls[0].function.name);

        if (tool) {
          try {
            // Send tool call start event
            res.write(`data: ${JSON.stringify({
              type: "tool_call_start",
              tool_call: toolCalls[0]
            })}\n\n`);

            const result = await executeToolWithOpenAI(
              {
                name: tool.name,
                description: tool.description,
                type: tool.type as ToolType,
                function: {
                  name: tool.name,
                  description: tool.description,
                  parameters: tool.inputSchema
                }
              },
              JSON.parse(toolCalls[0].function.arguments)
            );

            // Store execution in database
            await db.insert(toolExecutions).values({
              toolId: tool.id,
              input: JSON.parse(toolCalls[0].function.arguments),
              output: result,
            });

            // Send tool call result event
            res.write(`data: ${JSON.stringify({
              type: "tool_call_result",
              tool_call_id: toolCalls[0].id,
              result
            })}\n\n`);

            // Continue conversation with tool result
            const updatedMessages = [
              ...messages, 
              lastMessage,
              {
                role: "tool",
                content: JSON.stringify(result),
                tool_call_id: toolCalls[0].id
              }
            ];

            const finalResponse = await sendChatMessage(updatedMessages, availableTools as Tool[]);

            // Send final response
            res.write(`data: ${JSON.stringify({
              type: "final_response",
              messages: finalResponse.messages
            })}\n\n`);

            res.end();
          } catch (error: any) {
            console.error('Tool execution error:', error);
            res.write(`data: ${JSON.stringify({
              type: "error",
              error: error.message || 'Unknown error occurred'
            })}\n\n`);
            res.end();
          }
        }
      } else {
        // For messages without tool calls, just end the stream
        res.end();
      }

    } catch (error: any) {
      console.error("Chat error:", error);
      res.write(`data: ${JSON.stringify({
        type: "error",
        error: error.message || 'Unknown error occurred'
      })}\n\n`);
      res.end();
    }
  });

  return httpServer;
}