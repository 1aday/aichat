import type { Express } from "express";
import { createServer } from "http";
import { db } from "@db";
import { tools, toolExecutions } from "@db/schema";
import { executeToolWithClaude } from "./lib/claude";
import { eq } from "drizzle-orm";
import type { ToolDefinition } from "../client/src/lib/types";
import { Anthropic } from "@anthropic-ai/sdk";

// Create Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export function registerRoutes(app: Express) {
  const httpServer = createServer(app);

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
        input_schema: tool.inputSchema as ToolDefinition['input_schema']
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
          ...tool.inputSchema,
          type: 'object'
        }
      }));

      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        temperature: 0.7,
        tools: toolDefinitions,
        messages: [{
          role: "user",
          content: req.body.message
        }],
      });

      // If Claude wants to use a tool
      if (response.content[0].type === 'tool_calls') {
        const toolCall = response.content[0].tool_calls[0];
        const tool = availableTools.find(t => t.name === toolCall.name);

        if (tool) {
          const result = await executeToolWithClaude(
            {
              name: tool.name,
              description: tool.description,
              input_schema: tool.inputSchema as ToolDefinition['input_schema']
            },
            toolCall.parameters,
            "Execute this tool with the provided parameters"
          );

          // Log the execution
          await db.insert(toolExecutions).values({
            toolId: tool.id,
            input: toolCall.parameters,
            output: result,
          });

          // Send the result back to Claude
          const finalResponse = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 1024,
            messages: [
              { role: "user", content: req.body.message },
              { 
                role: "assistant", 
                content: [{ type: "tool_calls", tool_calls: [toolCall] }]
              },
              { 
                role: "user", 
                content: [{ 
                  type: "tool_result",
                  tool_name: tool.name,
                  result: JSON.stringify(result)
                }]
              }
            ],
          });

          res.json({ response: finalResponse.content[0].text });
        } else {
          res.json({ response: "I tried to use a tool that wasn't available." });
        }
      } else {
        // Normal response without tool use
        res.json({ response: response.content[0].text });
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      res.status(500).json({ error: error?.message || 'Unknown error occurred' });
    }
  });

  return httpServer;
}