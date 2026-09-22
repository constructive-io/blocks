import type { ReactNode } from 'react';
import { ArrowUp, Paperclip } from 'lucide-react';

import {
  ChatContainer,
  ChatContainerContent,
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputBody,
  PromptInputTextarea,
  ScrollButton,
} from '@constructive-io/ui/ai';
import { Badge } from '@constructive-io/ui/badge';
import { Button } from '@constructive-io/ui/button';

import { SinkCard } from './sink-card';

/**
 * Full-height chat card for Wall 03 — header carries the model badge, the
 * transcript scrolls inside the card, and the composer is pinned to the
 * card's footer hairline.
 */
export function ChatColumn({
  title,
  model,
  children,
  prompt,
}: {
  title: string;
  model: string;
  children: ReactNode;
  prompt?: ReactNode;
}) {
  return (
    <SinkCard
      title={title}
      action={<Badge variant="secondary">{model}</Badge>}
      className="flex h-[760px] flex-col overflow-hidden"
      contentClassName="flex min-h-0 flex-1 flex-col p-0"
      footer={prompt ?? <ChatPrompt placeholder="Ask about your schema…" />}
    >
      <ChatContainer className="min-h-0 flex-1">
        <ChatContainerContent className="px-4 py-4">{children}</ChatContainerContent>
        <ScrollButton />
      </ChatContainer>
    </SinkCard>
  );
}

/** Static composer — attach + send actions, optional slot above the input. */
export function ChatPrompt({ placeholder, top }: { placeholder: string; top?: ReactNode }) {
  return (
    <div className="flex w-full min-w-0 flex-1 flex-col gap-2">
      {top}
      <PromptInput className="rounded-md" onSubmit={() => undefined}>
        <PromptInputBody>
          <PromptInputTextarea placeholder={placeholder} aria-label={placeholder} />
          <PromptInputActions className="justify-between">
            <PromptInputAction tooltip="Attach a file">
              <Button type="button" size="icon-sm" variant="ghost" aria-label="Attach a file">
                <Paperclip className="size-4" aria-hidden />
              </Button>
            </PromptInputAction>
            <PromptInputAction tooltip="Send">
              <Button type="button" size="icon-sm" aria-label="Send message" disabled>
                <ArrowUp className="size-4" aria-hidden />
              </Button>
            </PromptInputAction>
          </PromptInputActions>
        </PromptInputBody>
      </PromptInput>
    </div>
  );
}
