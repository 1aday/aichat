import { useState, useCallback } from 'react';
import type { Message, Tool, ToolExecution } from '../lib/types';

interface StreamChatOptions {
  onStart?: () => void;
  onFinish?: () => void;
  onError?: (error: Error) => void;
  onPartialMessage?: (message: Message) => void;
  onFunctionCall?: (functionCall: { name: string; arguments: string }) => void;
  onMessage?: (message: Message) => void;
  onToolExecution?: (execution: ToolExecution) => void;
}

export function useStreamChat(options: StreamChatOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentToolExecution, setCurrentToolExecution] = useState<ToolExecution | null>(null);

  const streamChat = useCallback(async (messages: Message[], availableTools: Tool[]) => {
    setIsLoading(true);
    setError(null);
    setCurrentToolExecution(null);
    options.onStart?.();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages, availableTools }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No reader available');
      }

      let currentMessage: Message = {
        role: 'assistant',
        content: '',
        tool_calls: []
      };

      let isFirstChunk = true;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            if (data === '[DONE]') {
              continue;
            }

            try {
              const parsed = JSON.parse(data);

              if (isFirstChunk && parsed.type === 'content') {
                isFirstChunk = false;
                setIsLoading(false);
              }

              if (parsed.type === 'content' && parsed.content) {
                currentMessage.content += parsed.content;
                options.onPartialMessage?.(currentMessage);
              } 
              else if (parsed.type === 'tool_call') {
                if (!currentMessage.tool_calls) {
                  currentMessage.tool_calls = [];
                }
                
                const toolCall = {
                  id: parsed.tool_call.id,
                  function: {
                    name: parsed.tool_call.function?.name || '',
                    arguments: parsed.tool_call.function?.arguments || ''
                  },
                  status: 'pending' as const
                };
                
                currentMessage.tool_calls.push(toolCall);
                options.onPartialMessage?.(currentMessage);
                
                setCurrentToolExecution({
                  id: toolCall.id,
                  name: toolCall.function.name,
                  status: 'pending',
                  arguments: toolCall.function.arguments
                });
                
                options.onToolExecution?.({
                  id: toolCall.id,
                  name: toolCall.function.name,
                  status: 'pending',
                  arguments: toolCall.function.arguments
                });
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }

      if (currentMessage.content || currentMessage.tool_calls?.length > 0) {
        options.onMessage?.(currentMessage);
      }
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error);
      options.onError?.(error);
    } finally {
      setIsLoading(false);
      setCurrentToolExecution(null);
      options.onFinish?.();
    }
  }, [options]);

  return {
    streamChat,
    isLoading,
    error,
    currentToolExecution
  };
} 