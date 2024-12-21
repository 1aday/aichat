import type { Express } from "express";
import { createServer } from "http";
import { db } from "@db";
import { tools, toolExecutions } from "@db/schema";
import { executeToolWithClaude } from "./lib/claude";
import { eq } from "drizzle-orm";
import type { ToolDefinition } from "../client/src/lib/types";

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

  return httpServer;
}