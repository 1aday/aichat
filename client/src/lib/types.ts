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
  config: WebhookConfig;
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

export interface ToolResponse {
  id: number;
  name: string;
  description: string;
  type: ToolType;
  config: WebhookConfig;
  input_schema: ToolDefinition['input_schema'];
  created_at: string;
  updated_at: string;
}

export interface ToolExecutionResponse {
  id: number;
  tool_id: number;
  input: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  created_at: string;
}