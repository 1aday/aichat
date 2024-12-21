import type { Express } from "express";
import { createServer } from "http";
import { db } from "@db";
import { tools, toolExecutions } from "@db/schema";
import { executeBigQueryQuery } from "./lib/bigquery";
import { eq } from "drizzle-orm";
import type { ToolDefinition, Tool, ToolType } from "../client/src/lib/types";
import { Anthropic } from "@anthropic-ai/sdk";

// Create Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function executeToolWithClaude(toolDef: ToolDefinition, input: any): Promise<any> {
  try {
    switch (toolDef.name) {
      case 'bigquery':
        if (!input?.query) {
          throw new Error('Query is required for BigQuery tool');
        }
        const result = await executeBigQueryQuery(input.query);
        return result.rows; // Just return the rows directly
      default:
        throw new Error(`Unknown tool: ${toolDef.name}`);
    }
  } catch (error: any) {
    console.error('Tool execution error:', error);
    throw error;
  }
}

export function registerRoutes(app: Express) {
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
          type: "client" as ToolType,
          config: {},
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The SQL query to execute"
              }
            },
            required: ["query"]
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

  // Chat endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      const availableTools = await db.select().from(tools);
      const toolDefinitions = availableTools.map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema
      }));

      let messages = req.body.messages || [];
      if (!Array.isArray(messages)) {
        messages = [{ role: "user", content: req.body.message }];
      }

      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        messages,
        tools: toolDefinitions
      });

      // Handle tool calls
      if (response.stop_reason === 'tool_use' && response.content[response.content.length - 1].type === 'tool_use') {
        const toolUseBlock = response.content[response.content.length - 1];
        const tool = availableTools.find(t => t.name === toolUseBlock.name);

        if (tool) {
          try {
            const result = await executeToolWithClaude(
              {
                name: tool.name,
                description: tool.description,
                type: tool.type,
                config: tool.config,
                input_schema: tool.inputSchema
              },
              toolUseBlock.input
            );

            // Store execution in database
            await db.insert(toolExecutions).values({
              toolId: tool.id,
              input: toolUseBlock.input,
              output: result,
            });

            // Continue conversation with tool result
            const updatedMessages = [
              ...messages,
              { role: "assistant", content: response.content },
              {
                role: "user",
                content: [{
                  type: "tool_result",
                  tool_use_id: toolUseBlock.id,
                  content: JSON.stringify(result)
                }]
              }
            ];

            const finalResponse = await anthropic.messages.create({
              model: "claude-3-5-sonnet-20241022",
              max_tokens: 1024,
              messages: updatedMessages,
              tools: toolDefinitions
            });

            res.json({
              messages: [...updatedMessages, {
                role: "assistant",
                content: finalResponse.content
              }]
            });
            return;
          } catch (error: any) {
            console.error('Tool execution error:', error);
            // Pass the actual error message to the client
            if (error.errors && error.errors[0]) {
              res.status(500).json({ error: error.errors[0].message });
            } else {
              res.status(500).json({ error: error.message || 'Unknown error occurred' });
            }
            return;
          }
        }
      }

      // For regular responses without tool use
      res.json({
        messages: [...messages, {
          role: "assistant",
          content: response.content
        }]
      });

    } catch (error: any) {
      console.error("Chat error:", error);
      res.status(500).json({ error: error?.message || 'Unknown error occurred' });
    }
  });

  return httpServer;
}