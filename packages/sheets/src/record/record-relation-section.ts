// The contract between the record panel and the relations lane's embeddable
// linked-records section: one section per relation of the open record.

import type { ComponentType } from 'react';

import type { RelationModel, TableModel } from '@constructive-io/data';

import type { SheetsOpenRecordRequest } from '../relations/relation-navigation';
import type { SheetsRowIdentifier } from '../row-identity';

export interface RecordRelationSectionProps {
	/** The record's table model. */
	table: TableModel;
	/** One relation of `table`. */
	relation: RelationModel;
	/** The saved record, or the values of a new record; null while loading. */
	row: Readonly<Record<string, unknown>> | null;
	/** The saved record's identifier, or null for a new record. */
	rowIdentifier: SheetsRowIdentifier | null;
	/** True for a new record that is not created yet. */
	isDraft: boolean;
	/** The relation-level reason the links cannot change here, or null. */
	readOnlyReason: string | null;
	/** belongsTo: the local key fields (and the chosen record under the relation field) to keep or that were written. */
	onCommitPatch: (patch: Record<string, unknown>) => void;
	/** After a write: the panel refetches the record and the grid. */
	onInvalidateData: () => void;
	/** Open a linked record (the panel stacks it; Back returns). */
	onOpenRecord: (request: SheetsOpenRecordRequest) => void;
}

export type RecordRelationSectionComponent = ComponentType<RecordRelationSectionProps>;
