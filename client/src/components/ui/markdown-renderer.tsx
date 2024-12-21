import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { MarkdownTable } from "./markdown-table";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={cn("prose dark:prose-invert max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children }) => {
            // Extract headers and rows from the table
            const rows = React.Children.toArray(children).filter(
              (child) => React.isValidElement(child) && child.type === "tbody"
            )[0];
            const headers = React.Children.toArray(children).filter(
              (child) => React.isValidElement(child) && child.type === "thead"
            )[0];

            if (!rows || !headers || !React.isValidElement(rows) || !React.isValidElement(headers)) {
              return null;
            }

            const headerCells = React.Children.toArray(headers.props.children)
              .filter((row) => React.isValidElement(row))[0];

            if (!React.isValidElement(headerCells)) {
              return null;
            }

            const headerTexts = React.Children.toArray(headerCells.props.children)
              .filter((cell) => React.isValidElement(cell))
              .map((cell) => {
                if (React.isValidElement(cell)) {
                  return React.Children.toArray(cell.props.children).join("");
                }
                return "";
              });

            const rowData = React.Children.toArray(rows.props.children)
              .filter((row) => React.isValidElement(row))
              .map((row) => {
                if (React.isValidElement(row)) {
                  return React.Children.toArray(row.props.children)
                    .filter((cell) => React.isValidElement(cell))
                    .map((cell) => {
                      if (React.isValidElement(cell)) {
                        return React.Children.toArray(cell.props.children).join("");
                      }
                      return "";
                    });
                }
                return [];
              });

            return (
              <MarkdownTable 
                headers={headerTexts}
                rows={rowData}
                className="my-4"
              />
            );
          },
          p: ({children}) => <p className="mb-4 leading-7">{children}</p>,
          h1: ({children}) => <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl mb-8">{children}</h1>,
          h2: ({children}) => <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0 mb-4">{children}</h2>,
          h3: ({children}) => <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight mb-4">{children}</h3>,
          ul: ({children}) => <ul className="my-6 ml-6 list-disc [&>li]:mt-2">{children}</ul>,
          ol: ({children}) => <ol className="my-6 ml-6 list-decimal [&>li]:mt-2">{children}</ol>,
          blockquote: ({children}) => (
            <blockquote className="mt-6 border-l-2 pl-6 italic">
              {children}
            </blockquote>
          ),
          code: ({className, children, ...props}) => (
            <code
              className={cn(
                "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm",
                className
              )}
              {...props}
            >
              {children}
            </code>
          ),
          pre: ({children}) => (
            <pre className="mb-4 mt-4 overflow-x-auto rounded-lg border bg-black p-4">
              {children}
            </pre>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}