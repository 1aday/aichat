import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listTools } from "@/lib/api";
import { Send, Bot, User, Wrench } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  role: "user" | "assistant";
  content: string | any[];
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { data: tools = [] } = useQuery({
    queryKey: ['/api/tools'],
    queryFn: listTools,
  });

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");

    // Add user message to history
    const newUserMessage: Message = { role: "user", content: userMessage };
    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: [...messages, newUserMessage]
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      const data = await response.json();

      // Update messages with the complete conversation history
      if (data.messages) {
        setMessages(data.messages);
      } else {
        // Fallback for simple responses
        setMessages(prev => [...prev, { role: "assistant", content: data.response }]);
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: `Error: ${error.message || 'An unexpected error occurred. Please try again.'}` 
      }]);
    } finally {
      setIsLoading(false);
    }
  }

  // Helper function to find the next tool result
  function findNextToolResult(messages: Message[], toolCallId: string, currentIndex: number): any {
    for (let i = currentIndex + 1; i < messages.length; i++) {
      const message = messages[i];
      if (message.role === 'user' && Array.isArray(message.content)) {
        const toolResult = message.content.find(block => 
          block.type === 'tool_result' && block.tool_call_id === toolCallId
        );
        if (toolResult) return toolResult;
      }
    }
    return null;
  }

  // Helper function to render message content
  function renderMessageContent(message: Message, index: number) {
    const content = message.content;

    if (typeof content === 'string') {
      return <p className="whitespace-pre-wrap">{content}</p>;
    }

    // Handle array of content blocks
    return content.map((block: any, blockIndex: number) => {
      if (block.type === 'text') {
        return <p key={blockIndex} className="whitespace-pre-wrap">{block.text}</p>;
      }
      if (block.type === 'tool_calls') {
        const toolCall = block.tool_calls[0];
        const toolResult = findNextToolResult(messages, toolCall.id, index);

        return (
          <div key={blockIndex} className="mt-2 space-y-2">
            <div className="flex items-center gap-2 text-violet-600 font-medium">
              <Wrench className="h-4 w-4" />
              Using tool: {toolCall.name}
            </div>
            <pre className="mt-1 bg-violet-50 p-2 rounded-md overflow-x-auto text-sm">
              {JSON.stringify(toolCall.parameters, null, 2)}
            </pre>
            {toolResult && (
              <div className="border-l-2 border-violet-300 pl-3 mt-2">
                <div className="text-sm text-violet-600 font-medium">Result:</div>
                <pre className="mt-1 text-sm bg-violet-50 p-2 rounded-md overflow-x-auto">
                  {typeof toolResult.content === 'string' 
                    ? toolResult.content 
                    : JSON.stringify(toolResult.content, null, 2)}
                </pre>
              </div>
            )}
          </div>
        );
      }
      return null;
    });
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Bot className="h-6 w-6 text-violet-600" />
            Chat with Claude
          </CardTitle>
          <CardDescription>
            Available Tools: {tools.length > 0 ? tools.map(t => t.name).join(", ") : "No tools configured yet"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-4">
              {messages.map((message, i) => (
                <div
                  key={i}
                  className={`flex ${message.role === "assistant" ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`group relative flex gap-3 ${
                      message.role === "assistant" ? "flex-row" : "flex-row-reverse"
                    }`}
                  >
                    <div 
                      className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        message.role === "assistant" 
                          ? "bg-violet-100 text-violet-600"
                          : "bg-violet-600 text-white"
                      }`}
                    >
                      {message.role === "assistant" ? (
                        <Bot className="h-5 w-5" />
                      ) : (
                        <User className="h-5 w-5" />
                      )}
                    </div>
                    <div
                      className={`max-w-[600px] rounded-lg p-4 ${
                        message.role === "assistant"
                          ? "bg-violet-50 text-gray-800"
                          : "bg-violet-600 text-white"
                      }`}
                    >
                      {renderMessageContent(message, i)}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div className="bg-violet-50 text-gray-800 max-w-[600px] rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-violet-600 animate-bounce" />
                        <div className="w-2 h-2 rounded-full bg-violet-600 animate-bounce [animation-delay:0.2s]" />
                        <div className="w-2 h-2 rounded-full bg-violet-600 animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </ScrollArea>
        </CardContent>
        <CardFooter>
          <form onSubmit={sendMessage} className="flex w-full gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button 
              type="submit" 
              disabled={isLoading}
              className="bg-violet-600 hover:bg-violet-700"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}