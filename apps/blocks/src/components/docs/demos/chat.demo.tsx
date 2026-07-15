'use client';

import { ChatProvider } from '@/blocks/chat/chat-context';
import { ChatPanel } from '@/blocks/chat/chat-panel';

export function BlockDemo() {
  return (
    <div className="h-[32rem] w-full max-w-md" data-chat-component="chat-demo" data-chat-mode="embedded">
      <ChatProvider
        config={{
          api: '/api/chat',
          scrape: false,
          storageKey: 'constructive-blocks-chat-demo',
          title: 'Constructive Assistant',
          subtitle: 'Ask about the block you are viewing.',
          suggestions: ['How do I install this block?', 'Which files are included?'],
        }}
      >
        <ChatPanel variant="embedded" />
      </ChatProvider>
    </div>
  );
}
