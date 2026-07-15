import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UIMessage } from 'ai';

const { useChatContextMock } = vi.hoisted(() => ({
  useChatContextMock: vi.fn(),
}));

vi.mock('./chat-context', () => ({
  useChatContext: () => useChatContextMock(),
}));

import { ChatFab } from './chat-fab';
import { ChatInput } from './chat-input';
import { ChatMessages } from './chat-messages';
import { ChatPanel } from './chat-panel';

function textMessage(id: string, role: 'user' | 'assistant', text: string): UIMessage {
  return {
    id,
    role,
    parts: [{ type: 'text', text }],
  } as UIMessage;
}

function contextValue() {
  return {
    messages: [],
    isStreaming: false,
    error: null,
    sendMessage: vi.fn(),
    clearMessages: vi.fn(),
    stop: vi.fn(),
    setIsOpen: vi.fn(),
    addToolApprovalResponse: vi.fn(),
    addToolOutput: vi.fn(),
    settings: {
      provider: 'anthropic',
      apiKey: '',
      baseUrl: '',
      model: '',
    },
    updateSettings: vi.fn(),
    embeddingsSettings: {
      provider: 'openai',
      apiKey: '',
      baseUrl: '',
      model: '',
      dimensions: 0,
    },
    updateEmbeddingsSettings: vi.fn(),
    config: {
      api: '/api/chat',
      scrape: true,
      title: 'AI Chat',
      subtitle: 'Ask anything about this page.',
      suggestions: [],
      storageKey: 'chat-widget-settings',
    },
  };
}

beforeAll(() => {
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
});

beforeEach(() => {
  useChatContextMock.mockReset();
  useChatContextMock.mockReturnValue(contextValue());
});

describe('chat control accessibility', () => {
  it('names the launcher and relates its closed and open states to the panel', () => {
    const onClick = vi.fn();
    const { rerender } = render(<ChatFab isOpen={false} onClick={onClick} />);

    const closedLauncher = screen.getByRole('button', { name: 'Open chat' });
    expect(closedLauncher).toHaveAttribute('aria-expanded', 'false');
    expect(closedLauncher).toHaveAttribute('aria-controls', 'chat-panel');
    fireEvent.click(closedLauncher);
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(<ChatFab isOpen onClick={onClick} />);
    const openLauncher = screen.getByRole('button', { name: 'Close chat' });
    expect(openLauncher).toHaveAttribute('aria-expanded', 'true');
    expect(openLauncher).toHaveAttribute('aria-controls', 'chat-panel');
  });

  it('labels the editable composer and sends its trimmed content', () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} onStop={vi.fn()} />);

    const editor = screen.getByRole('textbox', { name: 'Chat message' });
    expect(editor).toHaveAttribute('contenteditable', 'true');
    expect(editor).toHaveAttribute('aria-disabled', 'false');
    expect(editor).toHaveAttribute('tabindex', '0');

    editor.textContent = '  Hello from chat  ';
    fireEvent.input(editor);
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(onSend).toHaveBeenCalledWith('Hello from chat');
    expect(editor).toHaveTextContent('');
  });

  it('exposes disabled composer state and disables sending', () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} onStop={vi.fn()} disabled />);

    const editor = screen.getByRole('textbox', { name: 'Chat message' });
    expect(editor).toHaveAttribute('contenteditable', 'false');
    expect(editor).toHaveAttribute('aria-disabled', 'true');
    expect(editor).toHaveAttribute('tabindex', '-1');

    const sendButton = screen.getByRole('button', { name: 'Send message' });
    expect(sendButton).toBeDisabled();
    fireEvent.click(sendButton);
    expect(onSend).not.toHaveBeenCalled();
  });

  it('names the stop control and keeps it operable while streaming', () => {
    const onStop = vi.fn();
    render(<ChatInput onSend={vi.fn()} onStop={onStop} isStreaming />);

    const editor = screen.getByRole('textbox', { name: 'Chat message' });
    expect(editor).toHaveAttribute('aria-disabled', 'true');
    expect(screen.queryByRole('button', { name: 'Send message' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Stop generating response' }));
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('uses stable polite log semantics while streaming only new content', () => {
    const firstMessage = textMessage('user-1', 'user', 'Earlier question');
    const callbacks = { onToolApproval: vi.fn(), onToolOutput: vi.fn() };
    const { rerender } = render(
      <ChatMessages messages={[firstMessage]} isStreaming={false} {...callbacks} />,
    );

    const log = screen.getByRole('log', { name: 'Chat messages' });
    const historicalContent = screen.getByText('Earlier question');
    expect(log).toHaveAttribute('aria-live', 'polite');
    expect(log).toHaveAttribute('aria-relevant', 'additions text');
    expect(log).toHaveAttribute('aria-atomic', 'false');
    expect(log).toHaveAttribute('aria-busy', 'false');

    rerender(<ChatMessages messages={[firstMessage]} isStreaming {...callbacks} />);
    expect(screen.getByRole('log', { name: 'Chat messages' })).toBe(log);
    expect(screen.getByText('Earlier question')).toBe(historicalContent);
    expect(log).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Assistant is thinking');

    const streamedReply = textMessage('assistant-1', 'assistant', 'A new streamed reply');
    rerender(<ChatMessages messages={[firstMessage, streamedReply]} isStreaming {...callbacks} />);
    expect(screen.getByRole('log', { name: 'Chat messages' })).toBe(log);
    expect(screen.getByText('Earlier question')).toBe(historicalContent);
    expect(screen.getByText('A new streamed reply')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    rerender(<ChatMessages messages={[firstMessage, streamedReply]} isStreaming={false} {...callbacks} />);
    expect(log).toHaveAttribute('aria-busy', 'false');
    expect(screen.getByText('Earlier question')).toBe(historicalContent);
  });

  it('renders the panel with the ID controlled by the launcher', () => {
    render(
      <>
        <ChatFab isOpen onClick={vi.fn()} />
        <ChatPanel variant='floating' />
      </>,
    );

    const launcher = screen.getByRole('button', { name: 'Close chat' });
    const panelId = launcher.getAttribute('aria-controls');
    expect(panelId).toBe('chat-panel');
    expect(document.getElementById(panelId!)).toBeInTheDocument();
  });
});
