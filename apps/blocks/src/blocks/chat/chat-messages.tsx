'use client';

import { useEffect, useRef } from 'react';
import type { UIMessage } from 'ai';

import { ChatMessageContent } from './chat-message-content';
import { ToolMessage } from './tool-message';
import { toolRegistry } from './tool-registry';

interface ChatMessagesProps {
  messages: UIMessage[];
  isStreaming: boolean;
  onToolApproval: (args: { id: string; approved: boolean }) => void;
  onToolOutput: (args: { toolCallId: string; tool: string; output: string }) => void;
}

function ThinkingDots() {
  const dotStyle = (delay: string): React.CSSProperties => ({
    animation: 'chat-dot-bounce 1.4s infinite ease-in-out both',
    animationDelay: delay,
  });

  return (
    <>
      <style>{`@keyframes chat-dot-bounce { 0%,80%,100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }`}</style>
      <div className='flex items-center gap-1 py-1' role='status'>
        <span className='sr-only'>Assistant is thinking</span>
        <span aria-hidden='true' className='bg-foreground/60 h-1.5 w-1.5 rounded-full' style={dotStyle('0ms')} />
        <span aria-hidden='true' className='bg-foreground/60 h-1.5 w-1.5 rounded-full' style={dotStyle('160ms')} />
        <span aria-hidden='true' className='bg-foreground/60 h-1.5 w-1.5 rounded-full' style={dotStyle('320ms')} />
      </div>
    </>
  );
}

function getTextContent(message: UIMessage): string {
  return message.parts
    .filter((p) => p.type === 'text')
    .map((p) => p.text)
    .join('');
}

export function ChatMessages({ messages, isStreaming, onToolApproval, onToolOutput }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div
      className='flex-1 space-y-3 overflow-y-auto px-4 py-3'
      role='log'
      aria-label='Chat messages'
      aria-live='polite'
      aria-relevant='additions text'
      aria-atomic='false'
      aria-busy={isStreaming}
    >
      {messages.map((message) => {
        const isUser = message.role === 'user';
        const textContent = getTextContent(message);

        return (
          <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm break-words ${
                isUser ? 'bg-primary text-primary-foreground dark:bg-primary/80' : 'bg-muted text-foreground w-full'
              }`}
            >
              {isUser ? (
                <p className='text-pretty whitespace-pre-wrap'>{textContent}</p>
              ) : (
                <>
                  {message.parts.map((part, pi) => {
                    const partType = part.type as string;

                    if (partType === 'text' && 'text' in part && part.text) {
                      return <ChatMessageContent key={pi} content={part.text as string} />;
                    }

                    const toolName = partType.replace('tool-', '');
                    if (toolName in toolRegistry) {
                      const toolPart = part as any;
                      return (
                        <ToolMessage
                          key={pi}
                          toolName={toolName}
                          toolCallId={toolPart.toolCallId}
                          state={toolPart.state}
                          input={toolPart.input}
                          output={toolPart.output}
                          approval={toolPart.approval}
                          stopped={!isStreaming}
                          onApprove={(id) => onToolApproval({ id, approved: true })}
                          onToolOutput={(callId, out) =>
                            onToolOutput({ toolCallId: callId, tool: toolName, output: out })
                          }
                        />
                      );
                    }

                    return null;
                  })}
                </>
              )}
            </div>
          </div>
        );
      })}

      {isStreaming && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
        <div className='flex justify-start'>
          <div className='bg-muted text-foreground max-w-[85%] rounded-lg px-3 py-2 text-sm'>
            <ThinkingDots />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
