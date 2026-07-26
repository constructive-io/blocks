import { describe, expect, it } from 'vitest';

import { createSheetsStore } from './sheets-store';
import { buildRelationInfoFromMeta } from './relation-info-slice';
import type { MetaQuery } from '@constructive-io/data';

const TABLE_NAME = 'posts';

const RELATION_INFO = {
	author: {
		kind: 'belongsTo' as const,
		relatedTable: 'users',
		displayCandidates: ['displayName', 'email'],
		relationField: 'author',
		foreignKeyField: 'authorId',
	},
};

describe('relation info slice', () => {
	it('stores relation info for object and map lookups', () => {
		const store = createSheetsStore();
		store.getState().setRelationInfoForTable(TABLE_NAME, RELATION_INFO);

		expect(store.getState().getRelationInfoForTable(TABLE_NAME)).toBe(RELATION_INFO);
		expect(store.getState().getRelationInfoMapForTable(TABLE_NAME)?.get('author')).toEqual(RELATION_INFO.author);
	});

	it('returns existing cached relation info from ensureRelationInfo without rebuilding', () => {
		const store = createSheetsStore();
		store.getState().setRelationInfoForTable(TABLE_NAME, RELATION_INFO);

		const ensured = store.getState().ensureRelationInfo(TABLE_NAME, undefined);
		expect(ensured).toBe(RELATION_INFO);
	});

	it('clears both relation caches', () => {
		const store = createSheetsStore();
		store.getState().setRelationInfoForTable(TABLE_NAME, RELATION_INFO);

		store.getState().clearRelationInfoCache();

		expect(store.getState().relationInfoCache).toEqual({});
		expect(store.getState().relationInfoMapCache).toEqual({});
	});
});

function createMetaField(name: string) {
	return { name, type: { gqlType: 'UUID', isArray: false, modifier: null, pgAlias: null, pgType: 'uuid', subtype: null, typmod: null } };
}

function cap(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }

function createMetaWithM2N(opts: {
	tableName: string;
	m2nFieldName: string;
	rightTableName: string;
	junctionTableName: string;
	includeJunctionKeyAttributes?: boolean;
	includeJunctionTable?: boolean;
}): MetaQuery {
	const {
		tableName,
		m2nFieldName,
		rightTableName,
		junctionTableName,
		includeJunctionKeyAttributes = false,
		includeJunctionTable = false,
	} = opts;

	// Real v5 _meta format: standalone table.name = PascalCaseSingular,
	// but relation target names (rightTable.name, junctionTable.name, references.name)
	// are camelCase codec names (what the server emits before cleanTable() converts them).
	const tableDisplayName = cap(tableName);
	const rightTableDisplayName = cap(rightTableName);
	const junctionTableDisplayName = cap(junctionTableName);

	const tables: any[] = [
		{
			name: tableDisplayName,
			fields: [createMetaField('id'), createMetaField('name')],
			query: { all: `${tableName}s`, one: tableName, create: `create${tableDisplayName}`, update: `update${tableDisplayName}`, delete: `delete${tableDisplayName}` },
			inflection: { tableType: tableDisplayName, allRows: `${tableName}s` },
			relations: {
				belongsTo: [],
				hasOne: [],
				hasMany: [],
				manyToMany: [
					{
						fieldName: m2nFieldName,
						type: rightTableDisplayName,
						rightTable: { name: rightTableName },
						junctionTable: { name: junctionTableName },
						...(includeJunctionKeyAttributes
							? {
									junctionLeftKeyAttributes: [createMetaField(`${tableName}_id`)],
									junctionRightKeyAttributes: [createMetaField(`${rightTableName}_id`)],
									leftKeyAttributes: [createMetaField('id')],
									rightKeyAttributes: [createMetaField('id')],
								}
							: {}),
						junctionLeftConstraint: { name: 'fk_left', fields: [], refFields: [], refTable: { name: tableName } },
						junctionRightConstraint: { name: 'fk_right', fields: [], refFields: [], refTable: { name: rightTableName } },
					},
				],
			},
		},
		{
			name: rightTableDisplayName,
			fields: [createMetaField('id'), createMetaField('name')],
			query: { all: `${rightTableName}s` },
			inflection: { tableType: rightTableDisplayName },
			relations: { belongsTo: [], hasOne: [], hasMany: [], manyToMany: [] },
		},
	];

	if (includeJunctionTable) {
		tables.push({
			name: junctionTableDisplayName,
			fields: [createMetaField('id'), createMetaField(`${tableName}_id`), createMetaField(`${rightTableName}_id`)],
			query: { all: `${junctionTableName}s` },
			inflection: { tableType: junctionTableDisplayName },
			relations: {
				belongsTo: [
					{
						fieldName: `${tableName}By${tableDisplayName}Id`,
						isUnique: false,
						references: { name: tableName },
						type: 'belongsTo',
						keys: [createMetaField(`${tableName}Id`)],
					},
					{
						fieldName: `${rightTableName}By${rightTableDisplayName}Id`,
						isUnique: false,
						references: { name: rightTableName },
						type: 'belongsTo',
						keys: [createMetaField(`${rightTableName}Id`)],
					},
				],
				hasOne: [],
				hasMany: [],
				manyToMany: [],
			},
		});
	}

	return { _meta: { tables } } as MetaQuery;
}

describe('buildRelationInfoFromMeta — hasMany/hasOne FK resolution', () => {
	function createMetaWithHasMany(): MetaQuery {
		return {
			_meta: {
				tables: [
					{
						name: 'Questionnaire',
						fields: [createMetaField('id'), createMetaField('display_name')],
						query: { all: 'questionnaires', one: 'questionnaire', create: 'createQuestionnaire', update: 'updateQuestionnaire', delete: 'deleteQuestionnaire' },
						inflection: { tableType: 'Questionnaire', allRows: 'questionnaires' },
						relations: {
							belongsTo: [],
							hasOne: [],
							hasMany: [
								{
									fieldName: 'formSectionsByQuestionnaireId',
									type: 'FormSection',
									referencedBy: { name: 'formSection' },
									keys: [createMetaField('id')], // PK of Questionnaire, NOT the FK
								},
							],
							manyToMany: [],
						},
					},
					{
						name: 'FormSection',
						fields: [createMetaField('id'), createMetaField('name'), createMetaField('questionnaire_id')],
						query: { all: 'formSections' },
						inflection: { tableType: 'FormSection' },
						relations: {
							belongsTo: [
								{
									fieldName: 'questionnaireByQuestionnaireId',
									isUnique: false,
									references: { name: 'questionnaire' },
									type: 'belongsTo',
									keys: [createMetaField('questionnaire_id')],
								},
							],
							hasOne: [],
							hasMany: [],
							manyToMany: [],
						},
					},
				],
			},
		} as MetaQuery;
	}

	it('resolves hasMany foreignKeyField from related table belongsTo, not from relation.keys', () => {
		const meta = createMetaWithHasMany();
		const info = buildRelationInfoFromMeta('Questionnaire', meta);

		expect(info).not.toBeNull();
		const hasMany = info!['formSectionsByQuestionnaireId'];
		expect(hasMany).toBeDefined();
		expect(hasMany.kind).toBe('hasMany');
		// Should be the FK in FormSection (questionnaireId), NOT the PK of Questionnaire (id)
		expect(hasMany.foreignKeyField).toBe('questionnaireId');
	});

	it('returns undefined foreignKeyField when both belongsTo and foreignKeys are missing (not the PK)', () => {
		// When neither lookup finds the FK, foreignKeyField should be undefined
		// — NOT the PK from relation.keys which would cause wrong mutations
		const meta: MetaQuery = {
			_meta: {
				tables: [
					{
						name: 'Questionnaire',
						fields: [createMetaField('id'), createMetaField('name')],
						query: { all: 'questionnaires', one: 'questionnaire', create: 'createQuestionnaire', update: 'updateQuestionnaire', delete: 'deleteQuestionnaire' },
						inflection: { tableType: 'Questionnaire', allRows: 'questionnaires' },
						relations: {
							belongsTo: [],
							hasOne: [],
							hasMany: [
								{
									fieldName: 'formSessionsByTheirQuestionnaireId',
									type: 'FormSession',
									referencedBy: { name: 'formSession' },
									keys: [createMetaField('id')], // PK of Questionnaire, NOT the FK
									// NO foreignKeys field
								},
							],
							manyToMany: [],
						},
					},
					{
						name: 'FormSession',
						fields: [createMetaField('id'), createMetaField('questionnaire_id')],
						query: { all: 'formsessions' },
						inflection: { tableType: 'FormSession' },
						relations: { belongsTo: [], hasOne: [], hasMany: [], manyToMany: [] },
					},
				],
			},
		} as MetaQuery;

		const info = buildRelationInfoFromMeta('Questionnaire', meta);
		expect(info).not.toBeNull();
		const hasMany = info!['formSessionsByTheirQuestionnaireId'];
		expect(hasMany).toBeDefined();
		expect(hasMany.kind).toBe('hasMany');
		// Must be undefined — NOT 'id' (which is the PK of Questionnaire, not the FK in FormSession)
		expect(hasMany.foreignKeyField).toBeUndefined();
	});

	it('resolves hasMany FK from foreignKeyConstraints on related table when belongsTo is empty', () => {
		const meta: MetaQuery = {
			_meta: {
				tables: [
					{
						name: 'Questionnaire',
						fields: [createMetaField('id'), createMetaField('name')],
						query: { all: 'questionnaires', one: 'questionnaire', create: 'createQuestionnaire', update: 'updateQuestionnaire', delete: 'deleteQuestionnaire' },
						inflection: { tableType: 'Questionnaire', allRows: 'questionnaires' },
						relations: {
							belongsTo: [],
							hasOne: [],
							hasMany: [
								{
									fieldName: 'formSessionsByTheirQuestionnaireId',
									type: 'FormSession',
									referencedBy: { name: 'formSession' },
									keys: [createMetaField('id')],
								},
							],
							manyToMany: [],
						},
					},
					{
						name: 'FormSession',
						fields: [createMetaField('id'), createMetaField('questionnaire_id')],
						query: { all: 'formsessions' },
						inflection: { tableType: 'FormSession' },
						relations: { belongsTo: [], hasOne: [], hasMany: [], manyToMany: [] },
						foreignKeyConstraints: [
							{
								name: 'questionnaireByQuestionnaireId',
								fields: [createMetaField('questionnaire_id')],
								refFields: [createMetaField('id')],
								refTable: { name: 'Questionnaire' },
							},
						],
					},
				],
			},
		} as MetaQuery;

		const info = buildRelationInfoFromMeta('Questionnaire', meta);
		expect(info).not.toBeNull();
		const hasMany = info!['formSessionsByTheirQuestionnaireId'];
		expect(hasMany).toBeDefined();
		expect(hasMany.kind).toBe('hasMany');
		expect(hasMany.foreignKeyField).toBe('questionnaireId');
	});
});

describe('buildRelationInfoFromMeta — M:N', () => {
	it('uses direct key fields from enriched cleanTable', () => {
		const meta = createMetaWithM2N({
			tableName: 'action',
			m2nFieldName: 'goals',
			rightTableName: 'goal',
			junctionTableName: 'actionGoal',
			includeJunctionKeyAttributes: true,
		});

		const info = buildRelationInfoFromMeta('Action', meta);

		expect(info).not.toBeNull();
		expect(info!['goals']).toEqual(
			expect.objectContaining({
				kind: 'manyToMany',
				relatedTable: 'Goal',
				junctionTable: 'ActionGoal',
				junctionLeftKeyField: 'actionId',
				junctionRightKeyField: 'goalId',
			}),
		);
	});

	it('falls back to junction table belongsTo when key attributes are absent', () => {
		const meta = createMetaWithM2N({
			tableName: 'action',
			m2nFieldName: 'goals',
			rightTableName: 'goal',
			junctionTableName: 'actionGoal',
			includeJunctionKeyAttributes: false,
			includeJunctionTable: true,
		});

		const info = buildRelationInfoFromMeta('Action', meta);

		expect(info).not.toBeNull();
		expect(info!['goals']).toEqual(
			expect.objectContaining({
				kind: 'manyToMany',
				junctionLeftKeyField: 'actionId',
				junctionRightKeyField: 'goalId',
			}),
		);
	});

	it('skips manyToMany when junction table has extra required fields (non-pure junction)', () => {
		const meta = createMetaWithM2N({
			tableName: 'formQuestion',
			m2nFieldName: 'formSectionsByFormResponse',
			rightTableName: 'formSection',
			junctionTableName: 'formResponse',
			includeJunctionKeyAttributes: true,
			includeJunctionTable: true,
		});

		// Add extra required fields to the junction table (form_response)
		const junctionTable = (meta._meta!.tables as any[]).find((t: any) => t.name === 'FormResponse');
		junctionTable.fields.push(
			{ ...createMetaField('entity_id'), isNotNull: true, hasDefault: false },
			{ ...createMetaField('session_id'), isNotNull: true, hasDefault: false },
			{ ...createMetaField('target_row_id'), isNotNull: true, hasDefault: false },
		);

		const info = buildRelationInfoFromMeta('FormQuestion', meta);

		expect(info).not.toBeNull();
		// manyToMany should be skipped because junction has extra required fields
		expect(info!['formSectionsByFormResponse']).toBeUndefined();
	});

	it('keeps manyToMany when junction table is pure (only id + the two FK columns)', () => {
		const meta = createMetaWithM2N({
			tableName: 'action',
			m2nFieldName: 'goals',
			rightTableName: 'goal',
			junctionTableName: 'actionGoal',
			includeJunctionKeyAttributes: true,
			includeJunctionTable: true,
		});

		const info = buildRelationInfoFromMeta('Action', meta);

		expect(info).not.toBeNull();
		expect(info!['goals']).toEqual(
			expect.objectContaining({
				kind: 'manyToMany',
				junctionTable: 'ActionGoal',
			}),
		);
	});

	it('keeps manyToMany when junction has extra non-required fields (optional / defaulted)', () => {
		const meta = createMetaWithM2N({
			tableName: 'action',
			m2nFieldName: 'goals',
			rightTableName: 'goal',
			junctionTableName: 'actionGoal',
			includeJunctionKeyAttributes: true,
			includeJunctionTable: true,
		});

		// Extra fields that do NOT make the junction impure: a nullable column and a
		// NOT NULL column that has a default (both are satisfiable without user input).
		const junctionTable = (meta._meta!.tables as any[]).find((t: any) => t.name === 'ActionGoal');
		junctionTable.fields.push(
			{ ...createMetaField('notes'), isNotNull: false, hasDefault: false },
			{ ...createMetaField('created_at'), isNotNull: true, hasDefault: true },
		);

		const info = buildRelationInfoFromMeta('Action', meta);

		expect(info).not.toBeNull();
		expect(info!['goals']).toEqual(
			expect.objectContaining({
				kind: 'manyToMany',
				junctionTable: 'ActionGoal',
			}),
		);
	});
});
