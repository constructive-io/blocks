import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sentBodies } = vi.hoisted(() => ({
  sentBodies: [] as Record<string, unknown>[],
}));

vi.mock('ai', () => ({
  DefaultChatTransport: class MockChatTransport {
    constructor(public readonly options: { body: () => Record<string, unknown> }) {}
  },
}));

vi.mock('@ai-sdk/react', () => ({
  useChat: ({ transport }: { transport: { options: { body: () => Record<string, unknown> } } }) => ({
    messages: [],
    status: 'ready',
    error: null,
    sendMessage: async () => {
      sentBodies.push(transport.options.body());
    },
    setMessages: vi.fn(),
    clearError: vi.fn(),
    addToolApprovalResponse: vi.fn(),
    addToolOutput: vi.fn(),
    stop: vi.fn(),
  }),
}));

import { ChatProvider, useChatContext } from './chat-context';

const STORAGE_KEY = 'chat-context-test-settings';
const EMBEDDINGS_KEY = `${STORAGE_KEY}-embeddings`;
const CHAT_CONFIG = { api: '/api/chat', scrape: false, storageKey: STORAGE_KEY } as const;

function ChatHarness() {
  const {
    settings,
    updateSettings,
    embeddingsSettings,
    updateEmbeddingsSettings,
    sendMessage,
  } = useChatContext();

  return (
    <>
      <output data-testid='llm-settings'>{JSON.stringify(settings)}</output>
      <output data-testid='embeddings-settings'>{JSON.stringify(embeddingsSettings)}</output>
      <button
        type='button'
        onClick={() => {
          updateSettings({
            provider: 'openai-compat',
            apiKey: 'active-llm-secret',
            baseUrl: 'https://llm.example.test/v1',
            model: 'current-chat-model',
          });
          updateEmbeddingsSettings({
            provider: 'openai-compat',
            apiKey: 'active-embeddings-secret',
            baseUrl: 'https://embeddings.example.test/v1',
            model: 'current-embeddings-model',
            dimensions: 1024,
          });
        }}
      >
        Update settings
      </button>
      <button type='button' onClick={() => sendMessage('Use current settings')}>
        Send message
      </button>
    </>
  );
}

function renderProvider() {
  return render(
    <ChatProvider config={CHAT_CONFIG}>
      <ChatHarness />
    </ChatProvider>,
  );
}

function displayedSettings(testId: string) {
  return JSON.parse(screen.getByTestId(testId).textContent ?? '{}') as Record<string, unknown>;
}

function storedSettings(storageKey: string) {
  return JSON.parse(localStorage.getItem(storageKey) ?? '{}') as Record<string, unknown>;
}

beforeEach(() => {
  localStorage.clear();
  sentBodies.length = 0;
});

describe('ChatProvider settings', () => {
  it('ignores and removes legacy stored API keys while retaining non-secret settings', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        provider: 'openai-compat',
        apiKey: 'legacy-llm-secret',
        baseUrl: 'https://legacy-llm.example.test/v1',
        model: 'legacy-chat-model',
      }),
    );
    localStorage.setItem(
      EMBEDDINGS_KEY,
      JSON.stringify({
        provider: 'openai-compat',
        apiKey: 'legacy-embeddings-secret',
        baseUrl: 'https://legacy-embeddings.example.test/v1',
        model: 'legacy-embeddings-model',
        dimensions: 768,
      }),
    );

    renderProvider();

    expect(displayedSettings('llm-settings')).toMatchObject({
      apiKey: '',
      baseUrl: 'https://legacy-llm.example.test/v1',
      model: 'legacy-chat-model',
    });
    expect(displayedSettings('embeddings-settings')).toMatchObject({
      apiKey: '',
      baseUrl: 'https://legacy-embeddings.example.test/v1',
      model: 'legacy-embeddings-model',
      dimensions: 768,
    });

    await waitFor(() => {
      expect(storedSettings(STORAGE_KEY)).not.toHaveProperty('apiKey');
      expect(storedSettings(EMBEDDINGS_KEY)).not.toHaveProperty('apiKey');
    });
    expect(localStorage.getItem(STORAGE_KEY)).not.toContain('legacy-llm-secret');
    expect(localStorage.getItem(EMBEDDINGS_KEY)).not.toContain('legacy-embeddings-secret');
  });

  it('persists non-secret settings across remounts without persisting current API keys', async () => {
    const firstMount = renderProvider();
    fireEvent.click(screen.getByRole('button', { name: 'Update settings' }));

    await waitFor(() => {
      expect(displayedSettings('llm-settings').apiKey).toBe('active-llm-secret');
      expect(displayedSettings('embeddings-settings').apiKey).toBe('active-embeddings-secret');
      expect(storedSettings(STORAGE_KEY)).toMatchObject({
        provider: 'openai-compat',
        baseUrl: 'https://llm.example.test/v1',
        model: 'current-chat-model',
      });
      expect(storedSettings(EMBEDDINGS_KEY)).toMatchObject({
        provider: 'openai-compat',
        baseUrl: 'https://embeddings.example.test/v1',
        model: 'current-embeddings-model',
        dimensions: 1024,
      });
    });
    expect(storedSettings(STORAGE_KEY)).not.toHaveProperty('apiKey');
    expect(storedSettings(EMBEDDINGS_KEY)).not.toHaveProperty('apiKey');
    expect(localStorage.getItem(STORAGE_KEY)).not.toContain('active-llm-secret');
    expect(localStorage.getItem(EMBEDDINGS_KEY)).not.toContain('active-embeddings-secret');

    firstMount.unmount();
    renderProvider();

    expect(displayedSettings('llm-settings')).toMatchObject({
      provider: 'openai-compat',
      apiKey: '',
      baseUrl: 'https://llm.example.test/v1',
      model: 'current-chat-model',
    });
    expect(displayedSettings('embeddings-settings')).toMatchObject({
      provider: 'openai-compat',
      apiKey: '',
      baseUrl: 'https://embeddings.example.test/v1',
      model: 'current-embeddings-model',
      dimensions: 1024,
    });
  });

  it('uses the latest committed in-memory settings in the next transport request', async () => {
    renderProvider();
    fireEvent.click(screen.getByRole('button', { name: 'Update settings' }));

    await waitFor(() => expect(displayedSettings('llm-settings').apiKey).toBe('active-llm-secret'));
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() => expect(sentBodies).toHaveLength(1));
    expect(sentBodies[0]).toEqual({
      providerConfig: {
        provider: 'openai-compat',
        apiKey: 'active-llm-secret',
        baseUrl: 'https://llm.example.test/v1',
        model: 'current-chat-model',
      },
      embeddingsConfig: {
        provider: 'openai-compat',
        apiKey: 'active-embeddings-secret',
        baseUrl: 'https://embeddings.example.test/v1',
        model: 'current-embeddings-model',
        dimensions: 1024,
      },
    });
  });
});
