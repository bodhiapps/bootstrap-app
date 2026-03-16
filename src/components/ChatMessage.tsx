import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ToolCallCard from './ToolCallCard';
import type { AgenticMessage } from '@/hooks/useAgenticChat';

interface ChatMessageProps {
  message: AgenticMessage;
  index: number;
}

export default function ChatMessage({ message, index }: ChatMessageProps) {
  // Skip tool role messages — results are embedded in ToolCallCard
  if (message.role === 'tool') {
    return null;
  }

  if (message.role === 'user') {
    return (
      <div className="flex justify-end mb-4" key={index}>
        <div data-testid="div-message-user" className="max-w-[70%] px-5 py-3 msg-user">
          <div className="chat-text whitespace-pre-wrap break-words">{message.content}</div>
        </div>
      </div>
    );
  }

  if (message.role === 'assistant') {
    return (
      <div className="flex justify-start mb-4" key={index}>
        <div data-testid="div-message-assistant" className="max-w-[70%] px-5 py-3 msg-assistant">
          {message.isStreaming && !message.content && (
            <div data-testid="streaming-indicator" className="flex items-center gap-2 py-1.5">
              <div className="streaming-dot" />
              <div className="streaming-dot" />
              <div className="streaming-dot" />
            </div>
          )}

          {message.content && (
            <div data-testid="div-message-content" className="chat-text prose-chat">
              <Markdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const isInline = !match;
                    return isInline ? (
                      <code
                        className="bg-bodhi-50 text-bodhi-dark px-1 py-0.5 rounded text-sm"
                        {...props}
                      >
                        {children}
                      </code>
                    ) : (
                      <pre className="bg-[oklch(0.16_0.01_200)] text-[oklch(0.9_0_0)] p-3 rounded-lg overflow-x-auto my-2">
                        <code className={className} {...props}>
                          {children}
                        </code>
                      </pre>
                    );
                  },
                  table({ children, ...props }) {
                    return (
                      <div className="overflow-x-auto my-2">
                        <table
                          className="min-w-full border-collapse border border-border"
                          {...props}
                        >
                          {children}
                        </table>
                      </div>
                    );
                  },
                  th({ children, ...props }) {
                    return (
                      <th
                        className="border border-border bg-bodhi-50/50 px-3 py-1.5 text-left text-sm font-medium text-foreground/75"
                        {...props}
                      >
                        {children}
                      </th>
                    );
                  },
                  td({ children, ...props }) {
                    return (
                      <td className="border border-border px-3 py-1.5 text-sm" {...props}>
                        {children}
                      </td>
                    );
                  },
                  a({ children, href, ...props }) {
                    return (
                      <a
                        href={href}
                        className="text-indigo-500 hover:text-indigo-700 underline"
                        target="_blank"
                        rel="noopener noreferrer"
                        {...props}
                      >
                        {children}
                      </a>
                    );
                  },
                }}
              >
                {message.content}
              </Markdown>
            </div>
          )}

          {message.tool_calls && message.tool_calls.length > 0 && (
            <div className="mt-2 space-y-1">
              {message.tool_calls.map(tc => (
                <ToolCallCard key={tc.id} toolCall={tc} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // System messages — render as a subtle centered notice
  return (
    <div className="flex justify-center mb-4" key={index}>
      <div className="text-xs text-muted-foreground italic max-w-[80%] text-center">
        {message.content}
      </div>
    </div>
  );
}
