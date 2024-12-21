import { z } from 'zod';

export type ToolType = 'webhook' | 'client';

export interface Parameter {
  name: string;
  type: string;
  description?: string;
  required?: boolean;
}

export interface WebhookConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  headers: Record<string, string>;
  pathParameters: Parameter[];
  queryParameters: Parameter[];
  bodyParameters: Parameter[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  type: ToolType;
  config: WebhookConfig | Record<string, never>;
  input_schema: {
    type: string;
    properties: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}

export interface Tool {
  id: number;
  name: string;
  description: string;
  type: ToolType;
  config: WebhookConfig | Record<string, never>;
  inputSchema: ToolDefinition['input_schema'];
  createdAt: string;
  updatedAt: string;
}

export interface ToolExecution {
  id: number;
  toolId: number;
  input: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  createdAt: string;
}