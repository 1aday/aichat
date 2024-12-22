import { useState, useEffect, useCallback } from 'react';

function Chat({ onSubmit }) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentAction, setCurrentAction] = useState(null);

  const getActionMessage = (action) => {
    switch (action) {
      case 'thinking': return 'AI is thinking...';
      case 'calling_function': return 'Executing query...';
      case 'received_result': return 'Processing results...';
      case 'responding': return 'Generating response...';
      case 'error': return 'An error occurred';
      default: return 'Processing...';
    }
  };

  const handleStreamedResponse = useCallback((event) => {
    switch (event.type) {
      case 'content':
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage?.role === 'assistant' && !lastMessage.tool_calls) {
            // Append to existing assistant message
            return [...prev.slice(0, -1), {
              ...lastMessage,
              content: lastMessage.content + event.content
            }];
          }
          // Create new assistant message
          return [...prev, { role: 'assistant', content: event.content }];
        });
        break;

      case 'function_call':
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '',
          tool_calls: [{
            function: {
              name: event.function_name,
              arguments: event.arguments
            }
          }]
        }]);
        setCurrentAction('calling_function');
        break;

      case 'tool_result':
        setMessages(prev => [...prev, {
          role: 'tool',
          content: event.content
        }]);
        setCurrentAction('received_result');
        break;

      case 'done':
        setIsLoading(false);
        setCurrentAction(null);
        break;
    }
  }, []);

  const streamChat = useCallback(async (messages, availableTools) => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, availableTools })
    });

    if (!response.ok) {
      throw new Error('Network response not ok');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        handleStreamedResponse({ type: 'done' });
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            handleStreamedResponse({ type: 'done' });
            break;
          }
          try {
            const event = JSON.parse(jsonStr);
            handleStreamedResponse(event);
          } catch (err) {
            console.error('JSON parse error:', err);
          }
        }
      }
    }
  }, [handleStreamedResponse]);

  // Handle new message submission
  const handleSubmit = useCallback(async (userInput) => {
    setIsLoading(true);
    setCurrentAction('thinking');
    
    // Add user message to chat
    setMessages(prev => [...prev, {
      role: 'user',
      content: userInput
    }]);

    try {
      await streamChat([...messages, { role: 'user', content: userInput }]);
    } catch (error) {
      console.error('Chat error:', error);
      setCurrentAction('error');
    } finally {
      setIsLoading(false);
    }
  }, [messages, streamChat]);

  return (
    <div className="chat-container">
      {messages.map((message, index) => (
        <div key={index} className="message">
          {/* Regular message content */}
          <div className={`message-content ${message.role}`}>
            {message.content}
          </div>

          {/* Show tool calls */}
          {message.tool_calls && message.tool_calls.length > 0 && (
            <div className="function-call">
              <span className="function-label">Function Called:</span>
              {message.tool_calls.map((tool, toolIndex) => (
                <div key={toolIndex}>
                  <code>{tool.function.name}</code>
                  <pre>{JSON.stringify(tool.function.arguments, null, 2)}</pre>
                </div>
              ))}
            </div>
          )}

          {/* Show tool results */}
          {message.role === 'tool' && (
            <div className="function-result">
              <span className="function-label">Function Result:</span>
              <pre>{typeof message.content === 'string' 
                ? message.content 
                : JSON.stringify(message.content, null, 2)}</pre>
            </div>
          )}
        </div>
      ))}

      {/* Show current action */}
      {(isLoading || currentAction) && (
        <div className="message">
          <div className="message-content assistant loading">
            <span className="loading-indicator">
              {getActionMessage(currentAction)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default Chat; 