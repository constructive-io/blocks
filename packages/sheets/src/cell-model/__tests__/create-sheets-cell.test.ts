import { describe, expect, it } from 'vitest';

import type { RelationModel } from '@constructive-io/data';

import type { CellCreationMetadata } from '../../grid/grid-cell-types';
import { createSheetsCell } from '../create-sheets-cell';

function metadata(cellType: string, overrides: Partial<CellCreationMetadata> = {}): CellCreationMetadata {
	return {
		cellType,
		fieldName: 'value',
		canEdit: true,
		isReadonly: false,
		activationBehavior: 'double-click',
		...overrides,
	};
}

describe('createSheetsCell', () => {
	it('normalizes an email into navigable data without changing its display value', () => {
		expect(createSheetsCell('ada@example.com', metadata('email'))).toMatchObject({
			kind: 'uri',
			data: 'mailto:ada@example.com',
			displayData: 'ada@example.com',
		});
	});

	it('derives relation labels, truncates them, and reports list overflow', () => {
		const cell = createSheetsCell(
			[{ displayName: 'Alexandria' }, { displayName: 'Bob' }, { displayName: 'Chen' }],
			metadata('relation', {
				relationInfo: { kind: 'hasMany', displayCandidates: ['displayName'] },
				relationOptions: { relationChipLimit: 2, relationLabelMaxLength: 6 },
			}),
		);

		expect(cell).toMatchObject({ kind: 'relation', data: ['Alexa…', 'Bob', '+1'], displayData: '' });
	});

	it('does not expose a draft placeholder as a relation label', () => {
		// The related record is identified by the related table's primary key from the table model.
		const relation: RelationModel = {
			kind: 'belongsTo',
			fieldName: 'author',
			targetKey: 'app.User',
			targetName: 'User',
			shape: 'object',
			readable: true,
			keys: [{ local: 'authorId', remote: 'id' }],
			junction: null,
			target: { primaryKey: ['id'], labelFields: ['displayName'] },
			pageArg: null,
			hasTotalCount: false,
			filter: null,
			editable: true,
			unlinkable: true,
			reason: null,
		};
		expect(
			createSheetsCell(
				{ id: 'draft:pending', displayName: 'Unsaved record' },
				metadata('relation', { relation, relationInfo: { kind: 'belongsTo', displayCandidates: ['displayName'] } }),
			),
		).toMatchObject({ kind: 'relation', data: '', displayData: '' });
	});
});
