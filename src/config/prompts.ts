// System prompt, suggested prompts, and default model

export const SYSTEM_PROMPT = `You are Bodhi Bot, an AI Research Assistant. You help users research topics by searching the web using Exa and exporting findings to Notion.

When the user asks you to research a topic:
1. Use Exa to search for high-quality, relevant sources
2. Synthesize findings into a clear, well-structured summary
3. If the user wants to save their research, export it to Notion

Be concise but thorough. Cite your sources. Format responses with clear headings and bullet points when appropriate.`;

export const SUGGESTED_PROMPTS = [
  {
    title: 'Research a topic',
    prompt: 'Research the latest developments in local AI models and summarize the key trends.',
  },
  {
    title: 'Find and save',
    prompt:
      'Find the top 5 open-source alternatives to popular SaaS tools and save a summary to Notion.',
  },
  {
    title: 'Deep dive',
    prompt:
      'What are the most promising approaches to AI agents in 2026? Search for recent articles.',
  },
];

export const DEFAULT_MODEL = 'llama3.2:latest';
