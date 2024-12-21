import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { listTools } from "@/lib/api";
import { Send, Loader2, ChevronRight, Check, Terminal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  role: "user" | "assistant" | "tool";
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

interface ToolCall {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
  status?: "pending" | "executing" | "completed" | "failed";
}

export default function ChatHome() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [isProcessingTools, setIsProcessingTools] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: tools = [] } = useQuery({
    queryKey: ['/api/tools'],
    queryFn: listTools,
  });

  // Setup default tools when the page loads
  useEffect(() => {
    fetch('/api/setup-default-tools')
      .then(res => res.json())
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/tools'] });
      })
      .catch(console.error);
  }, [queryClient]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Calculate progress based on tool status
  const calculateProgress = (toolCall: ToolCall) => {
    switch (toolCall.status) {
      case "pending": return 33;
      case "executing": return 66;
      case "completed": return 100;
      case "failed": return 100;
      default: return 0;
    }
  };

  // Execute a single tool call and update its status
  const executeToolCall = async (toolCall: ToolCall, messageIndex: number) => {
    try {
      // Update status to executing
      setMessages(prev => {
        const updatedMessages = prev.map((msg, idx) =>
          idx === messageIndex && msg.tool_calls
            ? {
                ...msg,
                tool_calls: msg.tool_calls.map(tc =>
                  tc.id === toolCall.id
                    ? { ...tc, status: "executing" as const }
                    : tc
                )
              }
            : msg
        );
        return updatedMessages;
      });

      const toolResponse = await fetch("/api/execute-tool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolCall }),
      });

      if (!toolResponse.ok) {
        throw new Error(await toolResponse.text());
      }

      const toolResult = await toolResponse.json();

      // Update status to completed and add tool result
      setMessages(prev => {
        const updatedMessages = prev.map((msg, idx) =>
          idx === messageIndex && msg.tool_calls
            ? {
                ...msg,
                tool_calls: msg.tool_calls.map(tc =>
                  tc.id === toolCall.id
                    ? { ...tc, status: "completed" as const }
                    : tc
                )
              }
            : msg
        );

        return [...updatedMessages, {
          role: "tool",
          content: toolResult.result,
          tool_call_id: toolCall.id
        }];
      });

      return toolResult;
    } catch (error) {
      console.error('Tool execution failed:', error);
      // Update status to failed
      setMessages(prev => prev.map((msg, idx) =>
        idx === messageIndex && msg.tool_calls
          ? {
              ...msg,
              tool_calls: msg.tool_calls.map(tc =>
                tc.id === toolCall.id
                  ? { ...tc, status: "failed" as const }
                  : tc
              )
            }
          : msg
      ));
      throw error;
    }
  };

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isWaitingForResponse) return;

    const userMessage = input.trim();
    setInput("");
    const inputRef = e.target as HTMLFormElement;
    const inputElement = inputRef.querySelector('input');

    // Add user message immediately
    const newUserMessage: Message = { role: "user", content: userMessage };
    setMessages(prev => [...prev, newUserMessage]);
    setIsWaitingForResponse(true);

    // Maintain focus on input
    setTimeout(() => inputElement?.focus(), 0);

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
      const assistantMessage = data.messages[data.messages.length - 1];

      // If there are tool calls, handle them immediately
      if (assistantMessage.tool_calls) {
        // Add assistant message with pending tool calls
        const messageWithPendingTools = {
          ...assistantMessage,
          tool_calls: assistantMessage.tool_calls.map((call: any) => ({
            ...call,
            status: "pending" as const
          }))
        };

        setMessages(prev => [...prev, messageWithPendingTools]);
        setIsWaitingForResponse(false);
        setIsProcessingTools(true);

        const messageIndex = messages.length + 1; // +1 for the user message we just added
        const toolResults = [];

        // Execute each tool call
        for (const toolCall of messageWithPendingTools.tool_calls) {
          try {
            const result = await executeToolCall(toolCall, messageIndex);
            toolResults.push(result);
          } catch (error) {
            console.error("Tool execution error:", error);
          }
        }

        setIsProcessingTools(false);
        setIsWaitingForResponse(true);

        // Get final response with tool results
        const finalResponse = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [
              ...messages,
              newUserMessage,
              messageWithPendingTools,
              ...toolResults.map(result => ({
                role: "tool",
                content: result.result
              }))
            ]
          }),
        });

        if (!finalResponse.ok) {
          throw new Error(await finalResponse.text());
        }

        const finalData = await finalResponse.json();
        const finalMessage = finalData.messages[finalData.messages.length - 1];
        setMessages(prev => [...prev, finalMessage]);
      } else {
        // No tool calls, just add the assistant message
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `Error: ${error.message || 'An unexpected error occurred'}`
      }]);
    } finally {
      setIsWaitingForResponse(false);
      setIsProcessingTools(false);
      // Maintain focus after error handling
      setTimeout(() => inputElement?.focus(), 0);
    }
  }

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
        <div className={`leading-relaxed ${message.role === "user" ? "text-white" : ""}`}>
          <MarkdownRenderer content={message.content} />
        </div>

        {message.tool_calls?.map((toolCall) => (
          <div key={`tool-${toolCall.id}`}>
            {renderToolProgress(toolCall)}
          </div>
        ))}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-200/50 dark:border-gray-800/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">AI Assistant</h1>
          {tools.length > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {tools.length} tools available
            </p>
          )}
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto py-6 px-6">
        <div className="h-[calc(100vh-7rem)]">
          <div className="h-full flex flex-col rounded-2xl overflow-hidden border border-gray-200/50 dark:border-gray-800/50 shadow-2xl">
            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto space-y-6 p-6 messages-container">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <h2 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
                      Welcome to AI Assistant
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                      Ask me anything! I can help you with data analysis, answer questions, and more.
                    </p>
                  </div>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {messages.map((message, i) => (
                    message.role !== "tool" && (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{
                          duration: 0.4,
                          ease: [0.23, 1, 0.32, 1]
                        }}
                        className={`flex ${message.role === "assistant" ? "justify-start" : "justify-end"}`}
                      >
                        <div
                          className={`max-w-[85%] px-6 py-4 ${
                            message.role === "assistant"
                              ? "chat-bubble-assistant"
                              : "chat-bubble-user prose prose-p:text-white prose-headings:text-white prose-strong:text-white"
                          }`}
                        >
                          {renderMessage(message)}
                        </div>
                      </motion.div>
                    )
                  ))}
                </AnimatePresence>
              )}

              {/* Loading States */}
              {(isWaitingForResponse || isProcessingTools) && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.3,
                    ease: [0.23, 1, 0.32, 1]
                  }}
                  className="flex justify-start"
                >
                  <div className="chat-bubble-assistant max-w-[85%] px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {isProcessingTools ? "Running tools..." : "Thinking..."}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <div className="sticky bottom-0 p-6 input-container">
              <form onSubmit={sendMessage} className="flex gap-3 items-center">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Message AI Assistant..."
                  disabled={isWaitingForResponse || isProcessingTools}
                  className="flex-1 h-12 text-base bg-white/50 dark:bg-gray-900/50 
                            border-gray-200/50 dark:border-gray-800/50 
                            backdrop-blur-xl rounded-xl 
                            focus:ring-2 focus:ring-primary/30 focus:border-primary/50 
                            transition-all duration-200"
                  autoFocus
                />
                <Button
                  type="submit"
                  disabled={isWaitingForResponse || isProcessingTools}
                  className="h-12 px-6 bg-primary hover:bg-primary/90 
                            rounded-xl shadow-lg shadow-primary/25 
                            transition-all duration-200 hover:shadow-xl hover:shadow-primary/30
                            disabled:shadow-none"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}