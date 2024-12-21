import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Send, Loader2, ChevronRight, Check, Terminal, MessageSquare, Settings, ArrowDownToLine, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  role: "user" | "assistant" | "tool";
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

type ToolExecutionStep = 
  | "agent_requested" 
  | "preparing_execution"
  | "executing"
  | "received_response"
  | "completed"
  | "failed";

interface ToolCall {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
  status?: ToolExecutionStep;
  startTime?: number;
  endTime?: number;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [isProcessingTools, setIsProcessingTools] = useState(false);
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

  // Calculate progress based on tool status
  function calculateProgress(step: ToolExecutionStep): number {
    const steps: Record<ToolExecutionStep, number> = {
      agent_requested: 20,
      preparing_execution: 40,
      executing: 60,
      received_response: 80,
      completed: 100,
      failed: 100
    };
    return steps[step] || 0;
  }

  // Execute a single tool call and update its status
  const executeToolCall = async (toolCall: ToolCall, messageIndex: number) => {
    const updateToolStatus = (status: ToolExecutionStep) => {
      setMessages(prev => {
        const updatedMessages = prev.map((msg, idx) =>
          idx === messageIndex && msg.tool_calls
            ? {
                ...msg,
                tool_calls: msg.tool_calls.map(tc =>
                  tc.id === toolCall.id
                    ? { 
                        ...tc, 
                        status,
                        startTime: tc.startTime || Date.now(),
                        ...(status === 'completed' || status === 'failed' ? { endTime: Date.now() } : {})
                      }
                    : tc
                )
              }
            : msg
        );
        return updatedMessages;
      });
    };

    try {
      updateToolStatus('preparing_execution');
      await new Promise(r => setTimeout(r, 500));

      updateToolStatus('executing');
      const toolResponse = await fetch("/api/execute-tool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolCall }),
      });

      if (!toolResponse.ok) {
        throw new Error(await toolResponse.text());
      }

      updateToolStatus('received_response');
      await new Promise(r => setTimeout(r, 500));

      const toolResult = await toolResponse.json();
      updateToolStatus('completed');

      // Add tool response message
      setMessages(prev => [...prev, {
        role: "tool",
        content: JSON.stringify(toolResult.result),
        tool_call_id: toolCall.id
      }]);

      return toolResult;
    } catch (error) {
      updateToolStatus('failed');
      throw error;
    }
  };

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isWaitingForResponse) return;

    const userMessage = input.trim();
    setInput("");

    // Add user message immediately
    const newUserMessage: Message = { role: "user", content: userMessage };
    setMessages(prev => [...prev, newUserMessage]);
    setIsWaitingForResponse(true);

    try {
      // Get initial assistant response
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

      // If there are tool calls, handle them
      if (assistantMessage.tool_calls) {
        // Add assistant message with pending tool calls
        const messageWithPendingTools = {
          ...assistantMessage,
          tool_calls: assistantMessage.tool_calls.map(call => ({
            ...call,
            status: "agent_requested" as ToolExecutionStep
          }))
        };

        setMessages(prev => [...prev, messageWithPendingTools]);
        setIsWaitingForResponse(false);
        setIsProcessingTools(true);

        const messageIndex = messages.length + 1;
        const toolResults = [];

        // Execute each tool call sequentially
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
                content: JSON.stringify(result.result),
                tool_call_id: result.tool_call_id
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
    }
  }

  function renderToolProgress(toolCall: ToolCall) {
    const stepInfo: Record<ToolExecutionStep, {
      label: string;
      icon: JSX.Element;
      color: string;
      accent: string;
      background: string;
    }> = {
      agent_requested: {
        label: "AI Agent Requested",
        subtext: "Preparing to execute tool function",
        icon: <MessageSquare className="h-3.5 w-3.5 text-[#007AFF]" />,
        color: "text-[#007AFF]",
        accent: "ring-[#007AFF]/20",
        background: "bg-[#007AFF]/10"
      },
      preparing_execution: {
        label: "Preparing Parameters",
        subtext: "Validating and formatting input",
        icon: <Settings className="h-3.5 w-3.5 text-[#5856D6]" />,
        color: "text-[#5856D6]",
        accent: "ring-[#5856D6]/20",
        background: "bg-[#5856D6]/10"
      },
      executing: {
        label: "Executing Function",
        subtext: "Processing request",
        icon: <Loader2 className="h-3.5 w-3.5 animate-spin text-[#FF9500]" />,
        color: "text-[#FF9500]",
        accent: "ring-[#FF9500]/20",
        background: "bg-[#FF9500]/10"
      },
      received_response: {
        label: "Processing Response",
        subtext: "Analyzing results",
        icon: <ArrowDownToLine className="h-3.5 w-3.5 text-[#FF3B30]" />,
        color: "text-[#FF3B30]",
        accent: "ring-[#FF3B30]/20",
        background: "bg-[#FF3B30]/10"
      },
      completed: {
        label: "Execution Complete",
        subtext: "Tool function succeeded",
        icon: <Check className="h-3.5 w-3.5 text-[#34C759]" />,
        color: "text-[#34C759]",
        accent: "ring-[#34C759]/20",
        background: "bg-[#34C759]/10"
      },
      failed: {
        label: "Execution Failed",
        subtext: "An error occurred",
        icon: <XCircle className="h-3.5 w-3.5 text-[#FF3B30]" />,
        color: "text-[#FF3B30]",
        accent: "ring-[#FF3B30]/20",
        background: "bg-[#FF3B30]/10"
      }
    };

    const currentStep = stepInfo[toolCall.status || 'agent_requested'];
    const duration = toolCall.endTime && toolCall.startTime 
      ? `${((toolCall.endTime - toolCall.startTime) / 1000).toFixed(2)}s`
      : '';

    return (
      <div className="relative mt-6 mb-4">
        {/* Elegant progress line with gradient fade */}
        <div className="absolute left-[11px] top-2 bottom-2 w-[2px] bg-gradient-to-b from-gray-200/0 via-gray-200 to-gray-200/0 dark:from-gray-700/0 dark:via-gray-700 dark:to-gray-700/0" />

        {/* Execution Timeline */}
        <div className="space-y-4">
          {Object.entries(stepInfo).map(([step, info], index) => {
            const isCurrentStep = step === toolCall.status;
            const isPastStep = calculateProgress(toolCall.status || 'agent_requested') >= calculateProgress(step as ToolExecutionStep);
            
            return (
              <div 
                key={step} 
                className={`relative flex items-start gap-4 transition-all duration-300 ease-out
                  ${isPastStep ? 'opacity-100' : 'opacity-50'}
                  ${isCurrentStep ? 'scale-[1.02]' : 'scale-100'}`}
              >
                {/* Status Icon */}
                <div className={`
                  relative z-10 flex h-6 w-6 items-center justify-center rounded-full
                  transition-all duration-300 ease-out
                  ${isPastStep ? info.background : 'bg-gray-100 dark:bg-gray-800'}
                  ${isCurrentStep ? `ring-2 ${info.accent} ring-offset-2 dark:ring-offset-gray-950` : ''}
                  shadow-sm
                `}>
                  {info.icon}
                </div>

                {/* Status Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between">
                    <h4 className={`font-medium tracking-tight
                      ${isPastStep ? info.color : 'text-gray-400 dark:text-gray-500'}
                      ${isCurrentStep ? 'text-lg' : 'text-sm'}
                    `}>
                      {info.label}
                    </h4>
                    {isCurrentStep && duration && (
                      <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
                        {duration}
                      </span>
                    )}
                  </div>
                  <p className={`mt-0.5 text-sm transition-all duration-300
                    ${isPastStep ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}
                  `}>
                    {info.subtext}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tool Details Panel */}
        <div className="ml-10 mt-4">
          <Collapsible>
            <CollapsibleTrigger className="group flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
              <ChevronRight className="h-3 w-3 transition-transform duration-200 ease-out group-data-[state=open]:rotate-90" />
              Function Details
            </CollapsibleTrigger>
            <CollapsibleContent className="animate-slideDown">
              <div className="mt-3 rounded-lg border border-gray-200/50 dark:border-gray-800/50 bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-sm">
                <div className="border-b border-gray-200/50 dark:border-gray-800/50 px-4 py-2.5">
                  <h5 className="text-xs font-medium text-gray-900 dark:text-gray-100">
                    {toolCall.function.name}
                  </h5>
                </div>
                <div className="px-4 py-3">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Arguments
                  </p>
                  <pre className="text-xs font-mono bg-white/50 dark:bg-gray-950/50 rounded-md p-3 overflow-x-auto border border-gray-200/50 dark:border-gray-800/50">
                    {JSON.stringify(JSON.parse(toolCall.function.arguments), null, 2)}
                  </pre>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    );
  }

  function renderMessage(message: Message) {
    console.log('Rendering message:', message);
    return (
      <>
        {/* Render message content with markdown support */}
        <div className="leading-relaxed">
          <MarkdownRenderer content={message.content} />
        </div>

        {/* Render tool calls progress if present */}
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
      <div className="max-w-[1200px] mx-auto pt-6 pb-16 px-6">
        <div className="relative h-[calc(100vh-8rem)]">
          <div className="absolute inset-0 flex flex-col rounded-2xl overflow-hidden border border-gray-200/50 dark:border-gray-800/50 shadow-2xl">
            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto space-y-6 p-6 messages-container">
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
                        ease: [0.23, 1, 0.32, 1] // Apple-style spring easing
                      }}
                      className={`flex ${message.role === "assistant" ? "justify-start" : "justify-end"}`}
                    >
                      <div 
                        className={`max-w-[85%] px-6 py-4 ${
                          message.role === "assistant"
                            ? "chat-bubble-assistant"
                            : "chat-bubble-user"
                        }`}
                      >
                        {renderMessage(message)}
                      </div>
                    </motion.div>
                  )
                ))}
              </AnimatePresence>

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
                  placeholder="Message Claude..."
                  disabled={isWaitingForResponse || isProcessingTools}
                  className="flex-1 h-12 text-base bg-white/50 dark:bg-gray-900/50 
                            border-gray-200/50 dark:border-gray-800/50 
                            backdrop-blur-xl rounded-xl 
                            focus:ring-2 focus:ring-primary/30 focus:border-primary/50 
                            transition-all duration-200"
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
              {tools.length > 0 && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-3 text-sm text-gray-500 dark:text-gray-400"
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