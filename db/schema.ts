import { pgTable, text, serial, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const tools = pgTable("tools", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull(),
  inputSchema: jsonb("input_schema").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const toolExecutions = pgTable("tool_executions", {
  id: serial("id").primaryKey(),
  toolId: serial("tool_id").references(() => tools.id),
  input: jsonb("input").notNull(),
  output: jsonb("output"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertToolSchema = createInsertSchema(tools);
export const selectToolSchema = createSelectSchema(tools);

export const insertToolExecutionSchema = createInsertSchema(toolExecutions);
export const selectToolExecutionSchema = createSelectSchema(toolExecutions);

export type Tool = typeof tools.$inferSelect;
export type NewTool = typeof tools.$inferInsert;
export type ToolExecution = typeof toolExecutions.$inferSelect;
export type NewToolExecution = typeof toolExecutions.$inferInsert;
