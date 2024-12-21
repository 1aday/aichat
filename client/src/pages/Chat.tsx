import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listTools } from "@/lib/api";
import { Send } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
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
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.response }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Sorry, I encountered an error processing your request." 
      }]);
    } finally {
      setIsLoading(false);
    }
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
                    {message.content}
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
