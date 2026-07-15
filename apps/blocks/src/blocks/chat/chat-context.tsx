'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useChat as useAIChat } from '@ai-sdk/react';
import type { UIMessage } from 'ai';
import { DefaultChatTransport } from 'ai';

import {
  type ChatConfig,
  DEFAULT_CHAT_CONFIG,
  DEFAULT_EMBEDDINGS_SETTINGS,
  DEFAULT_LLM_SETTINGS,
  type EmbeddingsSettings,
  type LLMSettings,
} from './chat.types';
import { scrapePageContext } from './dom-scraper';
import { toolRegistry } from './tool-registry';

// ---------------------------------------------------------------------------
// Settings persistence
// ---------------------------------------------------------------------------
type SettingsWithApiKey = { apiKey: string };

function withoutApiKey<T extends SettingsWithApiKey>(settings: T): Omit<T, 'apiKey'> {
  const { apiKey: _apiKey, ...persisted } = settings;
  return persisted;
}

function loadFromStorage<T extends SettingsWithApiKey>(storageKey: string, defaults: T): T {
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return defaults;
    const stored = { ...defaults, ...JSON.parse(raw) } as T;
    return { ...defaults, ...withoutApiKey(stored) } as T;
  } catch {
    return defaults;
  }
}

function saveToStorage(storageKey: string, value: unknown) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    // localStorage unavailable
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
interface ChatContextValue {
  // Chat state
  messages: UIMessage[];
  isStreaming: boolean;
  error: string | null;
  sendMessage: (content: string) => void;
  clearMessages: () => void;
  stop: () => void;
  // Tool support
  addToolApprovalResponse: (args: { id: string; approved: boolean }) => void;
  addToolOutput: (args: { toolCallId: string; tool: string; output: string }) => void;
  // UI state
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggle: () => void;
  // Settings
  settings: LLMSettings;
  updateSettings: (patch: Partial<LLMSettings>) => void;
  embeddingsSettings: EmbeddingsSettings;
  updateEmbeddingsSettings: (patch: Partial<EmbeddingsSettings>) => void;
  // Config
  config: ChatConfig;
}

const ChatContext = createContext<ChatContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function ChatProvider({ config: configProp, children }: { config?: ChatConfig; children: React.ReactNode }) {
  const config = useMemo<ChatConfig>(
    () => ({ ...DEFAULT_CHAT_CONFIG, ...configProp }),
    [configProp],
  );
  const storageKey = config.storageKey ?? 'chat-widget-settings';
  const scrape = config.scrape !== false;

  // UI state
  const [isOpen, setIsOpen] = useState(false);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  // Settings state (persisted to localStorage)
  const [settings, setSettings] = useState<LLMSettings>(() => loadFromStorage(storageKey, DEFAULT_LLM_SETTINGS));
  const updateSettings = useCallback((patch: Partial<LLMSettings>) => {
    setSettings((previous) => ({ ...previous, ...patch }));
  }, []);

  useEffect(() => {
    saveToStorage(storageKey, withoutApiKey(settings));
  }, [storageKey, settings]);

  // Embeddings settings
  const embeddingsKey = `${storageKey}-embeddings`;
  const [embeddingsSettings, setEmbeddingsSettings] = useState<EmbeddingsSettings>(() =>
    loadFromStorage(embeddingsKey, DEFAULT_EMBEDDINGS_SETTINGS),
  );
  const updateEmbeddingsSettings = useCallback((patch: Partial<EmbeddingsSettings>) => {
    setEmbeddingsSettings((previous) => ({ ...previous, ...patch }));
  }, []);

  useEffect(() => {
    saveToStorage(embeddingsKey, withoutApiKey(embeddingsSettings));
  }, [embeddingsKey, embeddingsSettings]);

  // One-shot guard for auto-send
  const autoSentRef = useRef(false);

  // Chat transport
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: config.api!,
        body: () => ({
          ...(scrape ? { context: scrapePageContext() } : {}),
          providerConfig: settings,
          embeddingsConfig: embeddingsSettings,
        }),
      }),
    [config.api, scrape, settings, embeddingsSettings],
  );

  const {
    messages,
    status,
    error,
    sendMessage: aiSendMessage,
    setMessages,
    clearError,
    addToolApprovalResponse,
    addToolOutput,
    stop,
  } = useAIChat({
    transport,
    sendAutomaticallyWhen: ({ messages: msgs }) => {
      const lastMsg = msgs[msgs.length - 1];
      if (lastMsg?.role !== 'assistant') return false;

      const approvalParts = lastMsg.parts.filter((p) => {
        const name = (p.type as string).replace('tool-', '');
        return toolRegistry[name]?.needsApproval === true;
      });
      if (approvalParts.length === 0) return false;

      const hasPending = approvalParts.some((p) => {
        const s = (p as any).state;
        return s === 'input-streaming' || s === 'input-available' || s === 'approval-requested';
      });
      if (hasPending) {
        autoSentRef.current = false;
        return false;
      }
      if (autoSentRef.current) return false;

      const allResolved = approvalParts.every((p) => {
        const s = (p as any).state;
        return s === 'output-available' || s === 'output-denied' || s === 'output-error';
      });
      if (!allResolved) return false;

      const anyRejected = approvalParts.some((p) => {
        const out = (p as any).output;
        if (!out) return false;
        try {
          return JSON.parse(out)?.rejected === true;
        } catch {
          return false;
        }
      });
      if (anyRejected) {
        autoSentRef.current = true;
        return false;
      }

      autoSentRef.current = true;
      return true;
    },
  });

  const isStreaming = status === 'streaming' || status === 'submitted';

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;
      autoSentRef.current = false;
      await aiSendMessage({ text: content.trim() });
    },
    [aiSendMessage, isStreaming],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    clearError();
    autoSentRef.current = false;
  }, [setMessages, clearError]);

  const value = useMemo<ChatContextValue>(
    () => ({
      messages,
      isStreaming,
      error: error?.message && /^\s*</.test(error.message)
        ? 'Failed to reach the chat API. Check that the endpoint is configured correctly.'
        : error?.message ?? null,
      sendMessage,
      clearMessages,
      stop,
      addToolApprovalResponse,
      addToolOutput,
      isOpen,
      setIsOpen,
      toggle,
      settings,
      updateSettings,
      embeddingsSettings,
      updateEmbeddingsSettings,
      config,
    }),
    [messages, isStreaming, error, sendMessage, clearMessages, stop, addToolApprovalResponse, addToolOutput, isOpen, toggle, settings, updateSettings, embeddingsSettings, updateEmbeddingsSettings, config],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChatContext() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChatContext must be used within ChatProvider');
  return ctx;
}
