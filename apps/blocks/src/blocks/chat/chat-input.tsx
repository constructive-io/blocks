'use client';

import { useCallback, useRef } from 'react';
import { SendHorizontal, Square } from 'lucide-react';

import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (content: string) => void;
  onStop: () => void;
  isStreaming?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, onStop, isStreaming, disabled, placeholder = 'Type a message...' }: ChatInputProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  const handleSend = useCallback(() => {
    const el = editorRef.current;
    if (!el || isStreaming || disabled) return;
    const value = (el.textContent ?? '').trim();
    if (!value) return;
    onSend(value);
    el.innerHTML = '';
    el.style.height = 'auto';
  }, [onSend, isStreaming, disabled]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleInput = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    if (el.innerHTML === '<br>') el.innerHTML = '';
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }, []);

  return (
    <div className='border-t px-3 py-2'>
      <div className='bg-muted/50 relative flex flex-col rounded-lg border'>
        <div
          ref={editorRef}
          contentEditable={!isStreaming && !disabled}
          role='textbox'
          aria-multiline
          aria-label='Chat message'
          aria-disabled={Boolean(isStreaming || disabled)}
          aria-placeholder={placeholder}
          tabIndex={isStreaming || disabled ? -1 : 0}
          data-placeholder={placeholder}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          onPaste={handlePaste}
          className={cn(
            `max-h-[120px] min-h-[3.5rem] flex-1 resize-none overflow-y-auto bg-transparent px-3 pt-2.5 text-sm outline-none
            empty:before:pointer-events-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]`,
            disabled && 'opacity-50',
          )}
        />
        <div className='flex items-center justify-end px-2 py-1.5'>
          {isStreaming ? (
            <button
              type='button'
              onClick={onStop}
              aria-label='Stop generating response'
              className='text-muted-foreground/50 hover:text-muted-foreground shrink-0 cursor-pointer rounded-sm p-1 transition-colors'
            >
              <Square className='h-3.5 w-3.5 fill-current' />
            </button>
          ) : (
            <button
              type='button'
              onClick={handleSend}
              aria-label='Send message'
              disabled={disabled}
              className='text-muted-foreground hover:text-foreground shrink-0 cursor-pointer rounded-sm p-1 transition-colors disabled:opacity-40'
            >
              <SendHorizontal className='h-4 w-4' />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
