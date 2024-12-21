import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { listTools } from "@/lib/api";
import { Send, Loader2, ChevronRight, Check, Terminal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  role: "user" | "assistant" | "tool";
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  status?: "in_progress" | "completed" | "failed";
}

interface ToolCall {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
  status?: "pending" | "executing" | "completed" | "failed";
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentToolCall, setCurrentToolCall] = useState<ToolCall | null>(null);
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

  // Calculate the current progress based on tool call status
  const calculateProgress = (toolCall: ToolCall | null) => {
    if (!toolCall) return 0;
    switch (toolCall.status) {
      case "pending": return 33;
      case "executing": return 66;
      case "completed": return 100;
      case "failed": return 100;
      default: return 0;
    }
  };

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setCurrentToolCall(null);

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
        throw new Error(await response.text());
      }

      const data = await response.json();

      // Process tool calls in the response
      const assistantMessage = data.messages[data.messages.length - 1];
      if (assistantMessage.tool_calls) {
        // Update tool call status to pending when received from Claude
        assistantMessage.tool_calls = assistantMessage.tool_calls.map((call: ToolCall) => ({
          ...call,
          status: "pending"
        }));
        setCurrentToolCall(assistantMessage.tool_calls[0]);
      }

      setMessages(data.messages);
    } catch (error: any) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: `Error: ${error.message || 'An unexpected error occurred'}` 
      }]);
    } finally {
      setIsLoading(false);
    }
  }

  // Render tool execution progress
  function renderToolProgress(toolCall: ToolCall) {
    const progress = calculateProgress(toolCall);
    let statusText = "Preparing to execute...";
    let statusColor = "text-blue-500";

    switch (toolCall.status) {
      case "executing":
        statusText = "Executing tool function...";
        statusColor = "text-yellow-500";
        break;
      case "completed":
        statusText = "Tool execution completed";
        statusColor = "text-green-500";
        break;
      case "failed":
        statusText = "Tool execution failed";
        statusColor = "text-red-500";
        break;
    }

    return (
      <div className="relative mt-4 mb-2">
        {/* Progress Line */}
        <div className="absolute left-[11px] top-0 h-full w-0.5 bg-gray-200 dark:bg-gray-700" />

        {/* Tool Execution Step */}
        <div className="relative flex items-start gap-3">
          <div className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full ${
            toolCall.status === "completed" ? "bg-green-500" : 
            toolCall.status === "failed" ? "bg-red-500" : 
            "bg-primary"
          } shadow-sm`}>
            {toolCall.status === "completed" ? (
              <Check className="h-3 w-3 text-white" />
            ) : (
              <Terminal className="h-3 w-3 text-white" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Using Tool: {toolCall.function.name}
            </p>
            <p className={`mt-1 text-xs ${statusColor}`}>
              {statusText}
            </p>
            <div className="mt-2 w-full max-w-md">
              <Progress value={progress} className="h-1" />
            </div>
          </div>
        </div>

        {/* Tool Details */}
        <div className="ml-9 mt-4">
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
              <ChevronRight className="h-3 w-3" />
              View details
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 rounded-md bg-gray-50 dark:bg-gray-800/50 p-3">
                <p className="text-xs text-gray-500 mb-1">Function Arguments:</p>
                <pre className="text-xs font-mono bg-white dark:bg-gray-800 rounded p-2 overflow-x-auto">
                  {toolCall.function.arguments}
                </pre>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    );
  }

  function renderMessage(message: Message) {
    return (
      <>
        {/* Render the main message content */}
        <p className="leading-relaxed whitespace-pre-wrap mb-2">{message.content}</p>

        {/* Render tool calls if present */}
        {message.tool_calls?.map((toolCall) => (
          <div key={`tool-${toolCall.id}`}>
            {renderToolProgress(toolCall)}
          </div>
        ))}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      <div className="max-w-4xl mx-auto pt-8 pb-24 px-4">
        <div className="relative h-[calc(100vh-8rem)]">
          <div className="absolute inset-0 flex flex-col">
            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto space-y-4 scroll-smooth px-2 messages-container rounded-2xl">
              <AnimatePresence initial={false}>
                {messages.map((message, i) => (
                  message.role !== "tool" && (
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
                        {renderMessage(message)}
                      </div>
                    </motion.div>
                  )
                ))}
              </AnimatePresence>

              {/* Loading State */}
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
                      <span className="text-sm font-medium">Processing...</span>
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
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