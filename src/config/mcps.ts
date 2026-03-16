// MCP server configuration with env var support + defaults

export interface McpServerConfig {
  url: string;
  label: string;
  slug: string;
}

export const MCP_SERVERS: McpServerConfig[] = [
  {
    url: import.meta.env.VITE_MCP_EXA_URL || 'https://mcp.exa.ai/mcp',
    label: 'Exa Search',
    slug: 'exa',
  },
  {
    url: import.meta.env.VITE_MCP_NOTION_URL || 'https://mcp.notion.com/mcp',
    label: 'Notion',
    slug: 'notion',
  },
];
