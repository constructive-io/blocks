'use client';

import * as React from 'react';

import { cn } from '../../lib/utils';

type DiffTableColumn<T> = {
	id: string;
	header: React.ReactNode;
	/** Cell render for base rows. */
	cell: (row: T) => React.ReactNode;
	/** Optional mono / width hint. */
	className?: string;
};

type DiffTableRowBase = {
	id: string;
	/** Mark for removal highlight. */
	removed?: boolean;
};

type DiffTableAddedRow = {
	id: string;
	cells: React.ReactNode[];
};

type DiffTableProps<T extends DiffTableRowBase> = {
	title?: React.ReactNode;
	columns: DiffTableColumn<T>[];
	rows: T[];
	/** Rows that appear as green additions. */
	addedRows?: DiffTableAddedRow[];
	/**
	 * When true, play a simple enter animation (removed tint → added row).
	 * Hosts that drive state live should leave this false.
	 */
	animate?: boolean;
	className?: string;
};

/**
 * Table of proposed AI edits: removed rows tint destructive, added rows tint success.
 */
function DiffTable<T extends DiffTableRowBase>({
	title = 'Proposed changes',
	columns,
	rows,
	addedRows = [],
	animate = false,
	className,
}: DiffTableProps<T>) {
	const [stage, setStage] = React.useState(animate ? 0 : 2);

	React.useEffect(() => {
		if (!animate) {
			setStage(2);
			return;
		}
		setStage(0);
		const t1 = window.setTimeout(() => setStage(1), 500);
		const t2 = window.setTimeout(() => setStage(2), 1100);
		return () => {
			window.clearTimeout(t1);
			window.clearTimeout(t2);
		};
	}, [animate, rows, addedRows]);

	const showRemovedTint = stage >= 1;
	const showAdded = stage >= 2 && addedRows.length > 0;

	return (
		<div
			data-slot="diff-table"
			className={cn(
				'w-full overflow-hidden rounded-xl border border-border bg-card shadow-xs',
				className,
			)}
		>
			{title ? (
				<div className="flex items-center justify-between border-b border-border px-3 py-2">
					<span className="text-[12.5px] font-medium text-foreground">{title}</span>
				</div>
			) : null}
			<div className="overflow-x-auto">
				<table className="w-full border-collapse text-left text-[13px]">
					<thead>
						<tr className="border-b border-border">
							{columns.map((col) => (
								<th
									key={col.id}
									scope="col"
									className={cn(
										'px-3 py-2 text-[12px] font-medium text-muted-foreground',
										col.className,
									)}
								>
									{col.header}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{rows.map((row) => {
							const out = Boolean(row.removed && showRemovedTint);
							return (
								<tr
									key={row.id}
									data-removed={out ? 'true' : undefined}
									className={cn(
										'border-b border-border last:border-0',
										'transition-colors duration-200 ease-out motion-reduce:transition-none',
										out && 'bg-destructive/8',
									)}
								>
									{columns.map((col, colIndex) => (
										<td
											key={col.id}
											className={cn(
												'px-3 py-2 align-middle transition-colors duration-200 motion-reduce:transition-none',
												out && 'text-destructive',
												out && colIndex > 0 && 'line-through decoration-destructive/50',
												!out && colIndex === 0 && 'font-medium text-foreground',
												!out && colIndex > 0 && 'text-muted-foreground',
												col.className,
											)}
										>
											{col.cell(row)}
										</td>
									))}
								</tr>
							);
						})}
						{addedRows.map((row) => (
							<tr key={row.id} className="border-0">
								<td colSpan={columns.length} className="p-0">
									<div
										className={cn(
											'grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none',
											showAdded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
										)}
									>
										<div className="overflow-hidden bg-success/8">
											<div
												className="grid items-center border-t border-border"
												style={{
													gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`,
												}}
											>
												{row.cells.map((cell, i) => (
													<div
														key={i}
														className={cn(
															'px-3 py-2 text-success',
															i === 0 && 'font-medium',
														)}
													>
														{cell}
													</div>
												))}
											</div>
										</div>
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

export { DiffTable };
export type { DiffTableProps, DiffTableColumn, DiffTableRowBase, DiffTableAddedRow };
