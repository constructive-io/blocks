// Chat Widget - AI chat interface with page context awareness
export { ChatProvider, useChatContext } from './chat-context';
export { ChatWidget } from './chat-widget';
export { ChatFab } from './chat-fab';
export { toolRegistry } from './tool-registry';
export { getToolUI } from './tool-ui-config';
export type { ChatConfig, LLMSettings, LLMProviderType, EmbeddingsSettings, EmbeddingsProviderType, ScrapedNode } from './chat.types';
export type { ToolEntry } from './tool-registry';
export type { ToolUIConfig } from './tool-ui-config';
export { PROVIDER_PRESETS, DEFAULT_LLM_SETTINGS, EMBEDDINGS_PROVIDER_PRESETS, DEFAULT_EMBEDDINGS_SETTINGS } from './chat.types';
