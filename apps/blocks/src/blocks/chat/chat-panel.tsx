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
                  aria-label='Clear messages'
                  className='text-muted-foreground hover:text-foreground inline-flex size-11 cursor-pointer items-center justify-center rounded-md transition-[color,scale] duration-150 ease-out motion-safe:active:scale-[0.96] motion-reduce:transition-none sm:size-10'
                >
                  <Trash2 className='h-4 w-4' />
                </button>
              )}
              <button
                type='button'
                onClick={() => setShowSettings(true)}
                aria-label='Open chat settings'
                className='text-muted-foreground hover:text-foreground inline-flex size-11 cursor-pointer items-center justify-center rounded-md transition-[color,scale] duration-150 ease-out motion-safe:active:scale-[0.96] motion-reduce:transition-none sm:size-10'
              >
                <Settings className='h-4 w-4' />
              </button>
              {!isEmbedded && (
                <button
                  type='button'
                  onClick={() => setIsOpen(false)}
                  aria-label='Collapse chat'
                  className='text-muted-foreground hover:text-foreground inline-flex size-11 cursor-pointer items-center justify-center rounded-md transition-[color,scale] duration-150 ease-out motion-safe:active:scale-[0.96] motion-reduce:transition-none sm:size-10'
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
                <p className='text-pretty text-sm font-medium'>How can I help?</p>
                <p className='text-muted-foreground mt-1 text-pretty text-xs'>{subtitle}</p>
              </div>
              {suggestions.length > 0 && (
                <div className='flex w-full flex-col gap-2'>
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type='button'
                      onClick={() => sendMessage(s)}
                      className='bg-muted hover:bg-muted/80 min-h-11 cursor-pointer rounded-md px-3 py-2 text-left text-pretty text-xs transition-[background-color,scale] duration-150 ease-out motion-safe:active:scale-[0.96] motion-reduce:transition-none sm:min-h-10'
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
              <p className='text-destructive text-pretty text-xs'>{error}</p>
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
            'bg-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border shadow-xs',
            '[&_button]:cursor-pointer',
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
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 12, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={cn(
        'bg-card fixed z-40 flex w-[400px] max-w-[calc(100vw-2rem-env(safe-area-inset-left)-env(safe-area-inset-right))] flex-col overflow-hidden rounded-lg border shadow-lg [right:calc(1rem+env(safe-area-inset-right))] [bottom:calc(5rem+env(safe-area-inset-bottom))] [&_button]:cursor-pointer',
        className,
      )}
      style={{
        maxHeight:
          'min(600px, calc(100dvh - 7rem - env(safe-area-inset-top) - env(safe-area-inset-bottom)))',
      }}
    >
      {panelContent}
    </motion.div>
  );
}
