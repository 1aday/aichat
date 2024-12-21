import type { ToolDefinition, ToolResponse, ToolExecutionResponse } from './types';
import { apiLogger as logger } from './logger';

export async function createTool(tool: ToolDefinition): Promise<ToolResponse> {
  logger.debug('Creating tool:', tool);
  
  try {
    const res = await fetch('/api/tools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tool),
    });

    if (!res.ok) {
      const error = await res.text();
      logger.error('Failed to create tool:', error);
      throw new Error(error);
    }

    const data = await res.json();
    logger.debug('Tool created successfully:', data);
    return data;
  } catch (error) {
    logger.error('Tool creation error:', error);
    throw error;
  }
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
  logger.group('listTools');
  try {
    logger.debug('Fetching tools');
    const res = await fetch('/api/tools');
    
    if (!res.ok) {
      const error = await res.text();
      logger.error('Failed to fetch tools', { status: res.status, error });
      throw new Error(error);
    }

    const data = await res.json();
    logger.debug('Tools fetched successfully', { toolCount: data.length });
    return data;
  } catch (error) {
    logger.error('List tools error', { error });
    throw error;
  } finally {
    logger.groupEnd();
  }
}
