import type { ToolDefinition, ToolResponse, ToolExecutionResponse } from './types';

export async function createTool(tool: ToolDefinition): Promise<ToolResponse> {
  const res = await fetch('/api/tools', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tool),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
}

export async function executeTool(toolId: number, input: Record<string, any>): Promise<ToolExecutionResponse> {
  const res = await fetch(`/api/tools/${toolId}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input }),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
}

export async function listTools(): Promise<ToolResponse[]> {
  const res = await fetch('/api/tools');
  
  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
}
