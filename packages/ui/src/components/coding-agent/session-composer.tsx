'use client';

import { ArrowUp, AtSign, CornerDownRight, FileCode2, MessageSquare, Paperclip, Plus, Slash, Square, SquareTerminal, X } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { type AiModel, type ModelSelection, ModelSelector } from '../ai/model-selector';
import { PromptInput, PromptInputAction, PromptInputActions, PromptInputTextarea } from '../ai/prompt-input';
import { PromptInputAttachment, PromptInputAttachments } from '../ai/prompt-input-attachment';
import { PromptInputTray, PromptInputTrayRow } from '../ai/prompt-input-tray';
import { UsageNotice, usageTone } from '../ai/usage-notice';
import { Button } from '../button';
import { Command, CommandGroup, CommandGroupLabel, CommandItem, CommandList } from '../command';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../dropdown-menu';
import { iconButtonClass } from '../workspace-kit/primitives';
import type { SlashCommand } from './types';

export type ComposerAttachment = { id: string; kind: 'file' | 'comment'; label: string; detail?: string };

type Suggestion = { id: string; kind: 'command' | 'file'; label: string; detail?: string };

/** The `/command` or `@file` being typed at the caret, if any. */
function activeTrigger(value: string, caret: number) {
	const before = value.slice(0, caret);
	const command = /^\/(\S*)$/.exec(before);
	if (command) return { kind: 'command' as const, query: command[1], start: 0 };
	const mention = /(?:^|\s)@([^\s@]*)$/.exec(before);
	if (mention) return { kind: 'file' as const, query: mention[1], start: caret - mention[1].length - 1 };
	return null;
}

const MAX_SUGGESTIONS = 8;

/**
 * The session composer, assembled from the AI kit's prompt input: a `/` command and `@` file menu at the caret, `!`
 * shell mode, and the model picker. A running session adds attachment and comment chips, a queue of follow-ups typed
 * while the agent works, an "Attach files" item, and a send button that turns into stop mid-run; each shows only
 * when its props are passed, so a new-session draft leaves them out.
 */
export function SessionComposer({
	placeholder: placeholderProp,
	running = false,
	onSubmit,
	onStop,
	attachments = [],
	onRemoveAttachment,
	queued = [],
	onUnqueue,
	commands,
	files,
	models,
	model,
	onModelChange,
	usagePercent,
	onAttachFiles,
	inputRef,
	className
}: {
	placeholder?: string;
	running?: boolean;
	onSubmit: (text: string) => void;
	/** Shows the stop button while `running` and nothing is typed. */
	onStop?: () => void;
	attachments?: ComposerAttachment[];
	/** Gives each attachment chip a remove button. */
	onRemoveAttachment?: (id: string) => void;
	queued?: { id: string; text: string }[];
	/** Gives each queued follow-up a remove button. */
	onUnqueue?: (id: string) => void;
	commands: SlashCommand[];
	files: string[];
	models: AiModel[];
	model: ModelSelection;
	onModelChange: (model: ModelSelection) => void;
	usagePercent?: number;
	/** Adds "Attach files" to the add menu. */
	onAttachFiles?: () => void;
	inputRef?: React.RefObject<HTMLDivElement | null>;
	className?: string;
}) {
	const [value, setValue] = React.useState('');
	const [caret, setCaret] = React.useState(0);
	const [highlight, setHighlight] = React.useState(0);
	const [dismissed, setDismissed] = React.useState<string | null>(null);
	const [usageDismissed, setUsageDismissed] = React.useState(false);
	const wrapper = React.useRef<HTMLDivElement>(null);
	const listId = React.useId();
	// Only promise the shortcuts this workspace actually has.
	const placeholder =
		placeholderProp ??
		['Ask anything', commands.length ? '/ for commands' : null, files.length ? '@ for context' : null].filter(Boolean).join(', ') + '…';

	const trigger = activeTrigger(value, caret);
	const triggerKey = trigger ? `${trigger.kind}:${trigger.start}` : null;
	const suggestions = React.useMemo<Suggestion[]>(() => {
		if (!trigger) return [];
		const query = trigger.query.toLowerCase();
		if (trigger.kind === 'command') {
			return commands
				.filter((command) => command.name.startsWith(query))
				.map((command) => ({ id: command.name, kind: 'command' as const, label: `/${command.name}`, detail: command.description }));
		}
		return files
			.filter((path) => path.toLowerCase().includes(query))
			.slice(0, MAX_SUGGESTIONS)
			.map((path) => ({ id: path, kind: 'file' as const, label: path.split('/').pop() ?? path, detail: path }));
	}, [commands, files, trigger?.kind, trigger?.query]);
	const menuOpen = suggestions.length > 0 && triggerKey !== dismissed;
	const active = suggestions[Math.min(highlight, suggestions.length - 1)];

	React.useEffect(() => setHighlight(0), [triggerKey, trigger?.query]);

	const textarea = () => wrapper.current?.querySelector('textarea');

	const pick = (suggestion: Suggestion) => {
		if (!trigger) return;
		const insert = suggestion.kind === 'command' ? `/${suggestion.id} ` : `@${suggestion.id} `;
		const next = value.slice(0, trigger.start) + insert + value.slice(caret);
		const position = trigger.start + insert.length;
		setValue(next);
		setCaret(position);
		requestAnimationFrame(() => {
			const node = textarea();
			node?.focus();
			node?.setSelectionRange(position, position);
		});
	};

	const insertAtCaret = (text: string) => {
		const next = value.slice(0, caret) + text + value.slice(caret);
		setValue(next);
		setCaret(caret + text.length);
		requestAnimationFrame(() => {
			const node = textarea();
			node?.focus();
			node?.setSelectionRange(caret + text.length, caret + text.length);
		});
	};

	const submit = () => {
		if (menuOpen && active) {
			pick(active);
			return;
		}
		const text = value.trim();
		if (!text) return;
		onSubmit(text);
		setValue('');
		setCaret(0);
	};

	const shell = value.startsWith('!');
	const canSend = value.trim().length > 0;
	const showUsage = usagePercent !== undefined && usagePercent >= 75 && !usageDismissed;
	const header =
		showUsage || queued.length > 0 ? (
			<>
				{showUsage ? <UsageNotice percent={usagePercent} onDismiss={() => setUsageDismissed(true)} /> : null}
				{queued.map((entry) => (
					<PromptInputTrayRow
						key={entry.id}
						icon={<CornerDownRight aria-hidden="true" className="size-3.5 text-muted-foreground" />}
						actions={
							onUnqueue ? (
								<Button size="icon-xs" variant="ghost" aria-label="Remove from queue" className="size-6" onClick={() => onUnqueue(entry.id)}>
									<X className="size-3.5" />
								</Button>
							) : undefined
						}
					>
						<span dir="auto" title={entry.text} className="block min-w-0 truncate">
							<span className="text-muted-foreground">Queued · </span>
							{entry.text}
						</span>
					</PromptInputTrayRow>
				))}
			</>
		) : null;

	return (
		<div ref={inputRef} className={cn('@container/composer relative', className)}>
			{menuOpen ? (
				// The textarea's aria-controls points here; the menu's own list id belongs to the menu library.
				<div id={listId} className="absolute inset-x-0 bottom-full z-20 mb-2 overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
					<Command shouldFilter={false} value={active?.id} loop label={trigger?.kind === 'command' ? 'Commands' : 'Files'}>
						<CommandList className="max-h-64">
							<CommandGroup>
								<CommandGroupLabel>{trigger?.kind === 'command' ? 'Commands' : 'Files'}</CommandGroupLabel>
								{suggestions.map((suggestion, index) => (
									<CommandItem
										key={suggestion.id}
										value={suggestion.id}
										title={suggestion.detail ? `${suggestion.label} · ${suggestion.detail}` : suggestion.label}
										onMouseEnter={() => setHighlight(index)}
										onSelect={() => pick(suggestion)}
										className="gap-2"
									>
										{suggestion.kind === 'command' ? (
											<Slash aria-hidden="true" className="size-3.5 text-muted-foreground" />
										) : (
											<FileCode2 aria-hidden="true" className="size-3.5 text-muted-foreground" />
										)}
										{/* The name keeps priority but never more than 60%, so the detail always gets some room. */}
										<span className={cn('max-w-[60%] shrink-0 truncate text-foreground', suggestion.kind === 'command' && 'font-mono text-[0.8125rem]')}>
											{suggestion.label}
										</span>
										<span dir="auto" className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
											{suggestion.detail}
										</span>
									</CommandItem>
								))}
							</CommandGroup>
						</CommandList>
					</Command>
				</div>
			) : null}
			<PromptInputTray tone={showUsage ? usageTone(usagePercent) : 'neutral'} header={header}>
				<div ref={wrapper}>
					<PromptInput
						value={value}
						onValueChange={setValue}
						onSubmit={submit}
						// A long paste scrolls inside the box instead of pushing the send button out of view.
						maxHeight="min(240px, 30dvh)"
						// A ring and a soft drop instead of an outline, so the composer sits on the page rather than in a box.
						className="rounded-xl border-transparent bg-card p-1.5 shadow-[0_0_0_1px_color-mix(in_oklab,var(--foreground)_8%,transparent),0_2px_8px_-2px_rgb(0_0_0/0.08)]"
					>
						{attachments.length > 0 ? (
							<PromptInputAttachments>
								{attachments.map((attachment) => (
									<PromptInputAttachment
										key={attachment.id}
										name={attachment.label}
										meta={attachment.detail}
										icon={
											attachment.kind === 'comment' ? (
												<MessageSquare aria-hidden="true" className="size-3.5" />
											) : (
												<FileCode2 aria-hidden="true" className="size-3.5" />
											)
										}
										onRemove={onRemoveAttachment ? () => onRemoveAttachment(attachment.id) : undefined}
									/>
								))}
							</PromptInputAttachments>
						) : null}
						<PromptInputTextarea
							aria-label="Message the agent"
							aria-autocomplete="list"
							aria-controls={menuOpen ? listId : undefined}
							aria-expanded={menuOpen}
							placeholder={placeholder}
							// A dismissed menu stays closed until the caret moves into a different trigger.
							onSelect={(event) => setCaret(event.currentTarget.selectionStart)}
							onInput={(event) => setCaret(event.currentTarget.selectionStart)}
							onKeyDown={(event) => {
								if (!menuOpen) return;
								if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
									event.preventDefault();
									const by = event.key === 'ArrowDown' ? 1 : -1;
									setHighlight((index) => (index + by + suggestions.length) % suggestions.length);
								} else if (event.key === 'Tab' && active) {
									event.preventDefault();
									pick(active);
								} else if (event.key === 'Escape') {
									event.preventDefault();
									setDismissed(triggerKey);
								}
							}}
							className={cn('min-h-10 px-1.5 py-1', shell && 'font-mono')}
						/>
						<PromptInputActions className="justify-between px-0">
							<div className="flex min-w-0 flex-1 items-center gap-0.5">
								<DropdownMenu>
									<DropdownMenuTrigger
										aria-label="Add to message"
										title="Add to message"
										// Its neighbours sit 2px away, so the hit area stays inside the box; on touch screens the button grows to 44px instead.
										className={cn(iconButtonClass({ menu: true, extendHitArea: false }), 'pointer-coarse:size-11')}
									>
										<Plus aria-hidden="true" className="size-3.5" />
									</DropdownMenuTrigger>
									<DropdownMenuContent align="start" side="top" className="w-52">
										{onAttachFiles ? (
											<DropdownMenuItem onClick={onAttachFiles}>
												<Paperclip aria-hidden="true" />
												Attach files
											</DropdownMenuItem>
										) : null}
										<DropdownMenuItem onClick={() => insertAtCaret('@')}>
											<AtSign aria-hidden="true" />
											Mention a file
										</DropdownMenuItem>
										<DropdownMenuItem onClick={() => insertAtCaret(value ? '' : '/')}>
											<Slash aria-hidden="true" />
											Run a command
										</DropdownMenuItem>
										<DropdownMenuItem onClick={() => (shell ? null : setValue(`!${value}`))}>
											<SquareTerminal aria-hidden="true" />
											Shell command
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
								{shell ? (
									<span className="flex h-6 shrink-0 items-center gap-1 rounded-md bg-muted px-1.5 font-mono text-xs text-muted-foreground">
										<SquareTerminal aria-hidden="true" className="size-3.5 shrink-0" />
										shell
									</span>
								) : null}
								<ModelSelector
									models={models}
									value={model}
									onValueChange={onModelChange}
									side="top"
									triggerClassName="h-7 min-w-0 px-1.5"
									// On a narrow composer the model name gets the room; the level is one click away.
									levelClassName="@max-sm/composer:hidden"
								/>
							</div>
							{running && !canSend && onStop ? (
								<PromptInputAction tooltip="Stop">
									<Button size="icon-xs" variant="secondary" aria-label="Stop" className="size-7 shrink-0" onClick={onStop}>
										<Square className="size-3.5 fill-current" />
									</Button>
								</PromptInputAction>
							) : (
								<PromptInputAction tooltip={running ? 'Queue for when the agent is done' : 'Send'}>
									<Button
										size="icon-xs"
										variant={canSend ? 'default' : 'secondary'}
										aria-label={running ? 'Queue message' : 'Send'}
										disabled={!canSend}
										className="size-7 shrink-0"
										onClick={submit}
									>
										<ArrowUp className="size-3.5" />
									</Button>
								</PromptInputAction>
							)}
						</PromptInputActions>
					</PromptInput>
				</div>
			</PromptInputTray>
		</div>
	);
}
