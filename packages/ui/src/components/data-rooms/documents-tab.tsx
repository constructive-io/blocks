'use client';

import { ChevronDown, ChevronRight, FolderClosed, FolderInput, FolderOpen, FolderPlus, FolderSearch, MoreHorizontal, Search, Share2, Upload } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { TextShimmer } from '../ai/text-shimmer';
import { Button } from '../button';
import { Checkbox } from '../checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '../dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip';
import { focusRingClass, pressClass, SearchField, ToneBadge, TooltipIconButton } from '../workspace-kit/primitives';
import { EmptyState, TableSurface, tableHeadClass, tableRowClass } from '../workspace-kit/surface';
import { folderContains, folderName, normalizeFolder, parentFolder, roomFolders, visibleDocuments } from './access';
import { useDataRooms } from './data-rooms-context';
import { childFolders, FolderTree, ROOT_LABEL } from './folder-tree';
import { kindFromName } from './format';
import { ChoiceSelect, DocumentGlyph } from './parts';
import type { DataRoomDocument, Room } from './types';
import { useCommand } from './use-command';

/**
 * The room's documents: a folder tree beside a file table, with upload
 * (button or drop), new folders, folder sharing, and moving documents, each
 * shown only to people who may do it in the current folder.
 */
export function DocumentsTab({ room }: { room: Room }) {
	const { data, actingId, can, openDocument, openShare, format } = useDataRooms();
	const command = useCommand();
	const [folder, setFolder] = React.useState('/');
	const [query, setQuery] = React.useState('');
	const [searchOpen, setSearchOpen] = React.useState(false);
	const [selected, setSelected] = React.useState<ReadonlySet<string>>(() => new Set());
	const [newFolder, setNewFolder] = React.useState<string | null>(null);
	const [dragging, setDragging] = React.useState(false);
	const fileInput = React.useRef<HTMLInputElement>(null);

	const target = { kind: 'folder', roomId: room.id, folder } as const;
	const canUpload = can('upload', target);
	const canEdit = can('edit', target);
	const canShare = can('share', target);
	const addItems =
		canEdit || canShare ? (
			<>
				{canEdit ? (
					<DropdownMenuItem className="gap-2 [&_svg]:size-3.5 [&_svg]:text-muted-foreground" disabled={command.locked} onClick={() => setNewFolder('')}>
						<FolderPlus aria-hidden="true" />
						New folder
					</DropdownMenuItem>
				) : null}
				{canShare ? (
					<DropdownMenuItem className="gap-2 [&_svg]:size-3.5 [&_svg]:text-muted-foreground" onClick={() => openShare({ roomId: room.id, folder })}>
						<Share2 aria-hidden="true" />
						Share this folder
					</DropdownMenuItem>
				) : null}
			</>
		) : null;
	const manages = can('manage_room', { kind: 'room', roomId: room.id });

	const documents = React.useMemo(() => visibleDocuments(data, actingId, room.id), [actingId, data, room.id]);
	const allFolders = React.useMemo(() => roomFolders(data, room.id), [data, room.id]);

	/** Folders with something the person can open below them, or that they could add to. */
	const folders = React.useMemo(
		() =>
			allFolders.filter(
				(path) =>
					path === '/' ||
					documents.some((document) => folderContains(path, document.folder)) ||
					can('upload', { kind: 'folder', roomId: room.id, folder: path }),
			),
		[allFolders, can, documents, room.id],
	);

	const needle = query.trim().toLowerCase();
	const shown = needle
		? documents.filter((document) => document.name.toLowerCase().includes(needle))
		: documents.filter((document) => normalizeFolder(document.folder) === normalizeFolder(folder));
	const subfolders = needle ? [] : childFolders(folders, folder);
	const sorted = [...shown].sort((a, b) => a.name.localeCompare(b.name));
	const liveShares = (document: DataRoomDocument) =>
		data.shares.filter(
			(share) =>
				share.roomId === room.id &&
				folderContains(share.folder, document.folder) &&
				(!share.expiresAt || Date.parse(share.expiresAt) > Date.parse(data.clock)),
		).length;

	const go = (path: string) => {
		setFolder(normalizeFolder(path));
		setSelected(new Set());
		setQuery('');
	};

	const upload = (files: FileList | File[]) => {
		const list = [...files];
		if (!list.length) return;
		void command.run({ type: 'upload', roomId: room.id, folder, files: list.map((file) => ({ name: file.name, size: file.size, kind: kindFromName(file.name) })) });
	};

	const toggle = (id: string) =>
		setSelected((current) => {
			const next = new Set(current);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});

	const crumbs: string[] = [];
	for (let current: string | null = normalizeFolder(folder); current; current = parentFolder(current)) crumbs.unshift(current);

	return (
		<div className="flex min-h-0 flex-1">
			<FolderTree
				folders={folders}
				documents={documents}
				current={folder}
				searching={Boolean(needle)}
				onSelect={go}
				note={documents.length < data.documents.filter((document) => document.roomId === room.id).length && !manages ? 'You see the folders shared with you.' : undefined}
			/>

			<div
				className="relative flex min-w-0 flex-1 flex-col"
				onDragOver={(event) => {
					if (!canUpload || !event.dataTransfer.types.includes('Files')) return;
					event.preventDefault();
					setDragging(true);
				}}
				onDragLeave={(event) => {
					if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
					setDragging(false);
				}}
				onDrop={(event) => {
					if (!canUpload) return;
					event.preventDefault();
					setDragging(false);
					upload(event.dataTransfer.files);
				}}
			>
				<div className="flex h-11 shrink-0 items-center gap-2 px-4">
					<label className="min-w-0 @3xl/view:hidden">
						<span className="sr-only">Folder</span>
						<ChoiceSelect
							label="Folder"
							value={normalizeFolder(folder)}
							onValueChange={go}
							className="w-auto max-w-48"
							options={folders.map((path) => ({ value: path, label: path === '/' ? ROOT_LABEL : path.slice(1) }))}
						/>
					</label>
					<nav aria-label="Folder path" className="hidden min-w-0 flex-1 items-center gap-1 text-[13px] @3xl/view:flex">
						{needle ? (
						<span className="text-muted-foreground">
							Results for “{query.trim()}” across folders you can open
						</span>
					) : (
						crumbs.map((path, index) => {
							const last = index === crumbs.length - 1;
							return (
								<React.Fragment key={path}>
									{index > 0 ? <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 text-subtle-foreground" /> : null}
									{last ? (
										<span aria-current="location" className="truncate font-medium text-foreground">
											{folderName(path, ROOT_LABEL)}
										</span>
									) : (
										<button
											type="button"
											onClick={() => go(path)}
											className={cn('cursor-pointer truncate rounded-sm text-muted-foreground hover:text-foreground', focusRingClass)}
										>
											{folderName(path, ROOT_LABEL)}
										</button>
									)}
								</React.Fragment>
							);
						})
					)}
					</nav>
					<div className="ml-auto flex items-center gap-1.5">
						{searchOpen || query ? (
							<SearchField
								label="Search documents"
								value={query}
								placeholder="Search documents…"
								autoFocus
								className="w-44 @xl/view:w-56"
								onChange={(event) => setQuery(event.target.value)}
								onBlur={() => {
									if (!query) setSearchOpen(false);
								}}
								onKeyDown={(event) => {
									if (event.key !== 'Escape') return;
									setQuery('');
									setSearchOpen(false);
								}}
							/>
						) : (
							<TooltipIconButton label="Search documents" onClick={() => setSearchOpen(true)}>
								<Search aria-hidden="true" className="size-3.5" />
							</TooltipIconButton>
						)}
						{canEdit && selected.size > 0 ? (
							<DropdownMenu>
								<DropdownMenuTrigger render={<Button size="xs" variant="outline" />}>
									<FolderInput aria-hidden="true" />
									Move {selected.size}
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" className="w-56">
									<DropdownMenuLabel>Move to</DropdownMenuLabel>
									{allFolders.map((path) => (
										<DropdownMenuItem
											key={path}
											disabled={path === normalizeFolder(folder) || command.pending || command.locked}
											className="gap-2 [&_svg]:size-3.5 [&_svg]:text-muted-foreground"
											onClick={async () => {
												if (await command.run({ type: 'move-documents', documentIds: [...selected], folder: path })) setSelected(new Set());
											}}
										>
											<FolderClosed aria-hidden="true" />
											<span className="truncate">{path === '/' ? ROOT_LABEL : path.slice(1)}</span>
										</DropdownMenuItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>
						) : null}
						{canUpload ? (
							<div className="flex items-center">
								<Button size="xs" className={cn(addItems && 'rounded-r-none')} disabled={command.pending || command.locked} onClick={() => fileInput.current?.click()}>
									<Upload aria-hidden="true" />
									Upload
								</Button>
								{addItems ? (
									<DropdownMenu>
										<DropdownMenuTrigger
											render={<Button size="xs" aria-label="More ways to add" className="rounded-l-none border-l border-l-primary-foreground/25 px-1.5" />}
										>
											<ChevronDown aria-hidden="true" />
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end" className="w-48">
											{addItems}
										</DropdownMenuContent>
									</DropdownMenu>
								) : null}
								<input
									ref={fileInput}
									type="file"
									multiple
									hidden
									onChange={(event) => {
										if (event.target.files) upload(event.target.files);
										event.target.value = '';
									}}
								/>
							</div>
						) : addItems ? (
							<DropdownMenu>
								<Tooltip>
									<TooltipTrigger
										render={
											<DropdownMenuTrigger
												aria-label="Folder actions"
												className={cn(
													'grid size-7 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-overlay-hover hover:text-foreground data-popup-open:bg-overlay-hover',
													pressClass,
													focusRingClass,
												)}
											>
												<MoreHorizontal aria-hidden="true" className="size-3.5" />
											</DropdownMenuTrigger>
										}
									/>
									<TooltipContent side="bottom">Folder actions</TooltipContent>
								</Tooltip>
								<DropdownMenuContent align="end" className="w-48">
									{addItems}
								</DropdownMenuContent>
							</DropdownMenu>
						) : null}
					</div>
				</div>

				{newFolder !== null ? (
					<form
						className="flex shrink-0 items-center gap-2 px-4 pb-2"
						onSubmit={async (event) => {
							event.preventDefault();
							const name = newFolder.trim().replace(/\//g, ' ');
							if (!name) return;
							const path = normalizeFolder(`${folder}/${name}`);
							if (await command.run({ type: 'create-folder', roomId: room.id, path })) {
								setNewFolder(null);
								go(path);
							}
						}}
					>
						<label className="flex h-7 min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-card px-2 shadow-2xs focus-within:ring-[3px] focus-within:ring-ring/50 @md/view:max-w-72">
							<FolderPlus aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
							<span className="sr-only">Folder name</span>
							<input
								autoFocus
								value={newFolder}
								placeholder="Folder name"
								onChange={(event) => setNewFolder(event.target.value)}
								onKeyDown={(event) => {
									if (event.key === 'Escape') setNewFolder(null);
								}}
								className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-subtle-foreground"
							/>
						</label>
						<Button type="submit" size="xs" disabled={!newFolder.trim() || command.pending || command.locked}>
							Create
						</Button>
						<Button type="button" size="xs" variant="ghost" onClick={() => setNewFolder(null)}>
							Cancel
						</Button>
					</form>
				) : null}

				{command.error ? (
					<p role="alert" className="mx-4 mb-2 shrink-0 rounded-md bg-destructive/8 px-3 py-2 text-[13px] text-destructive">
						{command.error}
					</p>
				) : null}

				<div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5">
					{documents.length === 0 ? (
						<EmptyState icon={FolderSearch} title="Nothing to open yet" description="You don’t have access to any documents in this room. Ask a room manager to share a folder with you." />
					) : sorted.length === 0 && subfolders.length === 0 ? (
						needle ? (
							<EmptyState icon={FolderSearch} title="No matches" description={`No document you can open is called “${query.trim()}”.`} />
						) : (
							<EmptyState
								icon={FolderOpen}
								title="This folder is empty"
								description={canUpload ? 'Drop files here or upload them.' : 'Documents added here will show up for you.'}
								action={
									canUpload ? (
										<Button size="xs" disabled={command.pending || command.locked} onClick={() => fileInput.current?.click()}>
											<Upload aria-hidden="true" />
											Upload
										</Button>
									) : undefined
								}
							/>
						)
					) : (
						<TableSurface minWidth="34rem">
							<thead className={tableHeadClass}>
								<tr>
									{canEdit ? (
										<th scope="col" className="w-10">
											<span className="sr-only">Select</span>
										</th>
									) : null}
									<th scope="col">Name</th>
									<th scope="col" className="w-32">
										Updated
									</th>
									<th scope="col" className="w-24 text-right">
										Size
									</th>
								</tr>
							</thead>
							<tbody>
								{subfolders.map((path) => (
									<tr key={path} className={cn(tableRowClass, 'cursor-pointer hover:bg-overlay-hover')} onClick={() => go(path)}>
										{canEdit ? <td /> : null}
										<td>
											<button
												type="button"
												onClick={(event) => {
													event.stopPropagation();
													go(path);
												}}
												className={cn('flex cursor-pointer items-center gap-2.5 rounded-sm text-left', focusRingClass)}
											>
												<span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-[7px] bg-muted text-muted-foreground">
													<FolderClosed className="size-3.5" />
												</span>
												<span className="font-medium text-foreground">{folderName(path)}</span>
											</button>
										</td>
										<td className="text-muted-foreground tabular-nums">
											{documents.filter((document) => folderContains(path, document.folder)).length} documents
										</td>
										<td />
									</tr>
								))}
								{sorted.map((document) => {
									const latest = document.versions[document.versions.length - 1];
									const viewOnly = room.policies.viewOnly || document.restrictions?.viewOnly;
									const shares = manages ? liveShares(document) : 0;
									const checked = selected.has(document.id);
									return (
										<tr
											key={document.id}
											aria-selected={canEdit ? checked : undefined}
											className={cn(tableRowClass, 'cursor-pointer hover:bg-overlay-hover', checked && 'bg-primary/5')}
											onClick={() => openDocument(document.id)}
										>
											{canEdit ? (
												<td onClick={(event) => event.stopPropagation()}>
													<Checkbox aria-label={`Select ${document.name}`} checked={checked} onCheckedChange={() => toggle(document.id)} />
												</td>
											) : null}
											<td>
												<button
													type="button"
													onClick={(event) => {
														event.stopPropagation();
														openDocument(document.id);
													}}
													className={cn('flex min-w-0 cursor-pointer items-center gap-2.5 rounded-sm text-left', focusRingClass)}
												>
													<DocumentGlyph kind={document.kind} />
													<span className="min-w-0">
														<span className="flex flex-wrap items-center gap-1.5">
															{document.status === 'processing' ? (
																<TextShimmer className="truncate font-medium">{document.name}</TextShimmer>
															) : (
																<span className="truncate font-medium text-foreground">{document.name}</span>
															)}
															{latest && latest.number > 1 ? <span className="text-xs text-muted-foreground tabular-nums">v{latest.number}</span> : null}
														</span>
														{needle ? <span className="block truncate text-xs text-muted-foreground">{document.folder === '/' ? ROOT_LABEL : document.folder.slice(1)}</span> : null}
													</span>
												</button>
												<span className="mt-1 flex flex-wrap gap-1 empty:hidden">
													{document.status === 'processing' ? <Badge label="Processing" /> : null}
													{viewOnly ? <Badge label="View only" /> : null}
													{shares ? <Badge label={`Shared with ${shares}`} tone="info" /> : null}
												</span>
											</td>
											<td className="text-muted-foreground tabular-nums">{format.relative(document.updatedAt)}</td>
											<td className="text-right text-muted-foreground tabular-nums">{format.bytes(document.size)}</td>
										</tr>
									);
								})}
							</tbody>
						</TableSurface>
					)}
				</div>

				{dragging ? (
					<div
						aria-hidden="true"
						className="pointer-events-none absolute inset-2 grid place-items-center rounded-xl border-2 border-dashed border-primary/50 bg-[color-mix(in_oklab,var(--primary)_6%,var(--background))]/90"
					>
						<span className="flex items-center gap-2 text-[13px] font-medium text-foreground">
							<Upload className="size-3.5" />
							Drop to upload to {folderName(folder, ROOT_LABEL)}
						</span>
					</div>
				) : null}
			</div>
		</div>
	);
}

function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'info' }) {
	return <ToneBadge tone={tone}>{label}</ToneBadge>;
}
