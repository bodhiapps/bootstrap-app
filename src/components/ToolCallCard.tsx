import { useState } from 'react';
import { Wrench, ChevronDown, ChevronRight, Check, X, Loader2 } from 'lucide-react';
import type { ToolCallInfo } from '@/hooks/useAgenticChat';

const statusConfig = {
  pending: {
    border: 'border-l-muted-foreground',
    text: 'Waiting...',
    icon: Loader2,
    iconClass: 'text-muted-foreground',
  },
  executing: {
    border: 'border-l-indigo-500',
    text: 'Running...',
    icon: Loader2,
    iconClass: 'text-indigo-500 animate-spin',
  },
  completed: {
    border: 'border-l-indigo-500',
    text: 'Done',
    icon: Check,
    iconClass: 'text-indigo-500',
  },
  error: {
    border: 'border-l-red-500',
    text: 'Failed',
    icon: X,
    iconClass: 'text-red-500',
  },
} as const;

interface ToolCallCardProps {
  toolCall: ToolCallInfo;
}

export default function ToolCallCard({ toolCall }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false);
  const config = statusConfig[toolCall.status];
  const StatusIcon = config.icon;

  const canExpand = toolCall.status === 'completed' || toolCall.status === 'error';
  const expandContent = toolCall.status === 'error' ? toolCall.error : toolCall.result;

  return (
    <div
      data-testid={`card-tool-call-${toolCall.id}`}
      data-test-state={toolCall.status}
      className={`tool-card tool-card-${toolCall.status}`}
    >
      <div className="flex items-center gap-2 text-sm">
        <Wrench size={14} className="text-muted-foreground shrink-0" />
        <span className="span-tool-mcp-name text-muted-foreground font-medium truncate">
          {toolCall.mcpName}
        </span>
        <span className="text-border">/</span>
        <span className="span-tool-name font-medium text-foreground/75 truncate">
          {toolCall.displayName}
        </span>
        <span className="ml-auto flex items-center gap-1.5 shrink-0">
          <StatusIcon size={14} className={config.iconClass} />
          <span className="span-tool-status text-xs text-muted-foreground">{config.text}</span>
        </span>
      </div>

      {canExpand && expandContent && (
        <div className="mt-1.5">
          <button
            className="btn-tool-expand flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 transition-colors"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            View results
          </button>
          {expanded && (
            <pre className="mt-1.5 p-2 bg-[oklch(0.16_0.01_200)] text-[oklch(0.9_0_0)] text-xs rounded-lg overflow-x-auto max-h-48 overflow-y-auto">
              {(() => {
                try {
                  return JSON.stringify(JSON.parse(expandContent), null, 2);
                } catch {
                  return expandContent;
                }
              })()}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
