import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={cn("prose prose-gray dark:prose-invert max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Basic markdown components with proper styling
          p: ({ children }) => (
            <p className="leading-7 [&:not(:first-child)]:mt-6">{children}</p>
          ),
          h1: ({ children }) => (
            <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
              {children}
            </h3>
          ),
          ul: ({ children }) => (
            <ul className="my-6 ml-6 list-disc [&>li]:mt-2">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-6 ml-6 list-decimal [&>li]:mt-2">{children}</ol>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mt-6 border-l-2 pl-6 italic">
              {children}
            </blockquote>
          ),
          code: ({ node, inline, className, children, ...props }) => {
            if (inline) {
              return (
                <code
                  className={cn(
                    "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm",
                    className
                  )}
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <pre className="whitespace-pre-wrap break-words bg-muted p-4 rounded-md font-mono text-sm">
                <code {...props}>{children}</code>
              </pre>
            );
          },
          // Let the default table rendering take over
          table: ({ children }) => (
            <div className="my-6 w-full overflow-y-auto">
              <table className="w-full">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="border-b">{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr className="border-b">{children}</tr>,
          th: ({ children }) => (
            <th className="border px-4 py-2 text-left font-semibold">{children}</th>
          ),
          td: ({ children }) => <td className="border px-4 py-2">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}