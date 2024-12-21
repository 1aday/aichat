export interface ToolDefinition {
  name: string;
  description: string;
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
