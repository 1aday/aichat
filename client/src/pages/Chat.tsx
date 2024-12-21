import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listTools } from "@/lib/api";
import { Send, Bot, User, Terminal } from "lucide-react";
import { format } from "date-fns";

interface Message {
  role: "user" | "assistant";
  content: string | any[];
  timestamp?: Date;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { data: tools = [] } = useQuery({
    queryKey: ['/api/tools'],
    queryFn: listTools,
  });

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");

    // Add user message to history with timestamp
    const newUserMessage: Message = {
      role: "user",
      content: userMessage,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: messages.map(({ timestamp, ...msg }) => msg)
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      const data = await response.json();

      // Update messages with timestamps for new messages
      if (data.messages) {
        const updatedMessages = data.messages.map((msg: Message) => ({
          ...msg,
          timestamp: msg.timestamp || new Date()
        }));
        setMessages(updatedMessages);
      } else {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: data.response,
          timestamp: new Date()
        }]);
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: `Error: ${error.message || 'An unexpected error occurred. Please try again.'}`,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  }

  function renderMessageContent(content: string | any[]) {
    if (typeof content === 'string') {
      return <p className="whitespace-pre-wrap">{content}</p>;
    }

    return content.map((block: any, index: number) => {
      if (block.type === 'text') {
        return (
          <p key={index} className="whitespace-pre-wrap">
            {block.text}
          </p>
        );
      }

      if (block.type === 'tool_use') {
        return (
          <div key={index} className="mt-2 mb-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">
              <Terminal className="h-4 w-4" />
              <span>Using {block.name}</span>
            </div>
            <pre className="text-sm overflow-x-auto bg-white/50 dark:bg-black/20 p-2 rounded">
              {JSON.stringify(block.input, null, 2)}
            </pre>
          </div>
        );
      }

      if (block.type === 'tool_result') {
        return (
          <div key={index} className="mt-2 mb-3 bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-300 mb-2">
              <Terminal className="h-4 w-4" />
              <span>Result</span>
            </div>
            <pre className="text-sm overflow-x-auto bg-white/50 dark:bg-black/20 p-2 rounded">
              {typeof block.content === 'string' ? block.content : JSON.stringify(block.content, null, 2)}
            </pre>
          </div>
        );
      }

      return null;
    });
  }

  return (
    <div className="container mx-auto py-6">
      <div className="max-w-4xl mx-auto">
        <Card className="border-2">
          <CardHeader>
            <CardTitle>Chat with Claude</CardTitle>
            <CardDescription>
              Available Tools: {tools.length > 0 ? tools.map(t => t.name).join(", ") : "No tools configured yet"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-4 max-h-[600px] overflow-y-auto p-4">
              {messages.map((message, i) => (
                <div
                  key={i}
                  className={`flex ${message.role === "assistant" ? "justify-start" : "justify-end"} items-start gap-2`}
                >
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-5 h-5 text-purple-500" />
                    </div>
                  )}

                  <div className="flex flex-col gap-1">
                    <div
                      className={`max-w-[80%] rounded-lg p-4 ${
                        message.role === "assistant"
                          ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                          : "bg-purple-600 text-white ml-auto"
                      }`}
                    >
                      {renderMessageContent(message.content)}
                    </div>
                    {message.timestamp && (
                      <span className={`text-xs text-gray-500 ${message.role === "user" ? "text-right" : ""}`}>
                        {format(new Date(message.timestamp), 'HH:mm')}
                      </span>
                    )}
                  </div>

                  {message.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start items-start gap-2">
                  <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-purple-500" />
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 max-w-[80%] rounded-lg p-4">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-600 animate-bounce" />
                      <div className="w-2 h-2 rounded-full bg-purple-600 animate-bounce [animation-delay:0.2s]" />
                      <div className="w-2 h-2 rounded-full bg-purple-600 animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
            </div>
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
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}