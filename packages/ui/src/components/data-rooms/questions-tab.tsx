'use client';

import { ArrowLeft, CheckCheck, MessageSquarePlus, MessagesSquare, RotateCcw, Sparkles, UserRound, X } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../button';
import { Input } from '../input';
import { Textarea } from '../textarea';
import { enterClass, FilterGroup, focusRingClass, SearchField, SurfaceBody, surfaceInsetClass, ToneBadge, TooltipIconButton } from '../workspace-kit/primitives';
import { EmptyState } from '../workspace-kit/surface';
import { visibleDocuments, visibleQuestions } from './access';
import { useDataRooms } from './data-rooms-context';
import { ChoiceSelect, DocumentGlyph, PersonAvatar } from './parts';
import type { Citation, DataRoomDocument, QuestionStatus, QuestionThread, Room } from './types';
import { useCommand } from './use-command';

type Filter = QuestionStatus | 'all';

const FILTERS: { value: Filter; label: string }[] = [
	{ value: 'open', label: 'Open' },
	{ value: 'answered', label: 'Answered' },
	{ value: 'closed', label: 'Closed' },
	{ value: 'all', label: 'All' },
];

const STATUS = {
	open: { label: 'Open', tone: 'warning' },
	answered: { label: 'Answered', tone: 'success' },
	closed: { label: 'Closed', tone: 'neutral' },
} as const;

const STATUS_ORDER: Record<QuestionStatus, number> = { open: 0, answered: 1, closed: 2 };

/** Threads the acting person may read, open ones first, newest first within a status. */
function useVisibleThreads(room: Room) {
	const { data, actingId } = useDataRooms();
	return React.useMemo(
		() => [...visibleQuestions(data, actingId, room.id)].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.askedAt.localeCompare(a.askedAt)),
		[actingId, data, room.id],
	);
}

function QuestionRow({ question, selected, onSelect }: { question: QuestionThread; selected: boolean; onSelect: () => void }) {
	const { person, document, format, actingId } = useDataRooms();
	const asker = person(question.askedBy);
	const doc = question.documentId ? document(question.documentId) : undefined;
	const mine = question.assigneeId === actingId && question.status === 'open';
	return (
		<li>
			<button
				type="button"
				aria-current={selected ? 'true' : undefined}
				onClick={onSelect}
				className={cn('flex w-full cursor-pointer items-start gap-3 rounded-lg px-2.5 py-2.5 text-left', focusRingClass, selected ? 'bg-muted' : 'hover:bg-overlay-hover')}
			>
				<PersonAvatar person={asker} />
				<span className="flex min-w-0 flex-1 flex-col gap-0.5">
					<span className="flex items-baseline gap-2">
						<span className={cn('min-w-0 flex-1 truncate text-sm text-foreground', question.status === 'open' && 'font-medium')}>{question.title}</span>
						<span className="shrink-0 text-xs text-subtle-foreground tabular-nums">{format.relative(question.askedAt)}</span>
					</span>
					<span className="truncate text-[13px] text-muted-foreground">
						{asker?.name ?? 'Someone'}
						{asker?.company ? ` · ${asker.company}` : ''}
					</span>
					<span className="flex min-w-0 items-center gap-1.5">
						<ToneBadge tone={STATUS[question.status].tone}>{STATUS[question.status].label}</ToneBadge>
						{mine ? (
							<span className="inline-flex items-center gap-1 text-xs text-foreground">
								<UserRound aria-hidden="true" className="size-3" />
								Assigned to you
							</span>
						) : null}
						{doc ? <span className="min-w-0 truncate text-xs text-subtle-foreground">{doc.name}</span> : null}
					</span>
				</span>
			</button>
		</li>
	);
}

/** A drafted answer in a double frame, citing only what the asker can open. */
function DraftCard({
	question,
	draft,
	onUse,
	onDismiss,
}: {
	question: QuestionThread;
	draft: NonNullable<QuestionThread['draft']>;
	onUse: () => void;
	onDismiss: () => void;
}) {
	const { can, document, openDocument } = useDataRooms();
	const citations = draft.citations.flatMap((citation): { citation: Citation; doc: DataRoomDocument }[] => {
		const doc = document(citation.documentId);
		return doc && can('view', { kind: 'document', documentId: doc.id }, question.askedBy) ? [{ citation, doc }] : [];
	});
	return (
		<section aria-label="Drafted answer" className={cn('rounded-[14px] border border-foreground/[0.07] bg-muted/80 p-[3px]', enterClass)}>
			<div className={cn(surfaceInsetClass, 'rounded-[10px] bg-card shadow-card')}>
				<SurfaceBody>
					<header className="flex h-10 items-center gap-2 px-3">
						<Sparkles aria-hidden="true" className="size-3.5 text-primary" />
						<span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">Drafted answer</span>
						<span className="text-xs text-muted-foreground">From documents the asker can open</span>
					</header>
					<p className="border-t border-dashed border-foreground/10 px-3 py-2.5 text-sm leading-5 text-pretty text-foreground">{draft.body}</p>
					<div className="flex flex-wrap items-center gap-2 border-t border-dashed border-foreground/10 bg-muted/60 px-3 py-2">
						<ul aria-label="Sources" className="flex min-w-0 flex-1 flex-wrap gap-1">
							{citations.map(({ citation, doc }, index) => {
								return (
									<li key={`${citation.documentId}-${index}`}>
										<button
											type="button"
											onClick={() => openDocument(doc.id)}
											className={cn('inline-flex h-6 max-w-56 cursor-pointer items-center gap-1.5 rounded-md bg-card px-1.5 text-xs text-foreground shadow-card hover:bg-muted', focusRingClass)}
										>
											<DocumentGlyph kind={doc.kind} size="sm" className="size-4 rounded-[4px]" />
											<span className="truncate">{doc.name}</span>
											{citation.page ? <span className="shrink-0 text-muted-foreground tabular-nums">p. {citation.page}</span> : null}
										</button>
									</li>
								);
							})}
						</ul>
						<div className="flex shrink-0 items-center gap-1.5">
							<Button size="xs" variant="ghost" onClick={onDismiss}>
								Dismiss
							</Button>
							<Button size="xs" variant="outline" onClick={onUse}>
								Use draft
							</Button>
						</div>
					</div>
				</SurfaceBody>
			</div>
		</section>
	);
}

function QuestionDetail({ question, onBack }: { question: QuestionThread; onBack: () => void }) {
	const { person, document, openDocument, format, can } = useDataRooms();
	const command = useCommand();
	const manages = can('manage_room', { kind: 'room', roomId: question.roomId });
	const [reply, setReply] = React.useState('');
	const [draftDismissed, setDraftDismissed] = React.useState(false);
	const doc = question.documentId ? document(question.documentId) : undefined;
	const draft = manages && !draftDismissed && question.status === 'open' ? question.draft : undefined;
	const replyId = React.useId();
	const busy = command.pending || command.locked;

	const answer = async (close: boolean) => {
		const body = reply.trim();
		if (!body) return;
		if (await command.run({ type: 'answer-question', questionId: question.id, body, close })) setReply('');
	};
	const setStatus = (status: QuestionStatus) => void command.run({ type: 'set-question-status', questionId: question.id, status });

	return (
		<div className="flex min-w-0 flex-1 flex-col">
			<header className="flex min-h-14 shrink-0 items-center gap-2.5 border-b border-border px-3 py-2">
				<TooltipIconButton label="Back to questions" side="bottom" className="-ml-1 text-foreground @3xl/view:hidden" onClick={onBack}>
					<ArrowLeft aria-hidden="true" className="size-3.5" />
				</TooltipIconButton>
				<div className="flex min-w-0 flex-1 flex-col gap-1">
					<h2 className="truncate text-sm font-medium text-foreground">{question.title}</h2>
					<div className="flex min-w-0 flex-wrap items-center gap-1.5">
						<ToneBadge tone={STATUS[question.status].tone}>{STATUS[question.status].label}</ToneBadge>
						{doc ? (
							<button
								type="button"
								onClick={() => openDocument(doc.id)}
								className={cn('inline-flex h-5 min-w-0 cursor-pointer items-center gap-1 rounded-[5px] px-1 text-xs text-muted-foreground hover:bg-overlay-hover hover:text-foreground', focusRingClass)}
							>
								<DocumentGlyph kind={doc.kind} size="sm" className="size-4 rounded-[4px]" />
								<span className="truncate">{doc.name}</span>
							</button>
						) : null}
					</div>
				</div>
				{manages ? (
					question.status === 'closed' ? (
						<Button size="xs" variant="outline" disabled={busy} onClick={() => setStatus('open')}>
							<RotateCcw aria-hidden="true" />
							<span className="hidden @md/view:inline">Reopen</span>
						</Button>
					) : (
						<Button size="xs" variant="outline" disabled={busy} onClick={() => setStatus('closed')}>
							<CheckCheck aria-hidden="true" />
							<span className="hidden @md/view:inline">Close</span>
						</Button>
					)
				) : null}
			</header>

			<div className="min-h-0 flex-1 overflow-y-auto px-3 @md/view:px-5">
				<ol className="mx-auto flex w-full max-w-2xl flex-col gap-5 py-5">
					{question.messages.map((message) => {
						const author = person(message.authorId);
						const asker = message.authorId === question.askedBy;
						return (
							<li key={message.id} className={cn('flex gap-3', enterClass)}>
								<PersonAvatar person={author} />
								<div className="min-w-0 flex-1">
									<p className="flex flex-wrap items-baseline gap-x-1.5 text-[13px]">
										<span className="font-medium text-foreground">{author?.name ?? 'Someone'}</span>
										{author?.company ? <span className="text-muted-foreground">{author.company}</span> : null}
										{asker ? null : <span className="text-muted-foreground">answered</span>}
										<span className="text-xs text-subtle-foreground tabular-nums">{format.date(message.at, true)}</span>
									</p>
									<p className={cn('mt-1.5 rounded-xl px-3 py-2 text-sm leading-5 text-pretty text-foreground', asker ? 'bg-card shadow-card' : 'bg-muted')}>{message.body}</p>
								</div>
							</li>
						);
					})}
					{draft ? (
						<li className="list-none">
							<DraftCard question={question} draft={draft} onUse={() => setReply(draft.body)} onDismiss={() => setDraftDismissed(true)} />
						</li>
					) : null}
				</ol>
			</div>

			{manages && question.status !== 'closed' ? (
				<div className="mx-auto flex w-full max-w-2xl shrink-0 flex-col gap-2 px-3 pb-4 @md/view:px-5">
					{command.error ? (
						<p role="alert" className="text-[13px] text-destructive">
							{command.error}
						</p>
					) : null}
					<div className="rounded-xl border border-border bg-card p-1.5 shadow-sm focus-within:ring-[3px] focus-within:ring-ring/35">
						<label htmlFor={replyId} className="sr-only">
							Answer {person(question.askedBy)?.name ?? 'the question'}
						</label>
						<Textarea
							unstyled
							size="sm"
							id={replyId}
							value={reply}
							onChange={(event) => setReply(event.target.value)}
							rows={3}
							disabled={command.locked}
							placeholder={command.locked ? 'Exit the preview to answer.' : 'Write an answer everyone who can read this question will see…'}
							className="block w-full text-sm text-foreground"
							onKeyDown={(event) => {
								if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
									event.preventDefault();
									void answer(false);
								}
							}}
						/>
						<div className="flex items-center justify-end gap-1.5 pt-1">
							<Button size="xs" variant="outline" disabled={!reply.trim() || busy} onClick={() => answer(true)}>
								Send and close
							</Button>
							<Button size="xs" disabled={!reply.trim() || busy} aria-busy={command.pending || undefined} onClick={() => answer(false)}>
								Send answer
							</Button>
						</div>
					</div>
				</div>
			) : command.error ? (
				<p role="alert" className="mx-auto w-full max-w-2xl px-5 pb-4 text-[13px] text-destructive">
					{command.error}
				</p>
			) : null}
		</div>
	);
}

function AskForm({ room, onDone, onCancel }: { room: Room; onDone: () => void; onCancel: () => void }) {
	const { data, actingId } = useDataRooms();
	const command = useCommand();
	const [title, setTitle] = React.useState('');
	const [body, setBody] = React.useState('');
	const [documentId, setDocumentId] = React.useState('');
	const documents = visibleDocuments(data, actingId, room.id);
	const formId = React.useId();

	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!title.trim() || !body.trim()) return;
		if (await command.run({ type: 'ask-question', roomId: room.id, title: title.trim(), body: body.trim(), documentId: documentId || undefined })) onDone();
	};

	return (
		<form onSubmit={submit} aria-label="Ask a question" className={cn('mx-3 mb-2 flex flex-col gap-2 rounded-xl bg-card p-3 shadow-card', enterClass)}>
			<label htmlFor={`${formId}-title`} className="text-xs text-muted-foreground">
				Question
			</label>
			<Input id={`${formId}-title`} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="One line the deal team will see" size="sm" />
			<label htmlFor={`${formId}-body`} className="sr-only">
				Details
			</label>
			<Textarea id={`${formId}-body`} value={body} onChange={(event) => setBody(event.target.value)} rows={3} placeholder="Add the detail they need to answer" size="sm" />
			<label htmlFor={`${formId}-document`} className="text-xs text-muted-foreground">
				About a document <span className="text-subtle-foreground">(optional)</span>
			</label>
			<ChoiceSelect
				id={`${formId}-document`}
				value={documentId}
				onValueChange={setDocumentId}
				className="w-full"
				options={[{ value: '', label: 'No specific document' }, ...documents.map((doc) => ({ value: doc.id, label: doc.name }))]}
			/>
			{command.error ? (
				<p role="alert" className="text-[13px] text-destructive">
					{command.error}
				</p>
			) : null}
			<div className="flex justify-end gap-1.5 pt-1">
				<Button type="button" size="xs" variant="ghost" onClick={onCancel}>
					Cancel
				</Button>
				<Button type="submit" size="xs" disabled={!title.trim() || !body.trim() || command.pending || command.locked} aria-busy={command.pending || undefined}>
					Send question
				</Button>
			</div>
		</form>
	);
}

/**
 * Questions about the room. Managers see every thread, assign and answer
 * them, and can start from a drafted answer; everyone else sees only what
 * they or their own company asked. Two panes from 768px of container width.
 */
export function QuestionsTab({ room }: { room: Room }) {
	const { can } = useDataRooms();
	const { locked } = useCommand();
	const manages = can('manage_room', { kind: 'room', roomId: room.id });
	const threads = useVisibleThreads(room);
	const [filter, setFilter] = React.useState<Filter>('open');
	const [query, setQuery] = React.useState('');
	const [selectedId, setSelectedId] = React.useState<string | undefined>(() => threads[0]?.id);
	const [showThread, setShowThread] = React.useState(false);
	const [asking, setAsking] = React.useState(false);

	const needle = query.trim().toLowerCase();
	const visible = threads.filter(
		(thread) =>
			(filter === 'all' || thread.status === filter) &&
			(!needle || thread.title.toLowerCase().includes(needle) || thread.messages.some((message) => message.body.toLowerCase().includes(needle))),
	);
	const selected = threads.find((thread) => thread.id === selectedId) ?? visible[0];
	const count = (value: Filter) => (value === 'all' ? threads.length : threads.filter((thread) => thread.status === value).length);

	return (
		<div className="flex min-h-0 flex-1">
			<section
				aria-label="Questions"
				className={cn('min-h-0 w-full flex-col border-border @3xl/view:flex @3xl/view:w-[340px] @3xl/view:shrink-0 @3xl/view:border-r', showThread ? 'hidden' : 'flex')}
			>
				<div className="flex items-center gap-2 px-3 pt-3 pb-2">
					<SearchField label="Search questions" value={query} placeholder="Search questions…" className="min-w-0 flex-1" onChange={(event) => setQuery(event.target.value)} />
					{manages ? null : (
						<TooltipIconButton label={asking ? 'Cancel question' : 'Ask a question'} variant="raised" disabled={locked} onClick={() => setAsking((value) => !value)}>
							{asking ? <X aria-hidden="true" className="size-3.5" /> : <MessageSquarePlus aria-hidden="true" className="size-3.5" />}
						</TooltipIconButton>
					)}
				</div>
				{asking ? (
					<AskForm
						room={room}
						onCancel={() => setAsking(false)}
						onDone={() => {
							setAsking(false);
							setFilter('open');
						}}
					/>
				) : null}
				<FilterGroup
					label="Filter questions"
					value={filter}
					onChange={setFilter}
					options={FILTERS.map((option) => ({ ...option, count: count(option.value) }))}
					rootClassName="mx-3"
					className="pb-2"
				/>
				<ul className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-1.5 pb-3">
					{visible.map((thread) => (
						<QuestionRow
							key={thread.id}
							question={thread}
							selected={thread.id === selected?.id}
							onSelect={() => {
								setSelectedId(thread.id);
								setShowThread(true);
							}}
						/>
					))}
					{visible.length === 0 ? (
						<li>
							<EmptyState
								icon={MessagesSquare}
								title={threads.length === 0 ? 'No questions yet' : 'Nothing here'}
								description={
									threads.length === 0
										? manages
											? 'Questions people ask about this room show up here for you to answer.'
											: 'Ask the deal team about anything in the room. Only your company sees your questions.'
										: 'Try another filter or search.'
								}
								action={
									threads.length === 0 && !manages ? (
										<Button size="xs" disabled={locked} onClick={() => setAsking(true)}>
											Ask a question
										</Button>
									) : undefined
								}
							/>
						</li>
					) : null}
				</ul>
			</section>
			<div className={cn('min-w-0 flex-1 @3xl/view:flex', showThread ? 'flex' : 'hidden')}>
				{selected ? (
					<QuestionDetail key={selected.id} question={selected} onBack={() => setShowThread(false)} />
				) : (
					<p className="m-auto text-sm text-muted-foreground">Select a question</p>
				)}
			</div>
		</div>
	);
}
