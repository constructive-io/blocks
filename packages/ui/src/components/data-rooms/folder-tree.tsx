'use client';

import { ChevronRight, FolderClosed, FolderOpen } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { focusRingClass } from '../workspace-kit/primitives';
import { folderContains, folderName, normalizeFolder, parentFolder } from './access';
import type { DataRoomDocument } from './types';

/** What the room root is called in the tree, breadcrumb, and pickers. */
export const ROOT_LABEL = 'All documents';

/** Immediate child folders of `folder` among `folders`. */
export function childFolders(folders: readonly string[], folder: string) {
	return folders.filter((candidate) => candidate !== folder && parentFolder(candidate) === normalizeFolder(folder));
}

function depthOf(path: string) {
	const normalized = normalizeFolder(path);
	return normalized === '/' ? 0 : normalized.split('/').length - 1;
}

type FolderNode = { path: string; depth: number; count: number };

type FolderTreeProps = {
	/** Folders to show, root included. */
	folders: readonly string[];
	/** Documents the person can open, counted under each folder. */
	documents: readonly DataRoomDocument[];
	/** The open folder. */
	current: string;
	/** True while a search replaces the folder view, so no folder reads as open. */
	searching: boolean;
	onSelect: (path: string) => void;
	/** A quiet note under the tree. */
	note?: React.ReactNode;
};

/**
 * The room's folders as a collapsible tree. Counts stay faint and show on
 * hover, or for the open folder, so the tree reads as navigation.
 */
export function FolderTree({ folders, documents, current, searching, onSelect, note }: FolderTreeProps) {
	const [collapsed, setCollapsed] = React.useState<ReadonlySet<string>>(() => new Set());
	const open = normalizeFolder(current);

	const tree = React.useMemo<FolderNode[]>(() => {
		const nodes: FolderNode[] = [];
		const visit = (path: string) => {
			nodes.push({ path, depth: depthOf(path), count: documents.filter((document) => folderContains(path, document.folder)).length });
			if (collapsed.has(path)) return;
			for (const child of childFolders(folders, path)) visit(child);
		};
		visit('/');
		return nodes;
	}, [collapsed, documents, folders]);

	const toggle = (path: string) =>
		setCollapsed((previous) => {
			const next = new Set(previous);
			if (next.has(path)) next.delete(path);
			else next.add(path);
			return next;
		});

	return (
		<nav aria-label="Folders" className="hidden w-60 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-border p-2 @3xl/view:flex">
			<ul className="flex flex-col gap-0.5">
				{tree.map((node) => {
					const active = node.path === open && !searching;
					const expanded = !collapsed.has(node.path);
					return (
						<li key={node.path} className="flex items-center" style={{ paddingLeft: node.depth * 12 }}>
							{childFolders(folders, node.path).length > 0 ? (
								<button
									type="button"
									aria-label={`${expanded ? 'Collapse' : 'Expand'} ${folderName(node.path, ROOT_LABEL)}`}
									aria-expanded={expanded}
									onClick={() => toggle(node.path)}
									className={cn('grid size-6 shrink-0 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-overlay-hover hover:text-foreground', focusRingClass)}
								>
									<ChevronRight aria-hidden="true" className={cn('size-3.5 transition-transform duration-(--duration-fast) motion-reduce:transition-none', expanded && 'rotate-90')} />
								</button>
							) : (
								<span aria-hidden="true" className="size-6 shrink-0" />
							)}
							<button
								type="button"
								aria-current={active ? 'true' : undefined}
								onClick={() => onSelect(node.path)}
								className={cn(
									'group/folder flex h-7 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md px-1.5 text-left text-[13px]',
									focusRingClass,
									active ? 'bg-sidebar-accent font-medium text-foreground' : 'text-foreground/90 hover:bg-overlay-hover',
								)}
							>
								{active ? (
									<FolderOpen aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
								) : (
									<FolderClosed aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
								)}
								<span className="min-w-0 flex-1 truncate">{folderName(node.path, ROOT_LABEL)}</span>
								<span className={cn('text-xs text-subtle-foreground tabular-nums', !active && 'opacity-0 group-hover/folder:opacity-100 group-focus-visible/folder:opacity-100')}>
									{node.count}
								</span>
							</button>
						</li>
					);
				})}
			</ul>
			{note ? <p className="mt-2 px-2 text-xs text-pretty text-subtle-foreground">{note}</p> : null}
		</nav>
	);
}
