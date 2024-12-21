import type { Express } from "express";
import { createServer } from "http";
import { db } from "@db";
import { tools, toolExecutions } from "@db/schema";
import { executeToolWithClaude } from "./lib/claude";
import { eq } from "drizzle-orm";
import type { ToolDefinition, Tool, ToolType } from "../client/src/lib/types";
import { Anthropic } from "@anthropic-ai/sdk";

// Create Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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
                description: "The SQL query to execute on BigQuery"
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

  // Create tool
  app.post("/api/tools", async (req, res) => {
    try {
      const [tool] = await db.insert(tools).values(req.body).returning();
      res.json(tool);
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

  // Execute tool
  app.post("/api/tools/:id/execute", async (req, res) => {
    try {
      const toolId = parseInt(req.params.id);
      const [tool] = await db.select().from(tools).where(eq(tools.id, toolId));

      if (!tool) {
        return res.status(404).json({ error: "Tool not found" });
      }

      const toolDefinition: ToolDefinition = {
        name: tool.name,
        description: tool.description,
        type: tool.type as ToolType,
        config: tool.config as ToolDefinition['config'],
        input_schema: tool.inputSchema
      };

      const result = await executeToolWithClaude(
        toolDefinition,
        req.body.input,
        req.body.prompt || "Execute this tool with the provided input"
      );

      const [execution] = await db.insert(toolExecutions).values({
        toolId,
        input: req.body.input,
        output: result,
      }).returning();

      res.json(execution);
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Unknown error occurred' });
    }
  });

  // Chat endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      // Get available tools
      const availableTools = await db.select().from(tools);

      const toolDefinitions = availableTools.map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: {
          type: "object",
          properties: tool.inputSchema.properties,
          required: tool.inputSchema.required || []
        }
      }));

      let messages = req.body.messages || [];
      if (!Array.isArray(messages)) {
        messages = [{ role: "user", content: req.body.message }];
      }

      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        tools: toolDefinitions,
        messages: messages,
      });

      // Check if Claude wants to use a tool
      if (response.stop_reason === 'tool_use') {
        // Get the tool use request from the last content block
        const toolUseBlock = response.content[response.content.length - 1];

        if (toolUseBlock.type === 'tool_use') {
          // Find the corresponding tool
          const tool = availableTools.find(t => t.name === toolUseBlock.name);

          if (tool) {
            // Execute the tool
            const result = await executeToolWithClaude(
              {
                name: tool.name,
                description: tool.description,
                type: tool.type as ToolType,
                config: tool.config,
                input_schema: tool.inputSchema
              },
              toolUseBlock.input,
              "Execute this tool with the provided input"
            );

            // Log the execution
            await db.insert(toolExecutions).values({
              toolId: tool.id,
              input: toolUseBlock.input,
              output: result,
            });

            // Create a new message array including the tool result
            const updatedMessages = [
              ...messages,
              { role: "assistant", content: response.content },
              { 
                role: "user", 
                content: [
                  {
                    type: "tool_result",
                    tool_call_id: toolUseBlock.id,
                    content: JSON.stringify(result)
                  }
                ]
              }
            ];

            // Get final response from Claude with the tool result
            const finalResponse = await anthropic.messages.create({
              model: "claude-3-5-sonnet-20241022",
              max_tokens: 1024,
              messages: updatedMessages,
            });

            res.json({ 
              response: finalResponse.content[0].text,
              messages: updatedMessages
            });
            return;
          }
        }
      }

      // For regular responses without tool use
      const responseMessages = [
        ...messages,
        { role: "assistant", content: response.content }
      ];

      res.json({ 
        response: response.content[0].text,
        messages: responseMessages
      });

    } catch (error: any) {
      console.error("Chat error:", error);
      res.status(500).json({ error: error?.message || 'Unknown error occurred' });
    }
  });

  return httpServer;
}