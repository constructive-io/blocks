'use client';

// The record detail panel: a side sheet beside the grid (not modal, so the grid stays
// usable and a click on another row's expand control switches the record). It shows
// one record, a linked record stacked above it (Back returns), or a new-record form.
// Escape or the close button closes it, and focus returns to the grid.
//
// The panel opens and closes at once, with no slide: people open it from the keyboard
// and move through records many times in a row, so it must not lag behind them
// (Craft: Hover Restraint). Surfaces inside it (menus, dialogs) keep their own motion.

import { useCallback } from 'react';
import { MotionConfig } from 'motion/react';

import { Sheet, SheetContent } from '@constructive-io/ui/sheet';

import type { CellTypeRegistry } from '../cell-types/cell-type-registry';
import {
	SheetsOpenRecordContext,
	SheetsOpenTableContext,
	type SheetsOpenRecordRequest,
	type SheetsOpenTableHandler,
} from '../relations/relation-navigation';
import { RecordCreateView } from './record-create-view';
import type { RecordRelationSectionComponent } from './record-relation-section';
import type { RecordPanelRecordEntry } from './record-target';
import { RecordView, type RecordNavigation } from './record-view';
import type { RecordPanelController } from './use-record-panel-state';

export interface RecordPanelProps {
	controller: RecordPanelController;
	registry: CellTypeRegistry;
	/** Host cell-type overrides (`SheetsConfig.fieldTypeOverrides`). */
	typeOverrides?: Readonly<Record<string, string>>;
	/** Why files cannot be changed here (no storage endpoint), as in the grid; null when they can. */
	mediaReason?: string | null;
	/** Previous/next for a record of the grid's table, from the grid's rows. */
	navigationFor: (entry: RecordPanelRecordEntry) => RecordNavigation;
	/** A write changed rows the grid may show. */
	onGridInvalidate: () => void;
	/** The host's handler for "Open {table}" (impure links), passed to the linked-record sections. */
	onOpenTable?: SheetsOpenTableHandler | null;
	/** The element that takes focus when the panel closes (the grid). */
	returnFocus: () => HTMLElement | null;
	/** Linked-record sections, or null to list a relation's key fields as plain fields. */
	RelationSection?: RecordRelationSectionComponent | null;
}

function entryKey(entry: RecordPanelRecordEntry): string {
	return `${entry.tableKey}:${JSON.stringify(Object.entries(entry.key).sort(([a], [b]) => a.localeCompare(b)))}`;
}

export function RecordPanel({
	controller,
	registry,
	typeOverrides,
	mediaReason = null,
	navigationFor,
	onGridInvalidate,
	onOpenTable,
	returnFocus,
	RelationSection = null,
}: RecordPanelProps) {
	const entry = controller.current;
	const { pushRecord, back, close, replaceCurrent } = controller;

	const openLinked = useCallback(
		(request: SheetsOpenRecordRequest) =>
			pushRecord({ kind: 'record', tableKey: request.tableKey, tableName: request.tableName, key: request.key, label: request.label }),
		[pushRecord],
	);
	const isRoot = entry !== null && entry === controller.root;

	return (
		<MotionConfig skipAnimations>
			<Sheet
				open={entry !== null}
				onOpenChange={(open) => {
					if (!open) close();
				}}
				modal={false}
				disablePointerDismissal
			>
				<SheetContent
					side='right'
					overlay={false}
					data-slot='record-panel'
					className='w-full gap-0 sm:max-w-xl'
					finalFocus={() => returnFocus() ?? true}
				>
					<MotionConfig skipAnimations={false}>
						<SheetsOpenTableContext.Provider value={onOpenTable ?? null}>
							<SheetsOpenRecordContext.Provider value={openLinked}>
								{/* Escape closes the panel when it is not taken by an editor or a field inside it. */}
								<div
									className='contents'
									onKeyDown={(event) => {
										if (event.key === 'Escape' && !event.defaultPrevented) {
											event.preventDefault();
											close();
										}
									}}
								>
									{entry?.kind === 'record' ? (
										<RecordView
											key={entryKey(entry)}
											entry={entry}
											registry={registry}
											typeOverrides={typeOverrides}
											mediaReason={mediaReason}
											navigation={isRoot ? navigationFor(entry) : undefined}
											onBack={controller.canGoBack ? back : undefined}
											onOpenRecord={openLinked}
											onDeleted={() => {
												onGridInvalidate();
												const next = isRoot ? navigationFor(entry).next : null;
												if (next) next();
												else replaceCurrent(null);
											}}
											onInvalidate={onGridInvalidate}
											RelationSection={RelationSection}
										/>
									) : entry?.kind === 'new' ? (
										<RecordCreateView
											key={`${entry.tableKey}:new`}
											entry={entry}
											registry={registry}
											typeOverrides={typeOverrides}
											mediaReason={mediaReason}
											onCreated={(created) => replaceCurrent(created)}
											onCancel={close}
											onInvalidate={onGridInvalidate}
											onOpenRecord={openLinked}
											RelationSection={RelationSection}
										/>
									) : null}
								</div>
							</SheetsOpenRecordContext.Provider>
						</SheetsOpenTableContext.Provider>
					</MotionConfig>
				</SheetContent>
			</Sheet>
		</MotionConfig>
	);
}
