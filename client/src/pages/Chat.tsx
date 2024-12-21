import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { listTools } from "@/lib/api";
import { Send, Loader2, ChevronRight, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  role: "user" | "assistant";
  content: string | any[];
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: tools = [] } = useQuery({
    queryKey: ['/api/tools'],
    queryFn: listTools,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");

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
      setMessages(data.messages);
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

function renderMessageContent(content: string | any[]) {
  if (typeof content === 'string') {
    return <p className="leading-relaxed whitespace-pre-wrap">{content}</p>;
  }

  if (!Array.isArray(content)) {
    return <p className="leading-relaxed whitespace-pre-wrap">{String(content)}</p>;
  }

  // Group tool use and tool result blocks together
  const blocks: JSX.Element[] = [];
  let currentText = '';

  content.forEach((block: any, index: number) => {
    if (block.type === 'text') {
      currentText += block.text + '\n';
    } else if (block.type === 'tool_call') {
      // If we have accumulated text, add it before the tool block
      if (currentText) {
        blocks.push(
          <p key={`text-${index}`} className="leading-relaxed whitespace-pre-wrap mb-2">
            {currentText.trim()}
          </p>
        );
        currentText = '';
      }

      // Find the corresponding tool result (if any)
      const nextBlock = content[index + 1];
      const hasToolResult = nextBlock && nextBlock.type === 'tool_result';

      blocks.push(
        <div key={`tool-${index}`} className="text-sm mt-2">
          <div className="flex flex-col gap-2">
            {/* Tool Usage Progress Steps */}
            <div className="flex flex-col gap-1.5 bg-black/5 dark:bg-white/5 rounded-lg p-3">
              <div className="flex items-center gap-2 text-xs">
                <Check className="h-3.5 w-3.5 text-green-500" />
                <span className="text-gray-600 dark:text-gray-300">Called tool: {block.tool}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {hasToolResult ? (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#8445ff]" />
                )}
                <span className="text-gray-600 dark:text-gray-300">
                  {hasToolResult ? "Received response" : "Waiting for response..."}
                </span>
              </div>
            </div>

            {/* Collapsible Tool Details */}
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                <ChevronRight className="h-3 w-3" />
                View details
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 mt-2">
                  <p className="text-xs text-gray-500 mb-2">Input:</p>
                  <pre className="font-mono text-gray-800 dark:text-gray-200 overflow-x-auto">
                    {JSON.stringify(block.input, null, 2)}
                  </pre>
                  {hasToolResult && (
                    <>
                      <p className="text-xs text-gray-500 mt-3 mb-2">Tool result:</p>
                      <pre className="font-mono text-gray-800 dark:text-gray-200 overflow-x-auto">
                        {JSON.stringify(nextBlock.result, null, 2)}
                      </pre>
                    </>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      );

      // Skip the next block if it was a tool result we just handled
      if (hasToolResult) {
        index++;
      }
    }
  });

  // Add any remaining text
  if (currentText) {
    blocks.push(
      <p key="remaining-text" className="leading-relaxed whitespace-pre-wrap">
        {currentText.trim()}
      </p>
    );
  }

  return blocks;
}

  // Helper to determine if a message should be displayed
  function shouldDisplayMessage(message: Message, index: number): boolean {
    // Always show user messages with actual content
    if (message.role === "user" && typeof message.content === "string") {
      return true;
    }

    // For assistant messages, always show them
    if (message.role === "assistant") {
      return true;
    }

    // Don't show tool result messages independently
    if (message.role === "user" && 
        Array.isArray(message.content) && 
        message.content[0]?.type === 'tool_result') {
      return false;
    }

    return true;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      <div className="max-w-4xl mx-auto pt-8 pb-24 px-4">
        <div className="relative h-[calc(100vh-8rem)]">
          <div className="absolute inset-0 flex flex-col">
            {/* Messages Container with backdrop blur */}
            <div className="flex-1 overflow-y-auto space-y-4 scroll-smooth px-2 messages-container rounded-2xl">
              <AnimatePresence initial={false}>
                {messages.map((message, i) => shouldDisplayMessage(message, i) && (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className={`flex ${message.role === "assistant" ? "justify-start" : "justify-end"}`}
                  >
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                      message.role === "assistant"
                        ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        : "bg-[#8445ff] text-white"
                    }`}>
                      {renderMessageContent(message.content)}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {isLoading && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex justify-start"
                >
                  <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 max-w-[85%] rounded-2xl px-4 py-3 shadow-sm">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin text-[#8445ff]" />
                      <span className="text-sm font-medium">Thinking...</span>
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form with enhanced styling */}
            <div className="sticky bottom-0 py-4 input-container rounded-b-2xl">
              <form onSubmit={sendMessage} className="flex gap-2 items-center px-4">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  disabled={isLoading}
                  className="flex-1 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#8445ff] focus:border-transparent transition-shadow"
                />
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="bg-[#8445ff] hover:bg-[#6a37cc] rounded-xl px-4 h-[42px] transition-all duration-200 hover:shadow-lg disabled:opacity-50"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </form>
              {tools.length > 0 && (
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-2 text-xs text-gray-500 dark:text-gray-400 px-4"
                >
                  Available tools: {tools.map(t => t.name).join(", ")}
                </motion.p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}