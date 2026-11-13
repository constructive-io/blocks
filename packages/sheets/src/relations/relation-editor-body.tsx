'use client';

/**
 * The content of a relation editor, shared by the grid's cell editor and the
 * record panel's relation section: the model's reason when nothing can change,
 * the current links, "Open {table}" for links that need more fields, the
 * picker, the create form, messages, and the "Create new" / "Clear link"
 * actions. The host adds its own header and its Save/Cancel footer.
 */
import { useState, type RefObject } from 'react';
import { ExternalLink, Link, Plus } from 'lucide-react';

import { Button } from '@constructive-io/ui/button';

import { RelationCreateForm } from './relation-create-form';
import { RelationLinkList } from './relation-link-list';
import { RelationPicker } from './relation-picker';
import type { RelationEditor } from './use-relation-editor';

export interface RelationEditorBodyProps {
	editor: RelationEditor;
	/**
	 * 'overlay' (the cell editor): the picker shows at once. 'section' (a record panel
	 * listing several relations): the picker appears after "Add link" ("Change link" for a
	 * to-one relation that has one), and the host's heading carries the link count. The
	 * search box takes focus when the picker appears.
	 */
	layout?: 'overlay' | 'section';
	/**
	 * Section layout: the host controls whether the picker is open, so it can close it
	 * after a save and give focus back to the "Add link" / "Change link" button
	 * (`toggleRef`). Escape in the search box closes the picker.
	 */
	picker?: {
		open: boolean;
		setOpen: (open: boolean) => void;
		toggleRef: RefObject<HTMLButtonElement | null>;
	};
}

export function RelationEditorBody({ editor, layout = 'overlay', picker }: RelationEditorBodyProps) {
	const [creating, setCreating] = useState(false);
	const [ownPickerOpen, setOwnPickerOpen] = useState(layout === 'overlay');
	const showPicker = picker ? picker.open : ownPickerOpen;
	const setPickerOpen = picker ? picker.setOpen : setOwnPickerOpen;
	const { relation, capability, editable, selection, saving, create } = editor;
	const isList = relation.kind === 'hasMany' || relation.kind === 'manyToMany';
	const hasLink = selection.pending.some((link) => link.state !== 'removed');
	// A to-one relation with a link replaces it; a hasOne whose link must stay cannot be replaced.
	const replaces = !isList && editor.current.length > 0;
	const replaceReason = replaces && relation.kind === 'hasOne' && !capability.canUnlink ? capability.unlinkReason : null;

	return (
		<>
			{editor.blockedReason ? (
				<p role='note' className='bg-muted text-muted-foreground rounded-md px-3 py-2 text-xs' data-testid='relation-readonly-reason'>
					{editor.blockedReason}
				</p>
			) : null}
			<RelationLinkList
				relation={relation}
				pending={selection.pending}
				total={editor.links.total}
				isLoading={editor.links.isLoading || (editor.modelsLoading && editor.current.length === 0 && relation.kind !== 'belongsTo')}
				error={editor.links.error}
				hasNextPage={editor.links.hasNextPage}
				isFetchingNextPage={editor.links.isFetchingNextPage}
				onLoadMore={editor.links.fetchNextPage}
				onToggle={editor.toggle}
				// While the related table loads, the model already says whether links can be removed:
				// show that now, so the reason line and the remove controls do not appear later.
				removeReason={
					editor.linkPending
						? relation.unlinkable
							? null
							: relation.reason
						: editable
							? capability.canUnlink
								? null
								: capability.unlinkReason
							: null
				}
				readOnly={!editable && !editor.linkPending}
				disabled={saving || editor.linkPending}
				placeholderCount={editor.links.placeholderCount}
				moveHint={editor.moveHint}
				onOpen={editor.openRecord ?? undefined}
				openReason={editor.openRecordReason}
				showSummary={layout === 'overlay'}
			/>

			{!editable && editor.junctionAction ? (
				<Button type='button' variant='outline' size='sm' className='self-start' onClick={editor.junctionAction.open}>
					<ExternalLink className='mr-1 h-3 w-3' aria-hidden />
					Open {editor.junctionAction.tableName}
				</Button>
			) : null}

			{(capability.canLink || editor.linkPending) && !creating && showPicker ? (
				<RelationPicker
					relation={relation}
					targetName={relation.targetName}
					search={editor.search}
					onSearchChange={editor.setSearch}
					searchReason={editor.searchReason}
					candidates={editor.candidates.rows}
					total={editor.candidates.total}
					isLoading={editor.candidates.isLoading || editor.linkPending}
					error={editor.candidates.error ?? editor.targetError}
					hasNextPage={editor.candidates.hasNextPage}
					isFetchingNextPage={editor.candidates.isFetchingNextPage}
					onLoadMore={editor.candidates.fetchNextPage}
					isSelected={selection.isSelected}
					onToggle={editor.toggle}
					disabled={saving || editor.linkPending}
					moveHint={editor.moveHint}
					onEscape={layout === 'section' ? () => setPickerOpen(false) : undefined}
				/>
			) : null}

			{creating && create.plan?.ok ? (
				<RelationCreateForm
					targetName={relation.targetName}
					plan={create.plan}
					onSubmit={async (values) => {
						const message = await create.submit(values);
						if (!message) setCreating(false);
						return message;
					}}
					onCancel={() => setCreating(false)}
				/>
			) : null}

			{editor.notice ? (
				<p role='status' className='text-muted-foreground text-xs'>
					{editor.notice}
				</p>
			) : null}
			{editor.errors.length > 0 ? (
				<div role='alert' className='border-destructive/40 text-destructive space-y-0.5 rounded-md border px-3 py-2 text-xs'>
					{editor.errors.map((line) => (
						<p key={line}>{line}</p>
					))}
				</div>
			) : null}

			{/* One action row, so the link actions line up and share spacing. */}
			{(editable || editor.linkPending) && !creating ? (
				<div className='flex flex-wrap items-center gap-2'>
					{(capability.canLink || editor.linkPending) && !showPicker ? (
						<Button
							ref={picker?.toggleRef}
							type='button'
							variant='outline'
							size='sm'
							disabled={Boolean(replaceReason) || editor.linkPending}
							title={replaceReason ?? undefined}
							onClick={() => setPickerOpen(true)}
						>
							<Link className='mr-1 h-3 w-3' aria-hidden />
							{replaces ? 'Change link' : 'Add link'}
						</Button>
					) : null}
					<Button
						type='button'
						variant='ghost'
						size='sm'
						// A leading ghost button has no visible box: pull it out by its padding so its
						// icon lines up with the content above.
						className={(capability.canLink || editor.linkPending) && !showPicker ? undefined : '-ms-2'}
						disabled={editor.linkPending || Boolean(create.blocked) || saving}
						title={editor.linkPending ? 'Loading the linked table…' : (create.blocked ?? undefined)}
						onClick={() => setCreating(true)}
					>
						<Plus className='mr-1 h-3 w-3' aria-hidden />
						Create new
					</Button>
					{/* In the cell editor, Clear is in the shared footer. */}
					{layout === 'section' && !isList && capability.canUnlink && hasLink ? (
						<Button type='button' variant='ghost' size='sm' disabled={saving} onClick={editor.clear}>
							Clear link
						</Button>
					) : null}
				</div>
			) : null}
		</>
	);
}
