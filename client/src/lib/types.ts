import { z } from 'zod';

export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export type ToolType = 'function';

export interface Tool {
  name: string;
  description: string;
  type: ToolType;
  config: Record<string, unknown>;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required: string[];
    additionalProperties: boolean;
  };
}

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
  id: string;
  name: string;
  status: ToolCall['status'];
  arguments: string;
}

export interface StreamChatOptions {
  onStart?: () => void;
  onFinish?: () => void;
  onError?: (error: Error) => void;
  onPartialMessage?: (message: Message) => void;
  onFunctionCall?: (functionCall: { name: string; arguments: string }) => void;
  onMessage?: (message: Message) => void;
}

export interface ToolCall {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
  status: 'pending' | 'executing' | 'completed' | 'failed';
}