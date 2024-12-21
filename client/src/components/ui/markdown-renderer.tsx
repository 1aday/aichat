import * as React from "react";
import ReactMarkdown from 'react-markdown';
import { Components } from 'react-markdown/lib/ast-to-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const components: Components = {
    // Handle code blocks at root level
    code({ inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';

      if (inline) {
        return (
          <code 
            className="px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 font-mono text-sm" 
            {...props}
          >
            {children}
          </code>
        );
      }

      return (
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={language || 'text'}
          PreTag="div"
          className="rounded-lg my-4"
          customStyle={{
            borderRadius: '0.5rem',
            margin: '1rem 0',
          }}
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      );
    },

    // Prevent paragraphs from wrapping code blocks
    p({ node, children, ...props }) {
      if (node?.children[0]?.type === 'code') {
        return <>{children}</>;
      }
      return <p {...props}>{children}</p>;
    }
  };

  return (
    <div className="prose dark:prose-invert max-w-none">
      <ReactMarkdown components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}