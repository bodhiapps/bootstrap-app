import { useState, useEffect, useCallback } from 'react';
import { useBodhi } from '@bodhiapp/bodhi-js-react';

export interface McpTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface McpInfo {
  id: string;
  slug: string;
  name: string;
  tools_cache?: McpTool[];
}

export interface ChatTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

function mcpToolsToChatFormat(mcps: McpInfo[]): ChatTool[] {
  const tools: ChatTool[] = [];
  for (const mcp of mcps) {
    for (const t of mcp.tools_cache ?? []) {
      tools.push({
        type: 'function' as const,
        function: {
          name: `mcp__${mcp.slug}__${t.name}`,
          description: t.description,
          parameters: t.input_schema || { type: 'object', properties: {} },
        },
      });
    }
  }
  return tools;
}

export function parseToolName(prefixed: string): { mcpSlug: string; toolName: string } | null {
  const parts = prefixed.split('__');
  if (parts.length !== 3 || parts[0] !== 'mcp') return null;
  return { mcpSlug: parts[1], toolName: parts[2] };
}

export function findMcpId(
  slug: string,
  mcps: Array<{ id: string; slug: string }>
): string | undefined {
  return mcps.find(m => m.slug === slug)?.id;
}

export function useMcpTools() {
  const { client, isAuthenticated } = useBodhi();
  const [mcps, setMcps] = useState<McpInfo[]>([]);
  const [tools, setTools] = useState<ChatTool[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchMcps = useCallback(async () => {
    if (!client || !isAuthenticated) return;
    setIsLoading(true);
    setError(null);
    try {
      const { mcps: rawMcps } = await client.mcps.list();
      const infos: McpInfo[] = rawMcps.map(m => ({
        id: m.id,
        slug: m.slug,
        name: m.name,
        tools_cache: (m.tools_cache ?? []).map(t => ({
          name: t.name,
          description: t.description ?? '',
          input_schema: (t.input_schema ?? { type: 'object', properties: {} }) as Record<
            string,
            unknown
          >,
        })),
      }));
      setMcps(infos);
      setTools(mcpToolsToChatFormat(infos));
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [client, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setMcps([]);
      setTools([]);
      setError(null);
      return;
    }
    void fetchMcps();
  }, [isAuthenticated, fetchMcps]);

  return { mcps, tools, isLoading, error, refresh: fetchMcps };
}
