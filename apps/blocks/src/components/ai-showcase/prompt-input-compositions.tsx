'use client';

import {
  ArrowUp,
  AtSign,
  CornerDownRight,
  Globe,
  Mic,
  Paperclip,
  RotateCw,
  Sparkles,
  Square,
  Telescope,
  WifiOff,
  X,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';

import {
  type ModelSelection,
  ModelSelector,
  ContextRing,
  PlanTracker,
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputTextarea,
  PromptInputTray,
  PromptInputTrayRow,
  PromptSuggestion,
  PromptSuggestions,
  UsageNotice,
  usageTone,
} from '@constructive-io/ui/ai';
import { Button } from '@constructive-io/ui/button';
import { Kbd } from '@constructive-io/ui/kbd';

import { cn } from '@/lib/utils';

import { DEMO_AI_MODELS } from './model-selector-demo';

function Case({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-2.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <p className="text-[11px] font-medium tracking-wide text-foreground uppercase">{label}</p>
        <p className="text-[12px] text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

function IconAction({
  label,
  onClick,
  pressed,
  children,
}: {
  label: string;
  onClick?: () => void;
  pressed?: boolean;
  children: ReactNode;
}) {
  return (
    <PromptInputAction tooltip={label}>
      <Button
        aria-label={label}
        aria-pressed={pressed}
        className="size-8"
        onClick={onClick}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        {children}
      </Button>
    </PromptInputAction>
  );
}

function SendButton({ disabled, onClick }: { disabled: boolean; onClick?: () => void }) {
  return (
    <PromptInputAction tooltip="Send">
      <Button
        aria-label="Send"
        className="size-8"
        disabled={disabled}
        onClick={onClick}
        size="icon-sm"
        type="button"
        variant={disabled ? 'secondary' : 'default'}
      >
        <ArrowUp className="size-4" />
      </Button>
    </PromptInputAction>
  );
}

/** A working composer: controlled text, send on Enter, and slots around the textarea. */
function Composer({
  placeholder = 'Ask the agent…',
  above,
  leading,
  trailing,
  disabled,
  shape,
  className,
}: {
  placeholder?: string;
  above?: ReactNode;
  leading?: ReactNode;
  trailing?: (state: { value: string; send: () => void }) => ReactNode;
  disabled?: boolean;
  shape?: 'default' | 'pill';
  className?: string;
}) {
  const [value, setValue] = useState('');
  const send = () => setValue('');
  return (
    <PromptInput
      className={cn('@container/composer bg-card', className)}
      disabled={disabled}
      onSubmit={() => (value.trim() ? send() : undefined)}
      onValueChange={setValue}
      shape={shape}
      value={value}
    >
      {above}
      <PromptInputTextarea placeholder={placeholder} />
      <PromptInputActions className="justify-between">
        <div className="flex min-w-0 items-center gap-1">
          <IconAction label="Attach a file">
            <Paperclip className="size-4" />
          </IconAction>
          {leading}
        </div>
        {trailing ? trailing({ value, send }) : <SendButton disabled={!value.trim()} onClick={send} />}
      </PromptInputActions>
    </PromptInput>
  );
}

function ModelMenu() {
  const [model, setModel] = useState<ModelSelection>({ modelId: 'claude-5', levelId: 'medium' });
  return (
    <ModelSelector
      models={DEMO_AI_MODELS}
      onValueChange={setModel}
      pinnedIds={['auto']}
      recentIds={['claude-5', 'gpt-5']}
      recommendedIds={['sonnet-5', 'gpt-5-mini', 'scout']}
      value={model}
    />
  );
}

function ToolToggle({ icon, label }: { icon: ReactNode; label: string }) {
  const [on, setOn] = useState(false);
  return (
    <button
      aria-pressed={on}
      className={cn(
        'flex h-8 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 text-[13px] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-safe:active:scale-[0.96] [&_svg]:size-3.5',
        'transition-transform duration-(--duration-fast)',
        on ? 'border-primary/40 bg-primary/10 text-link' : 'border-border text-muted-foreground hover:bg-overlay-hover hover:text-foreground',
      )}
      onClick={() => setOn((value) => !value)}
      type="button"
    >
      {icon}
      <span className="hidden @sm/composer:inline">{label}</span>
      <span className="sr-only @sm/composer:hidden">{label}</span>
    </button>
  );
}

const PREVIEW =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cdefs%3E%3ClinearGradient id='a' x2='1' y2='1'%3E%3Cstop stop-color='%2360a5fa'/%3E%3Cstop offset='1' stop-color='%23a78bfa'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='32' height='32' fill='url(%23a)'/%3E%3Ccircle cx='22' cy='10' r='4' fill='%23fff' opacity='.8'/%3E%3Cpath d='M0 26l9-9 7 7 5-4 11 10H0z' fill='%23fff' opacity='.6'/%3E%3C/svg%3E";

type Staged = { id: string; name: string; meta: string; status: 'ready' | 'uploading' | 'error'; previewUrl?: string };

const STAGED: Staged[] = [
  { id: 'shot', name: 'checkout-v3.png', meta: 'PNG · 820 KB', status: 'ready', previewUrl: PREVIEW },
  { id: 'brief', name: 'Q3 discovery brief.pdf', meta: 'PDF · 2.4 MB', status: 'ready' },
  { id: 'export', name: 'tickets-week-38.csv', meta: 'Uploading 64%', status: 'uploading' },
  { id: 'deck', name: 'board-deck-final.key', meta: 'Too large (max 25 MB)', status: 'error' },
];

function AttachmentsCase() {
  const [files, setFiles] = useState(STAGED);
  return (
    <Composer
      above={
        files.length ? (
          <PromptInputAttachments>
            {files.map((file) => (
              <PromptInputAttachment
                key={file.id}
                meta={file.meta}
                name={file.name}
                onRemove={() => setFiles((current) => current.filter((item) => item.id !== file.id))}
                previewUrl={file.previewUrl}
                status={file.status}
              />
            ))}
          </PromptInputAttachments>
        ) : null
      }
      placeholder="Describe what to do with these files…"
    />
  );
}

function StreamingCase() {
  const [running, setRunning] = useState(true);
  return (
    <PromptInput className="bg-card" isLoading={running} onSubmit={() => setRunning(true)}>
      <PromptInputTextarea placeholder={running ? 'The agent is working… add a follow-up after it stops' : 'Ask the agent…'} />
      <PromptInputActions className="justify-between">
        <span className="flex items-center gap-1.5 px-1 text-[13px] text-muted-foreground">
          {running ? (
            <>
              <Sparkles aria-hidden="true" className="size-3.5 motion-safe:animate-pulse" />
              Working · 3 of 5 steps
            </>
          ) : (
            'Stopped'
          )}
        </span>
        {running ? (
          <PromptInputAction tooltip="Stop">
            <Button aria-label="Stop" className="size-8" onClick={() => setRunning(false)} size="icon-sm" type="button">
              <Square className="size-3 fill-current" />
            </Button>
          </PromptInputAction>
        ) : (
          <Button onClick={() => setRunning(true)} size="xs" type="button" variant="outline">
            <RotateCw className="size-3.5" />
            Resume
          </Button>
        )}
      </PromptInputActions>
    </PromptInput>
  );
}

function UsageCase({ percent }: { percent: number }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="flex flex-col gap-3">
      <PromptInputTray
        header={open ? <UsageNotice actionHref="#usage" onDismiss={() => setOpen(false)} percent={percent} /> : null}
        tone={usageTone(percent)}
      >
        <Composer leading={<ModelMenu />} />
      </PromptInputTray>
      {open ? null : (
        <Button className="self-start" onClick={() => setOpen(true)} size="xs" type="button" variant="outline">
          Show notice
        </Button>
      )}
    </div>
  );
}

function ReplyCase() {
  const [replying, setReplying] = useState(true);
  return (
    <PromptInputTray
      header={
        replying ? (
          <PromptInputTrayRow
            actions={
              <Button aria-label="Cancel reply" className="size-6" onClick={() => setReplying(false)} size="icon-xs" type="button" variant="ghost">
                <X className="size-3.5" />
              </Button>
            }
            icon={<CornerDownRight />}
          >
            <p className="truncate">
              Replying to <span className="font-medium">“Three themes carry most of it…”</span>
            </p>
          </PromptInputTrayRow>
        ) : null
      }
    >
      <Composer placeholder={replying ? 'Reply to this part…' : 'Ask the agent…'} />
    </PromptInputTray>
  );
}

export function PromptInputCompositions() {
  return (
    <div className="flex w-full max-w-xl flex-col gap-8">
      <Case description="Attach and send; send stays disabled until there is text. Enter sends, Shift+Enter adds a line." label="Default">
        <Composer />
      </Case>

      <Case description="ModelSelector with reasoning levels and cost, tool toggles (aria-pressed), and a context ring." label="Model and tools">
        <Composer
          leading={
            <>
              <ModelMenu />
              <ToolToggle icon={<Globe />} label="Search" />
              <ToolToggle icon={<Telescope />} label="Deep research" />
            </>
          }
          trailing={({ value, send }) => (
            <div className="flex items-center gap-1.5">
              <ContextRing usage={{ tokens: 48_000, percent: 42, contextWindow: 128_000 }} />
              <SendButton disabled={!value.trim()} onClick={send} />
            </div>
          )}
        />
      </Case>

      <Case description="isLoading locks the textarea and swaps send for stop; the status line says what is running." label="Streaming">
        <StreamingCase />
      </Case>

      <Case description="Staged files above the textarea: image preview, document, uploading, and a rejected file." label="Attachments">
        <AttachmentsCase />
      </Case>

      <Case description="PromptInputTray docks a dismissible UsageNotice onto the composer; usageTone picks warning at 75%." label="Usage notice">
        <UsageCase percent={80} />
      </Case>

      <Case description="At 90% and above the tray turns to danger. The composer stays usable until the host blocks it." label="Near the limit">
        <UsageCase percent={96} />
      </Case>

      <Case description="Budget exhausted: danger tray with an upgrade action and a disabled composer." label="Out of tokens">
        <PromptInputTray
          header={
            <PromptInputTrayRow
              actions={
                <Button size="xs" type="button">
                  Upgrade
                </Button>
              }
              icon={<Sparkles />}
            >
              <p>You&apos;ve used all your tokens. They reset on Oct 1.</p>
            </PromptInputTrayRow>
          }
          tone="danger"
        >
          <Composer disabled placeholder="Upgrade to keep chatting" />
        </PromptInputTray>
      </Case>

      <Case description="Transport trouble reported in place, with a retry that does not discard the draft." label="Connection lost">
        <PromptInputTray
          header={
            <PromptInputTrayRow
              actions={
                <Button size="xs" type="button" variant="outline">
                  <RotateCw className="size-3.5" />
                  Retry
                </Button>
              }
              icon={<WifiOff />}
            >
              <p>Connection lost. Your message is kept and will send when you retry.</p>
            </PromptInputTrayRow>
          }
          tone="warning"
        >
          <Composer />
        </PromptInputTray>
      </Case>

      <Case description="A neutral tray row scopes the next message to a quoted passage; cancel returns to a normal composer." label="Replying to a passage">
        <ReplyCase />
      </Case>

      <Case description="Header names the agent the message goes to; footer carries keyboard hints and a disclaimer." label="Addressed agent and footer">
        <PromptInputTray
          footer={
            <PromptInputTrayRow className="text-xs text-muted-foreground">
              <p>
                <Kbd>Enter</Kbd> to send · <Kbd>Shift</Kbd> <Kbd>Enter</Kbd> for a new line · Agents can make mistakes.
              </p>
            </PromptInputTrayRow>
          }
          header={
            <PromptInputTrayRow icon={<AtSign />}>
              <p>
                Talking to <span className="font-medium">Revenue Analyst</span>
              </p>
            </PromptInputTrayRow>
          }
          tone="info"
        >
          <Composer placeholder="Ask Revenue Analyst…" />
        </PromptInputTray>
      </Case>

      <Case description="PlanTracker with flushBottom stacks on a composer with rounded-t-none to read as one shell." label="Plan above the composer">
        <div>
          <PlanTracker
            plan={{
              steps: [
                { label: 'Read project context', status: 'done' },
                { label: 'Draft schema changes', status: 'in_progress' },
                { label: 'Open PR summary', status: 'pending' },
              ],
            }}
            streaming
          />
          <Composer className="rounded-t-none" />
        </div>
      </Case>

      <Case description="Follow-up chips under the composer for the next likely prompts." label="With suggestions">
        <div className="flex flex-col gap-2">
          <Composer />
          <PromptSuggestions>
            <PromptSuggestion>Summarise the top three themes</PromptSuggestion>
            <PromptSuggestion>Draft replies for urgent tickets</PromptSuggestion>
            <PromptSuggestion>File it under Support / Weekly</PromptSuggestion>
          </PromptSuggestions>
        </div>
      </Case>

      <Case description="shape=&quot;pill&quot; for compact surfaces, with voice input beside send." label="Pill">
        <Composer
          placeholder="Message…"
          shape="pill"
          trailing={({ value, send }) => (
            <div className="flex items-center gap-1">
              <IconAction label="Dictate">
                <Mic className="size-4" />
              </IconAction>
              <SendButton disabled={!value.trim()} onClick={send} />
            </div>
          )}
        />
      </Case>

      <Case description="Every row wraps inside a 320px container; the notice text and tool labels reflow instead of overflowing." label="Narrow container">
        <div className="w-full max-w-[320px]">
          <PromptInputTray header={<UsageNotice actionHref="#usage" onDismiss={() => {}} percent={80} />} tone="warning">
            <Composer
              leading={
                <>
                  <ModelMenu />
                  <ToolToggle icon={<Globe />} label="Search" />
                </>
              }
            />
          </PromptInputTray>
        </div>
      </Case>
    </div>
  );
}
