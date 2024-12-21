import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { MarkdownTable } from "./markdown-table";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

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
          table: ({ children }) => {
            try {
              // Extract headers and rows from the table
              const rows = React.Children.toArray(children).filter(
                (child) => React.isValidElement(child) && child.type === "tbody"
              )[0];

              const headers = React.Children.toArray(children).filter(
                (child) => React.isValidElement(child) && child.type === "thead"
              )[0];

              if (!rows || !headers || !React.isValidElement(rows) || !React.isValidElement(headers)) {
                console.warn("Invalid table structure:", { rows, headers });
                return null;
              }

              // Extract header cells
              const headerCells = React.Children.toArray(headers.props.children)
                .filter((row) => React.isValidElement(row))[0];

              if (!React.isValidElement(headerCells)) {
                console.warn("Invalid header cells structure");
                return null;
              }

              // Extract header texts
              const headerTexts = React.Children.toArray(headerCells.props.children)
                .filter((cell) => React.isValidElement(cell))
                .map((cell) => {
                  if (React.isValidElement(cell)) {
                    return React.Children.toArray(cell.props.children)
                      .map(child => typeof child === 'string' ? child : '')
                      .join('').trim();
                  }
                  return "";
                })
                .filter(Boolean);

              // Extract row data
              const rowData = React.Children.toArray(rows.props.children)
                .filter((row) => React.isValidElement(row))
                .map((row) => {
                  if (React.isValidElement(row)) {
                    return React.Children.toArray(row.props.children)
                      .filter((cell) => React.isValidElement(cell))
                      .map((cell) => {
                        if (React.isValidElement(cell)) {
                          return React.Children.toArray(cell.props.children)
                            .map(child => typeof child === 'string' ? child : '')
                            .join('').trim();
                        }
                        return "";
                      });
                  }
                  return [];
                });

              if (!headerTexts.length || !rowData.length) {
                console.warn("Empty table data:", { headerTexts, rowData });
                return null;
              }

              return (
                <div className="not-prose my-6">
                  <MarkdownTable 
                    headers={headerTexts}
                    rows={rowData}
                  />
                </div>
              );
            } catch (error) {
              console.error("Error rendering markdown table:", error);
              return null;
            }
          },
          code: ({ node, inline, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';

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
              <div className="relative">
                <div className="absolute right-2 top-2 text-xs text-muted-foreground">
                  {language}
                </div>
                <SyntaxHighlighter
                  language={language}
                  style={vscDarkPlus}
                  customStyle={{
                    margin: 0,
                    borderRadius: '0.5rem',
                    padding: '1.5rem 1rem',
                  }}
                  PreTag="div"
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              </div>
            );
          },
          p: ({children}) => (
            <p className="leading-7 [&:not(:first-child)]:mt-6">{children}</p>
          ),
          h1: ({children}) => (
            <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
              {children}
            </h1>
          ),
          h2: ({children}) => (
            <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">
              {children}
            </h2>
          ),
          h3: ({children}) => (
            <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
              {children}
            </h3>
          ),
          ul: ({children}) => (
            <ul className="my-6 ml-6 list-disc [&>li]:mt-2">{children}</ul>
          ),
          ol: ({children}) => (
            <ol className="my-6 ml-6 list-decimal [&>li]:mt-2">{children}</ol>
          ),
          blockquote: ({children}) => (
            <blockquote className="mt-6 border-l-2 pl-6 italic">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}