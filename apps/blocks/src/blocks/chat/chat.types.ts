export interface ScrapedNode {
  component: string;
  attributes: Record<string, string>;
}

export interface ChatConfig {
  /** API endpoint for the chat route (default: "/api/chat") */
  api?: string;
  /** Enable DOM scraping for page context (default: true) */
  scrape?: boolean;
  /** Chat window title (default: "AI Chat") */
  title?: string;
  /** Subtitle shown on empty state (default: "Ask anything about this page.") */
  subtitle?: string;
  /** Quick-start suggestion prompts */
  suggestions?: string[];
  /** localStorage key for persisting settings (default: "chat-widget-settings") */
  storageKey?: string;
}

export const DEFAULT_CHAT_CONFIG: Required<Pick<ChatConfig, 'api' | 'title' | 'subtitle' | 'suggestions'>> = {
  api: '/api/chat',
  title: 'AI Chat',
  subtitle: 'Ask anything about this page.',
  suggestions: [
    'What is this page about?',
    'Summarize the main content',
  ],
};

export type LLMProviderType = 'anthropic' | 'openai-compat';

export interface LLMSettings {
  provider: LLMProviderType;
  apiKey: string;
  baseUrl: string;
  model: string;
}

export const PROVIDER_PRESETS: Record<LLMProviderType, { label: string; baseUrl: string; model: string }> = {
  anthropic: { label: 'Anthropic', baseUrl: 'https://api.anthropic.com', model: 'claude-sonnet-4-20250514' },
  'openai-compat': { label: 'OpenAI Compatible', baseUrl: 'http://localhost:11434/v1', model: 'gpt-4o' },
};

export const DEFAULT_LLM_SETTINGS: LLMSettings = {
  provider: 'anthropic',
  apiKey: '',
  baseUrl: '',
  model: '',
};

export type EmbeddingsProviderType = 'openai' | 'openai-compat';

export interface EmbeddingsSettings {
  provider: EmbeddingsProviderType;
  apiKey: string;
  baseUrl: string;
  model: string;
  dimensions: number;
}

export const EMBEDDINGS_PROVIDER_PRESETS: Record<
  EmbeddingsProviderType,
  { label: string; baseUrl: string; model: string; dimensions: number }
> = {
  openai: { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'text-embedding-3-small', dimensions: 1536 },
  'openai-compat': {
    label: 'OpenAI Compatible',
    baseUrl: 'http://localhost:11434/v1',
    model: 'nomic-embed-text',
    dimensions: 768,
  },
};

export const DEFAULT_EMBEDDINGS_SETTINGS: EmbeddingsSettings = {
  provider: 'openai',
  apiKey: '',
  baseUrl: '',
  model: '',
  dimensions: 0,
};
