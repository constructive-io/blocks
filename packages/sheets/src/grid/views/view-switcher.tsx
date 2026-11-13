/**
 * The toolbar view switcher: the current view's name with an "unsaved changes"
 * marker, and a popover to switch views, save, discard, save as a new view,
 * rename, duplicate and delete. Switching away from unsaved changes asks first.
 */
import { useState } from 'react';
import { RiDeleteBinLine, RiFileCopyLine, RiPencilLine, RiTableLine } from '@remixicon/react';

import { Button } from '@constructive-io/ui/button';
import { Input } from '@constructive-io/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@constructive-io/ui/popover';

import { cn } from '../../utils/cn';
import { TOOLBAR_POPOVER } from '../popup-classes';
import type { SavedViewsBindings } from './use-saved-views';

export const DEFAULT_VIEW_NAME = 'Default view';

type Pending =
	| { kind: 'create' }
	| { kind: 'rename'; viewId: string }
	| { kind: 'delete'; viewId: string }
	| { kind: 'switch'; viewId: string | null };

function NameForm({
	initial,
	submitLabel,
	problem,
	busy,
	onSubmit,
	onCancel,
	label,
}: {
	initial: string;
	submitLabel: string;
	problem: (name: string) => string | null;
	busy: boolean;
	onSubmit: (name: string) => void;
	onCancel: () => void;
	label: string;
}) {
	const [name, setName] = useState(initial);
	const [touched, setTouched] = useState(false);
	const error = touched ? problem(name) : null;
	const submit = () => {
		setTouched(true);
		if (!problem(name)) onSubmit(name);
	};
	return (
		<form
			className='grid gap-1.5'
			onSubmit={(event) => {
				event.preventDefault();
				submit();
			}}
		>
			<div className='flex items-center gap-2'>
				<Input
					size='sm'
					autoFocus
					aria-label={label}
					aria-invalid={error ? true : undefined}
					value={name}
					maxLength={120}
					onChange={(event) => setName(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === 'Escape') {
							event.preventDefault();
							event.stopPropagation();
							onCancel();
						}
					}}
				/>
				<Button type='submit' size='xs' disabled={busy}>
					{submitLabel}
				</Button>
				<Button type='button' variant='ghost' size='xs' onClick={onCancel}>
					Cancel
				</Button>
			</div>
			{error && (
				<p className='text-destructive text-xs' role='alert'>
					{error}
				</p>
			)}
		</form>
	);
}

export interface ViewSwitcherProps {
	views: SavedViewsBindings;
}

export function ViewSwitcher({ views }: ViewSwitcherProps) {
	const [pending, setPending] = useState<Pending | null>(null);
	const active = views.activeView;
	const name = active?.name ?? DEFAULT_VIEW_NAME;
	const nameOf = (viewId: string | null) => (viewId === null ? DEFAULT_VIEW_NAME : views.views.find((view) => view.id === viewId)?.name ?? '');

	const close = () => setPending(null);
	const choose = (viewId: string | null) => {
		if (viewId === (active?.id ?? null)) return;
		if (views.dirty) {
			setPending({ kind: 'switch', viewId });
			return;
		}
		void views.select(viewId);
	};

	return (
		<Popover
			open={views.open}
			onOpenChange={(open) => {
				views.setOpen(open);
				if (!open) close();
			}}
		>
			<PopoverTrigger asChild>
				<Button variant='outline' size='sm' aria-label={`View: ${name}${views.dirty ? ' (unsaved changes)' : ''}`} data-part-id='sheets-view-switcher'>
					<RiTableLine className='text-muted-foreground/60 -ms-1.5 size-5' aria-hidden='true' />
					<span className='max-w-[12rem] truncate' title={name}>
						{name}
					</span>
					{views.dirty && (
						<span className='text-muted-foreground inline-flex items-center gap-1 text-xs' data-part-id='sheets-view-dirty'>
							<span className='bg-primary size-1.5 rounded-full' aria-hidden='true' />
							Edited
						</span>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent className={cn('w-[22rem]', TOOLBAR_POPOVER)} align='start'>
				<div className='grid gap-3' data-part-id='sheets-view-list'>
					<h4 className='leading-none font-medium'>Views</h4>

					{views.status === 'loading' && <p className='text-muted-foreground text-sm'>Loading views…</p>}
					{views.status === 'error' && (
						<div className='grid gap-2' role='alert'>
							<p className='text-destructive text-sm'>{views.error}</p>
							<Button variant='outline' size='xs' className='justify-self-start' onClick={views.retry}>
								Retry
							</Button>
						</div>
					)}

					{views.status === 'ready' && (
						<ul aria-label='Saved views' className='grid max-h-72 gap-0.5 overflow-auto'>
							{[{ id: null as string | null, name: DEFAULT_VIEW_NAME }, ...views.views].map((view) => {
								const selected = view.id === (active?.id ?? null);
								const editing = view.id !== null && pending?.kind === 'rename' && pending.viewId === view.id;
								const deleting = view.id !== null && pending?.kind === 'delete' && pending.viewId === view.id;
								return (
									<li key={view.id ?? 'default'} data-part-id='sheets-view' className='grid gap-1'>
										{editing ? (
											<NameForm
												initial={view.name}
												submitLabel='Rename'
												label={`New name for ${view.name}`}
												busy={views.busy}
												problem={(next) => views.nameProblem(next, view.id ?? undefined)}
												onCancel={close}
												onSubmit={(next) => {
													void views.rename(view.id!, next).then((ok) => ok && close());
												}}
											/>
										) : (
											<div className={cn('flex items-center gap-1 rounded px-2', selected ? 'bg-muted' : 'hover:bg-muted/60')}>
												<button
													type='button'
													aria-current={selected ? 'true' : undefined}
													className='min-w-0 flex-1 truncate py-1 text-left text-sm'
													title={view.name}
													onClick={() => choose(view.id)}
												>
													{view.name}
												</button>
												{view.id !== null && (
													<>
														<Button variant='ghost' size='icon-xs' aria-label={`Rename ${view.name}`} onClick={() => setPending({ kind: 'rename', viewId: view.id! })}>
															<RiPencilLine aria-hidden='true' />
														</Button>
														<Button
															variant='ghost'
															size='icon-xs'
															aria-label={`Duplicate ${view.name}`}
															disabled={views.busy}
															onClick={() => void views.duplicate(view.id!)}
														>
															<RiFileCopyLine aria-hidden='true' />
														</Button>
														<Button variant='ghost' size='icon-xs' aria-label={`Delete ${view.name}`} onClick={() => setPending({ kind: 'delete', viewId: view.id! })}>
															<RiDeleteBinLine aria-hidden='true' />
														</Button>
													</>
												)}
											</div>
										)}
										{deleting && (
											<div className='flex items-center gap-2 px-2 text-sm' role='alert'>
												<span className='min-w-0 flex-1'>Delete “{view.name}”? This cannot be undone.</span>
												<Button
													variant='destructive-outline'
													size='xs'
													disabled={views.busy}
													onClick={() => void views.remove(view.id!).then((ok) => ok && close())}
												>
													Delete
												</Button>
												<Button variant='ghost' size='xs' onClick={close}>
													Cancel
												</Button>
											</div>
										)}
									</li>
								);
							})}
						</ul>
					)}

					{pending?.kind === 'switch' && (
						<div className='grid gap-2 rounded border p-2 text-sm' role='alert'>
							<p>“{name}” has unsaved changes. Switching to “{nameOf(pending.viewId)}” discards them.</p>
							<div className='flex flex-wrap gap-2'>
								<Button
									size='xs'
									disabled={views.busy}
									onClick={() => void views.save().then((ok) => ok && views.select(pending.viewId)).then(() => close())}
								>
									Save and switch
								</Button>
								<Button variant='outline' size='xs' disabled={views.busy} onClick={() => void views.select(pending.viewId).then(() => close())}>
									Discard and switch
								</Button>
								<Button variant='ghost' size='xs' onClick={close}>
									Cancel
								</Button>
							</div>
						</div>
					)}

					{views.status === 'ready' && views.views.length === 0 && pending?.kind !== 'create' && (
						<p className='text-muted-foreground text-xs'>No saved views yet. Save the current filters, sort, search and fields as a view.</p>
					)}

					{views.error && views.status !== 'error' && (
						<p className='text-destructive text-xs' role='alert'>
							{views.error}
						</p>
					)}

					{views.status === 'ready' && (
						<div className='grid gap-2 border-t pt-2'>
							{views.dirty && (
								<div className='flex items-center gap-2'>
									<Button size='xs' disabled={views.busy} onClick={() => void views.save()}>
										Save view
									</Button>
									<Button variant='ghost' size='xs' disabled={views.busy} onClick={views.discard}>
										Discard changes
									</Button>
								</div>
							)}
							{pending?.kind === 'create' ? (
								<NameForm
									initial=''
									submitLabel='Save'
									label='Name of the new view'
									busy={views.busy}
									problem={(next) => views.nameProblem(next)}
									onCancel={close}
									onSubmit={(next) => {
										void views.create(next).then((ok) => ok && close());
									}}
								/>
							) : (
								<Button variant='ghost' size='xs' className='justify-self-start' onClick={() => setPending({ kind: 'create' })}>
									Save as new view…
								</Button>
							)}
						</div>
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}
