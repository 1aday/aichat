import { useState, FormEvent, useEffect, useRef } from 'react';
import { useStreamChat } from '../hooks/useStreamChat';
import type { Message, Tool, ToolCall } from '../lib/types';

const STORAGE_KEY = 'chat_messages';

export function Chat({ tools }: { tools: Tool[] }) {
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { 
    streamChat, 
    isLoading,
    error,
    currentToolExecution
  } = useStreamChat({
    onStart: () => {
      // Optional: Add any logic needed when chat starts
    },
    onPartialMessage: (message: Message) => {
      // Update the last message with the partial content
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage?.role === 'assistant') {
          newMessages[newMessages.length - 1] = message;
        } else {
          newMessages.push(message);
        }
        return newMessages;
      });
    },
    onMessage: (message: Message) => {
      // Handle complete messages
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage?.role === 'assistant') {
          newMessages[newMessages.length - 1] = message;
        } else {
          newMessages.push(message);
        }
        return newMessages;
      });
    },
    onError: (error: Error) => {
      console.error('Chat error:', error);
    }
  });

  // Save messages to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentToolExecution]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim()
    };
    
    setInput('');
    setMessages(prev => [...prev, userMessage]);
    
    try {
      await streamChat([...messages, userMessage], tools);
    } catch (error) {
      console.error('Chat error:', error);
    }
  };

  const renderToolProgress = (toolCall: ToolCall) => {
    const getStatusColor = (status: ToolCall['status']) => {
      switch (status) {
        case 'executing': return 'text-yellow-500';
        case 'completed': return 'text-green-500';
        case 'failed': return 'text-red-500';
        default: return 'text-blue-500';
      }
    };

    return (
      <div className="relative mt-4 mb-2">
        <div className="absolute left-[11px] top-0 h-full w-0.5 bg-gray-200 dark:bg-gray-700" />
        <div className="relative flex items-start gap-3">
          <div className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full ${
            toolCall.status === 'completed' ? 'bg-green-500' :
            toolCall.status === 'failed' ? 'bg-red-500' :
            'bg-primary'
          } shadow-sm`}>
            {/* Add icons here if needed */}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Using Tool: {toolCall.function.name}
            </p>
            <p className={`mt-1 text-xs ${getStatusColor(toolCall.status)}`}>
              {toolCall.status === 'executing' ? 'Executing...' :
               toolCall.status === 'completed' ? 'Completed' :
               toolCall.status === 'failed' ? 'Failed' :
               'Preparing...'}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h1>AI Chat</h1>
        <button onClick={() => {
          setMessages([]);
          localStorage.removeItem(STORAGE_KEY);
        }} className="clear-chat">
          Clear Chat
        </button>
      </div>

      <div className="messages-container">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.role} ${isLoading ? 'streaming' : ''}`}>
            {message.content}
            {message.tool_calls?.map((toolCall) => (
              <div key={toolCall.id} className="tool-call">
                {renderToolProgress(toolCall)}
              </div>
            ))}
          </div>
        ))}

        {currentToolExecution && (
          <div className="tool-execution">
            {renderToolProgress({
              id: currentToolExecution.id,
              function: {
                name: currentToolExecution.name,
                arguments: currentToolExecution.arguments
              },
              status: currentToolExecution.status
            })}
          </div>
        )}

        {error && (
          <div className="error-message">
            Error: {error.message}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="chat-input-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={isLoading}
          className="chat-input"
        />
        <button 
          type="submit" 
          disabled={isLoading || !input.trim()}
          className="chat-submit"
        >
          Send
        </button>
      </form>
    </div>
  );
} 