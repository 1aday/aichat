import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { tools, toolExecutions } from "@db/schema";
import { executeBigQueryQuery } from "./lib/bigquery";
import { sendChatMessage } from "./lib/openai";
import { eq } from "drizzle-orm";
import type { Tool, ToolType } from "../client/src/lib/types";
import { z } from "zod";

type StreamChunk = {
  choices?: [{
    delta?: {
      content?: string;
      function_call?: {
        name?: string;
        arguments?: string;
      };
    };
  }];
};

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

  // Chat endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, availableTools } = req.body;
      
      const response = await sendChatMessage(messages, availableTools);
      const stream = response.body;

      if (!stream) {
        return res.status(500).json({ error: 'No stream available' });
      }

      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const reader = stream.getReader();
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      let buffer = '';
      let functionCallBuffer = {
        name: '',
        arguments: ''
      };

      const stream2 = new ReadableStream({
        async start(controller) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              
              if (done) {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                break;
              }

              // Append new chunk to buffer and split by newlines
              buffer += decoder.decode(value);
              const lines = buffer.split('\n');
              
              // Process all complete lines
              for (let i = 0; i < lines.length - 1; i++) {
                const line = lines[i].trim();
                if (!line || line === 'data: [DONE]') continue;

                try {
                  // Remove 'data: ' prefix if it exists
                  const jsonStr = line.replace(/^data: /, '');
                  const parsed = JSON.parse(jsonStr) as StreamChunk;

                  if (parsed.choices?.[0]?.delta?.function_call) {
                    const { name, arguments: args } = parsed.choices[0].delta.function_call;
                    
                    // Accumulate function call parts
                    if (name) functionCallBuffer.name = name;
                    if (args) functionCallBuffer.arguments += args;

                    // If we have a complete function call
                    if (functionCallBuffer.name && functionCallBuffer.arguments) {
                      try {
                        // Try to parse the complete arguments
                        const parsedArgs = JSON.parse(functionCallBuffer.arguments);
                        
                        // Find the tool definition
                        const tool = availableTools.find(t => t.name === functionCallBuffer.name);
                        if (tool) {
                          // Execute the tool
                          const result = await executeToolWithOpenAI(tool, parsedArgs);
                          
                          // Send tool result to client
                          const toolEvent = {
                            type: 'tool_result',
                            name: functionCallBuffer.name,
                            result
                          };
                          controller.enqueue(encoder.encode(`data: ${JSON.stringify(toolEvent)}\n\n`));
                          
                          // Reset buffer
                          functionCallBuffer = { name: '', arguments: '' };
                        }
                      } catch (e) {
                        // If JSON.parse fails, we probably don't have complete arguments yet
                        continue;
                      }
                    }

                    // Send function call progress
                    const event = {
                      type: 'function_call',
                      function: parsed.choices[0].delta.function_call
                    };
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
                  } 
                  else if (parsed.choices?.[0]?.delta?.content) {
                    const event = {
                      type: 'content',
                      content: parsed.choices[0].delta.content
                    };
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
                  }
                } catch (e) {
                  console.warn('Error parsing chunk:', e);
                  // Continue to next line if this one fails
                  continue;
                }
              }
              
              // Keep the last incomplete line in the buffer
              buffer = lines[lines.length - 1];
            }
          } catch (error) {
            console.error('Stream processing error:', error);
            controller.error(error);
          } finally {
            controller.close();
          }
        }
      });

      stream2.pipeTo(new WritableStream({
        write(chunk) {
          res.write(chunk);
        },
        close() {
          res.end();
        },
        abort(err) {
          console.error('Stream error:', err);
          res.end();
        }
      }));

    } catch (error: unknown) {
      console.error('Chat error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: errorMessage });
    }
  });

  return httpServer;
}