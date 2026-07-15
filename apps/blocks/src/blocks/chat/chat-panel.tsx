'use client';

import { useRef, useState } from 'react';
import { Bot, ChevronDown, Settings, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';

import { cn } from '@/lib/utils';

import { useChatContext } from './chat-context';
import { ChatInput } from './chat-input';
import { ChatMessages } from './chat-messages';
import { ChatSettings } from './chat-settings';

interface ChatPanelProps {
  variant?: 'floating' | 'embedded';
  className?: string;
}

export function ChatPanel({ variant = 'floating', className }: ChatPanelProps) {
  const { messages, isStreaming, error, sendMessage, clearMessages, stop, setIsOpen, addToolApprovalResponse, addToolOutput, settings, updateSettings, embeddingsSettings, updateEmbeddingsSettings, config } =
    useChatContext();
  const inputRef = useRef<HTMLDivElement>(null);
  const [showSettings, setShowSettings] = useState(false);

  const isEmpty = messages.length === 0;
  const isEmbedded = variant === 'embedded';
  const title = config.title;
  const subtitle = config.subtitle;
  const suggestions = config.suggestions ?? [];

  const panelContent = (
    <>
      {showSettings ? (
        <ChatSettings
          settings={settings}
          onSettingsChange={updateSettings}
          embeddingsSettings={embeddingsSettings}
          onEmbeddingsSettingsChange={updateEmbeddingsSettings}
          testEndpoint={config.api ? `${config.api}/test` : undefined}
          onBack={() => setShowSettings(false)}
        />
      ) : (
        <>
          {/* Header */}
          <div className='flex items-center justify-between border-b px-4 py-3'>
            <div className='flex items-center gap-2'>
              <Bot className='text-muted-foreground h-4 w-4' />
              <span className='text-sm font-medium'>{title}</span>
            </div>
            <div className='flex items-center gap-1'>
              {messages.length > 0 && (
                <button
                  type='button'
                  onClick={clearMessages}
                  title='Clear messages'
                  className='text-muted-foreground hover:text-foreground cursor-pointer rounded-xs p-1 transition-colors'
                >
                  <Trash2 className='h-4 w-4' />
                </button>
              )}
              <button
                type='button'
                onClick={() => setShowSettings(true)}
                title='Settings'
                className='text-muted-foreground hover:text-foreground cursor-pointer rounded-xs p-1 transition-colors'
              >
                <Settings className='h-4 w-4' />
              </button>
              {!isEmbedded && (
                <button
                  type='button'
                  onClick={() => setIsOpen(false)}
                  title='Collapse'
                  className='text-muted-foreground hover:text-foreground cursor-pointer rounded-xs p-1 transition-colors'
                >
                  <ChevronDown className='h-4 w-4' />
                </button>
              )}
            </div>
          </div>

          {/* Body */}
          {isEmpty ? (
            <div className='flex flex-1 flex-col items-center justify-center gap-4 px-6 py-8'>
              <div className='bg-muted flex h-10 w-10 items-center justify-center rounded-full'>
                <Bot className='text-muted-foreground h-5 w-5' />
              </div>
              <div className='text-center'>
                <p className='text-sm font-medium'>How can I help?</p>
                <p className='text-muted-foreground mt-1 text-xs'>{subtitle}</p>
              </div>
              {suggestions.length > 0 && (
                <div className='flex w-full flex-col gap-2'>
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type='button'
                      onClick={() => sendMessage(s)}
                      className='bg-muted hover:bg-muted/80 cursor-pointer rounded-md px-3 py-2 text-left text-xs transition-colors'
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <ChatMessages
              messages={messages}
              isStreaming={isStreaming}
              onToolApproval={addToolApprovalResponse}
              onToolOutput={addToolOutput}
            />
          )}

          {/* Error */}
          {error && (
            <div className='border-t px-4 py-2'>
              <p className='text-destructive text-xs'>{error}</p>
            </div>
          )}

          {/* Input */}
          <div ref={inputRef}>
            <ChatInput onSend={sendMessage} onStop={stop} isStreaming={isStreaming} />
          </div>
        </>
      )}
    </>
  );

  if (isEmbedded) {
    return (
      <div className={cn('flex h-full flex-col', className)}>
        <div
          className={cn(
            'flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-white/60 shadow-xs backdrop-blur-lg',
            'dark:bg-white/5 [&_button]:cursor-pointer',
          )}
        >
          {panelContent}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      id='chat-panel'
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 20, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={cn(
        'bg-card fixed bottom-20 right-4 z-[500] flex w-[400px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg border shadow-lg [&_button]:cursor-pointer',
        className,
      )}
      style={{ maxHeight: '600px' }}
    >
      {panelContent}
    </motion.div>
  );
}
