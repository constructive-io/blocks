import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { marked } from 'marked';

import { ChatMessageContent } from './chat-message-content';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ChatMessageContent', () => {
  it('renders formatted Markdown', () => {
    const { container } = render(<ChatMessageContent content='Hello **friend**.' />);

    expect(container.querySelector('strong')).toHaveTextContent('friend');
    expect(container).toHaveTextContent('Hello friend.');
  });

  it('removes scripts and event-handler attributes', () => {
    const { container } = render(
      <ChatMessageContent content={'<img src="x" onerror="alert(1)"><script>alert(2)</script>'} />,
    );

    expect(container.querySelector('script')).not.toBeInTheDocument();
    expect(container.querySelector('img')).not.toHaveAttribute('onerror');
  });

  it('removes unsafe URL attributes', () => {
    const { container } = render(<ChatMessageContent content='[unsafe](javascript:alert(1))' />);

    expect(container.querySelector('a')).not.toHaveAttribute('href');
  });

  it('sanitizes provider content when Markdown parsing throws', () => {
    vi.spyOn(marked, 'parse').mockImplementationOnce(() => {
      throw new Error('parser failure');
    });

    const { container } = render(
      <ChatMessageContent
        content={'<strong>Fallback</strong><img src="x" onerror="alert(1)"><script>alert(2)</script>'}
      />,
    );

    expect(container.querySelector('strong')).toHaveTextContent('Fallback');
    expect(container.querySelector('script')).not.toBeInTheDocument();
    expect(container.querySelector('img')).not.toHaveAttribute('onerror');
  });
});
