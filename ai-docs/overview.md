# Bodhi Bot — AI Research Assistant

## What It Is

Bodhi Bot is a demo app showcasing Bodhi App's "Operating System for AI Apps" concept. It is an AI-powered research assistant that can search the web and export findings to a knowledge base — with zero AI infrastructure of its own. All intelligence comes from Bodhi App's system services.

Built for the AI Festival (March 2026, 7-minute demo slot).

## How It Works

The app connects to **Bodhi App** via the `bodhi-js-sdk`. Bodhi App acts as a gateway, providing:

- Access to local LLMs (e.g. Llama 3.2) running on the user's machine
- Access to remote MCP (Model Context Protocol) tool servers the user has configured

Bodhi Bot requests access to two MCP servers during login. The user reviews and approves this access through Bodhi App's consent flow. Once approved, the app can use the LLM and both MCP tools together in an agentic chat loop.

## MCP Servers Used

### Exa Search (`https://mcp.exa.ai/mcp`)

- **Purpose:** Semantic web search
- **How used:** When the user asks to research a topic, the LLM calls Exa tools to find high-quality, relevant web sources. Exa returns semantically matched results rather than keyword-based results, producing better research outputs.
- **Typical tools:** `search`, `find_similar`, `get_contents`

### Notion (`https://mcp.notion.com/mcp`)

- **Purpose:** Knowledge export and storage
- **How used:** When the user wants to save research findings, the LLM calls Notion tools to create or update pages in the user's Notion workspace. This turns chat-based research into persistent, organized documentation.
- **Typical tools:** `create_page`, `search`, `append_block_children`

Both MCP URLs are configurable via environment variables (`VITE_MCP_EXA_URL`, `VITE_MCP_NOTION_URL`) but default to the public endpoints above.

## The Agentic Loop

The chat is not simple request-response. It runs an **agentic loop**:

1. User sends a message
2. Message + system prompt + conversation history sent to the local LLM (with available tools)
3. LLM streams a response — may include text, tool calls, or both
4. If tool calls are present:
   - Each tool call is executed against the appropriate MCP server via Bodhi App
   - Tool results are fed back to the LLM
   - LLM processes results and may call more tools or produce a final response
   - Loop repeats (capped at 25 iterations)
5. When the LLM responds with text only (no tool calls), the loop ends

This means a single user message can trigger multiple rounds of tool use before producing a final answer.

## App States

The app has three mutually exclusive views:

| State | Condition | What the user sees |
|-------|-----------|-------------------|
| Setup Required | Bodhi App not reachable | "Bodhi App connection required" with setup button |
| Welcome Screen | Connected but not logged in | "Bodhi Bot" branding, MCP indicators (gray), "Connect to Bodhi App" button |
| Chat Interface | Authenticated | Header with green MCP indicators, chat area with suggested prompts, message input |

## Login Flow

1. User clicks "Connect to Bodhi App"
2. App requests access to both MCP servers via `login({ requested: { mcp_servers: [...] } })`
3. A popup opens showing the user what the app is requesting
4. User approves → OAuth token issued with MCP access claims
5. App transitions to chat interface, discovers approved MCP tools

## Key Design Decisions

- **No AI infrastructure in the app** — no API keys, no model hosting, no tool server management
- **System prompt is hardcoded and hidden** — directive style, instructs the LLM to use Exa for search and Notion for export
- **Light theme with Bodhi purple (#a855f7)** — optimized for projector visibility
- **Suggested prompts** — clickable cards in the empty chat state to help users get started
- **Tool call cards** — inline status indicators showing which MCP tool is being called and its progress (pending → executing → completed/error)
- **Markdown rendering** — assistant responses rendered with full markdown support (headings, code blocks, tables, links)
