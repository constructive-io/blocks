'use client';

import { FileTree, useFileTree } from '@pierre/trees/react';
import * as React from 'react';

import { useLatest } from '../workspace-kit/use-latest';
import { type ColorScheme, TREE_SURFACE_STYLE } from './code-surface-theme';
import type { FileChange } from './harness';

function gitStatus(changes: FileChange[]) {
	// The same path can change in two worktrees; the tree shows it once.
	const byPath = new Map(changes.map((change) => [change.path, change.before === null ? ('added' as const) : ('modified' as const)]));
	return [...byPath].map(([path, status]) => ({ path, status }));
}

/**
 * The session's checkout as a searchable tree, with changed files marked and their folders rolled up. Choosing a
 * file opens it in a preview tab.
 */
export function WorkspaceTree({
	paths,
	changes,
	selected,
	scheme,
	onOpen
}: {
	paths: string[];
	changes: FileChange[];
	selected: string | null;
	scheme: ColorScheme;
	onOpen: (path: string) => void;
}) {
	// The tree's selection callback is fixed when its model is created, so it reads the newest handler and paths.
	const onOpenRef = useLatest(onOpen);
	const fileSet = useLatest(React.useMemo(() => new Set(paths), [paths]));
	const { model } = useFileTree({
		paths,
		initialExpansion: 1,
		// Deep single-child folders stay separate rows; joined into one they become unreadable slivers in a narrow column.
		flattenEmptyDirectories: false,
		search: true,
		fileTreeSearchMode: 'hide-non-matches',
		gitStatus: gitStatus(changes),
		icons: { set: 'standard', colored: false },
		itemHeight: 26,
		initialSelectedPaths: selected ? [selected] : [],
		onSelectionChange: (selection) => {
			const path = selection[0];
			// Folders select too; only files open.
			if (path && fileSet.current.has(path)) onOpenRef.current(path);
		}
	});

	// The model is created once, so later paths and statuses are pushed into it.
	const pathsKey = paths.join('\n');
	React.useEffect(() => {
		model.resetPaths(paths);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [model, pathsKey]);
	React.useEffect(() => {
		model.setGitStatus(gitStatus(changes));
	}, [model, changes]);
	// The highlighted row follows the open file, however it was opened, so clicking it again always registers.
	React.useEffect(() => {
		for (const path of model.getSelectedPaths()) if (path !== selected) model.getItem(path)?.deselect();
		if (!selected) return;
		const item = model.getItem(selected);
		if (item && !item.isSelected()) {
			item.select();
			model.scrollToPath(selected, { offset: 'nearest' });
		}
	}, [model, selected]);

	return (
		<FileTree
			model={model}
			aria-label="Files"
			className="h-full"
			style={{ ...TREE_SURFACE_STYLE, colorScheme: scheme }}
		/>
	);
}
