import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "@/lib/utils";
import { MarkdownTable } from "./markdown-table";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  console.log("Rendering markdown content:", content);

  return (
    <div className={cn("prose prose-gray dark:prose-invert max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Table rendering component
          table: ({ children }) => {
            try {
              // Extract headers and rows from the table
              const tableContent = React.Children.toArray(children);
              console.log("Table content:", tableContent);

              // Get header row
              const thead = tableContent.find(
                child => React.isValidElement(child) && child.type === "thead"
              );

              // Get body rows
              const tbody = tableContent.find(
                child => React.isValidElement(child) && child.type === "tbody"
              );

              if (!thead || !tbody || !React.isValidElement(thead) || !React.isValidElement(tbody)) {
                console.warn("Invalid table structure", { thead, tbody });
                return null;
              }

              // Extract header cells
              const headerRow = React.Children.toArray(thead.props.children)[0];
              if (!React.isValidElement(headerRow)) {
                console.warn("Invalid header row structure");
                return null;
              }

              const headers = React.Children.toArray(headerRow.props.children)
                .filter(cell => React.isValidElement(cell))
                .map(cell => {
                  if (React.isValidElement(cell)) {
                    return React.Children.toArray(cell.props.children)
                      .map(child => typeof child === "string" ? child : "")
                      .join("")
                      .trim();
                  }
                  return "";
                })
                .filter(Boolean);

              // Extract body rows
              const rows = React.Children.toArray(tbody.props.children)
                .filter(row => React.isValidElement(row))
                .map(row => {
                  if (React.isValidElement(row)) {
                    return React.Children.toArray(row.props.children)
                      .filter(cell => React.isValidElement(cell))
                      .map(cell => {
                        if (React.isValidElement(cell)) {
                          return React.Children.toArray(cell.props.children)
                            .map(child => typeof child === "string" ? child : "")
                            .join("")
                            .trim();
                        }
                        return "";
                      });
                  }
                  return [];
                });

              console.log("Extracted table data:", { headers, rows });

              if (!headers.length || !rows.length) {
                console.warn("Empty table data");
                return null;
              }

              return (
                <div className="not-prose my-6">
                  <MarkdownTable headers={headers} rows={rows} />
                </div>
              );
            } catch (error) {
              console.error("Error rendering table:", error);
              return null;
            }
          },

          // Code block rendering component
          code: ({ node, inline, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || "");
            const lang = match ? match[1] : "";
            const isMarkdownTable = lang === "markdown" && typeof children === "string" && children.includes("|");

            // If it's a markdown table inside a code block, parse and render it
            if (isMarkdownTable) {
              try {
                console.log("Parsing markdown table from code block");
                const lines = children.toString().trim().split("\n");
                const headers = lines[0]
                  .split("|")
                  .filter(Boolean)
                  .map(header => header.trim());

                // Skip the separator line
                const rows = lines.slice(2)
                  .map(line => 
                    line
                      .split("|")
                      .filter(Boolean)
                      .map(cell => cell.trim())
                  )
                  .filter(row => row.length === headers.length);

                console.log("Parsed table from code block:", { headers, rows });

                return (
                  <div className="not-prose my-6">
                    <MarkdownTable headers={headers} rows={rows} />
                  </div>
                );
              } catch (error) {
                console.error("Error parsing markdown table from code block:", error);
              }
            }

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
                  {lang}
                </div>
                <SyntaxHighlighter
                  language={lang}
                  style={vscDarkPlus}
                  customStyle={{
                    margin: 0,
                    borderRadius: "0.5rem",
                    padding: "1.5rem 1rem",
                  }}
                  PreTag="div"
                >
                  {String(children).replace(/\n$/, "")}
                </SyntaxHighlighter>
              </div>
            );
          },

          // Other markdown components with proper styling
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
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}