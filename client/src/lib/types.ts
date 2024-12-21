import { z } from 'zod';

export type ToolType = 'function';

export interface Parameter {
  type: string;
  description?: string;
  required?: boolean;
}

export interface WebhookConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  headers: Record<string, string>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  type: ToolType;
  function: {
    name: string;
    description: string;
    parameters: {
      type: string;
      properties: Record<string, {
        type: string;
        description?: string;
        enum?: string[];
      }>;
      required?: string[];
      additionalProperties?: boolean;
    };
  };
}

export interface Tool {
  id: number;
  name: string;
  description: string;
  type: ToolType;
  config: WebhookConfig | Record<string, never>;
  inputSchema: {
    type: string;
    properties: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
    }>;
    required?: string[];
    additionalProperties?: boolean;
  };
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