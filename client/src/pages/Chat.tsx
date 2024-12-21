import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listTools } from "@/lib/api";
import { Send } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string | any[];
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

  // Helper function to render message content
  function renderMessageContent(content: string | any[]) {
    if (typeof content === 'string') {
      return content;
    }

    // Handle array of content blocks
    return content.map((block: any, index: number) => {
      if (block.type === 'text') {
        return <div key={index}>{block.text}</div>;
      }
      if (block.type === 'tool_use') {
        return (
          <div key={index} className="bg-gray-100 p-2 rounded">
            Using tool: {block.name}
            <pre className="mt-1 text-sm">
              {JSON.stringify(block.input, null, 2)}
            </pre>
          </div>
        );
      }
      if (block.type === 'tool_result') {
        return (
          <div key={index} className="bg-gray-100 p-2 rounded">
            Tool result:
            <pre className="mt-1 text-sm">
              {block.content}
            </pre>
          </div>
        );
      }
      return null;
    });
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Chat with Claude</CardTitle>
            <CardDescription>
              Available Tools: {tools.length > 0 ? tools.map(t => t.name).join(", ") : "No tools configured yet"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-4 max-h-[500px] overflow-y-auto">
              {messages.map((message, i) => (
                <div
                  key={i}
                  className={`flex ${message.role === "assistant" ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === "assistant"
                        ? "bg-[#e9dff0] text-black"
                        : "bg-[#8445ff] text-white"
                    }`}
                  >
                    {renderMessageContent(message.content)}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-[#e9dff0] text-black max-w-[80%] rounded-lg p-3">
                    Thinking...
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
                className="bg-[#8445ff] hover:bg-[#6a37cc]"
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