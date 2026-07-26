import type { IntrospectionQueryResponse } from '@constructive-io/graphql-query/introspect/schema-query';
import { buildSchema, graphqlSync } from 'graphql';
import { describe, expect, it } from 'vitest';

import { SCHEMA_INTROSPECTION_QUERY } from '../index';
import { META_CONTRACT_VERSION, MetaContractError } from '../meta-query';
import {
	analyzeSchemaIntrospectionCompatibility,
	assessSchemaIntrospectionCompatibility,
	normalizeSchemaEnumInputValues,
} from '../schema-introspection-compatibility';
import type { MetaQuery } from '../meta-query.types';

const schemaSource = /* GraphQL */ `
	schema {
		query: RootQuery
		mutation: RootMutation
	}

	scalar Cursor
	scalar UUID

	type RootQuery {
		projects(
			first: Int
			last: Int
			offset: Int
			before: Cursor
			after: Cursor
			orderBy: [ProjectsOrderBy!]
			condition: ProjectCondition
			filter: ProjectFilter
		): ProjectsConnection!
		project(id: UUID!): Project
	}

	type RootMutation {
		createProject(input: CreateProjectInput!): CreateProjectPayload
		updateProject(input: UpdateProjectInput!): UpdateProjectPayload
		deleteProject(input: DeleteProjectInput!): DeleteProjectPayload
	}

	type Project {
		id: UUID!
		status: ProjectStatus!
	}

	type ProjectsConnection {
		nodes: [Project!]!
		totalCount: Int!
	}

	type ProjectsEdge {
		node: Project!
	}

	type CreateProjectPayload {
		project: Project
	}

	type UpdateProjectPayload {
		project: Project
	}

	type DeleteProjectPayload {
		clientMutationId: String
	}

	input ProjectCondition {
		status: ProjectStatus
	}

	input ProjectFilter {
		status: ProjectStatus
	}

	input ProjectInput {
		status: ProjectStatus!
	}

	input ProjectPatch {
		status: ProjectStatus
	}

	input CreateProjectInput {
		project: ProjectInput!
	}

	input UpdateProjectInput {
		id: UUID!
		projectPatch: ProjectPatch!
	}

	input DeleteProjectInput {
		id: UUID!
	}

	enum ProjectsOrderBy {
		PRIMARY_KEY_ASC
		PRIMARY_KEY_DESC
	}

	enum ProjectStatus {
		ACTIVE
		ARCHIVED
	}
`;

function introspect(): IntrospectionQueryResponse {
	const result = graphqlSync({
		schema: buildSchema(schemaSource),
		source: SCHEMA_INTROSPECTION_QUERY,
	});
	if (result.errors || !result.data) throw new Error(result.errors?.[0]?.message ?? 'No introspection data');
	return result.data as unknown as IntrospectionQueryResponse;
}

function metaQuery(): MetaQuery {
	return {
		_meta: {
			tables: [
				{
					name: 'Project',
					query: {
						all: 'projects',
						one: 'project',
						create: 'createProject',
						update: 'updateProject',
						delete: 'deleteProject',
					},
					inflection: {
						tableType: 'Project',
						connection: 'ProjectsConnection',
						edge: 'ProjectsEdge',
						filterType: 'ProjectFilter',
						conditionType: 'ProjectCondition',
						orderByType: 'ProjectsOrderBy',
						patchType: 'ProjectPatch',
						createInputType: 'CreateProjectInput',
						createPayloadType: 'CreateProjectPayload',
						updatePayloadType: 'UpdateProjectPayload',
						deletePayloadType: 'DeleteProjectPayload',
					},
					fields: [
						{
							name: 'id',
							type: { gqlType: 'UUID', pgType: 'uuid', isArray: false },
							isPrimaryKey: true,
						},
						{
							name: 'status',
							type: { gqlType: 'ProjectStatus', pgType: 'project_status', isArray: false },
							enumValues: { name: 'ProjectStatus', values: ['ACTIVE', 'ARCHIVED'] },
						},
					],
					primaryKeyConstraints: [
						{
							name: 'projects_pkey',
							fields: [
								{
									name: 'id',
									type: { gqlType: 'UUID', pgType: 'uuid', isArray: false },
								},
							],
						},
					],
				},
			],
		},
	};
}

describe('assessSchemaIntrospectionCompatibility', () => {
	it('accepts exact _meta operations and types using the schema-defined root names', () => {
		expect(assessSchemaIntrospectionCompatibility(introspect(), metaQuery())).toEqual({
			contractVersion: META_CONTRACT_VERSION,
			status: 'compatible',
			missingPaths: [],
		});
	});

	it('resolves PostgreSQL enum identifiers through the field GraphQL type', () => {
		const meta = metaQuery();
		const status = meta._meta!.tables![0]!.fields!.find((field) => field?.name === 'status');
		if (!status) throw new Error('The test fixture requires a status field.');
		status.type!.gqlType = 'projectStatus';
		status.enumValues = {
			name: 'projectStatus',
			values: ['active', 'archived'],
		};

		const analysis = analyzeSchemaIntrospectionCompatibility(introspect(), meta);
		expect(analysis).toEqual({
			contractVersion: META_CONTRACT_VERSION,
			status: 'compatible',
			missingPaths: [],
			enumMappings: [
				{
					tableName: 'Project',
					schemaName: null,
					fieldName: 'status',
					graphQLTypeName: 'ProjectStatus',
					values: [
						{ metaValue: 'active', graphQLValue: 'ACTIVE' },
						{ metaValue: 'archived', graphQLValue: 'ARCHIVED' },
					],
				},
			],
		});
		expect(
			normalizeSchemaEnumInputValues(
				{ status: 'active', labels: ['untouched'] },
				{ name: 'Project', schemaName: null },
				analysis.enumMappings,
			),
		).toEqual({ status: 'ACTIVE', labels: ['untouched'] });
	});

	it('rejects canonical enum collisions instead of guessing an exact GraphQL token', () => {
		const schema = structuredClone(introspect());
		const statusType = schema.__schema.types.find(({ name }) => name === 'ProjectStatus')!;
		statusType.enumValues = [
			...(statusType.enumValues ?? []),
			{ name: 'ACT_IVE', description: null, isDeprecated: false, deprecationReason: null },
		];
		const meta = metaQuery();
		const status = meta._meta!.tables![0]!.fields!.find((field) => field?.name === 'status');
		if (!status) throw new Error('The test fixture requires a status field.');
		status.enumValues = { name: 'projectStatus', values: ['active', 'archived'] };

		const analysis = analyzeSchemaIntrospectionCompatibility(schema, meta);
		expect(analysis.status).toBe('incompatible');
		expect(analysis.enumMappings).toEqual([]);
		expect(analysis.missingPaths).toContain(
			'__schema.types.ProjectStatus.enumValues.active.exactMapping',
		);
	});

	it('keeps enum drift detection strict for lowercase _meta labels', () => {
		const schema = structuredClone(introspect());
		const statusType = schema.__schema.types.find(({ name }) => name === 'ProjectStatus')!;
		statusType.enumValues = statusType.enumValues!.filter(({ name }) => name !== 'ARCHIVED');
		const meta = metaQuery();
		const status = meta._meta!.tables![0]!.fields!.find((field) => field?.name === 'status');
		if (!status) throw new Error('The test fixture requires a status field.');
		status.enumValues = { name: 'projectStatus', values: ['active', 'archived'] };

		const analysis = analyzeSchemaIntrospectionCompatibility(schema, meta);
		expect(analysis.status).toBe('incompatible');
		expect(analysis.missingPaths).toContain(
			'__schema.types.ProjectStatus.enumValues.archived',
		);
	});

	it('requires create and patch inputs to use the mapped enum type', () => {
		const schema = structuredClone(introspect());
		for (const inputTypeName of ['ProjectInput', 'ProjectPatch']) {
			const inputType = schema.__schema.types.find(({ name }) => name === inputTypeName)!;
			const statusField = inputType.inputFields!.find(({ name }) => name === 'status')!;
			let namedType = statusField.type;
			while (namedType.ofType) namedType = namedType.ofType;
			namedType.name = 'String';
		}

		const analysis = analyzeSchemaIntrospectionCompatibility(schema, metaQuery());
		expect(analysis.status).toBe('incompatible');
		expect(analysis.enumMappings).toEqual([]);
		expect(analysis.missingPaths).toEqual(expect.arrayContaining([
			'__schema.types.ProjectInput.inputFields.status.type.ProjectStatus',
			'__schema.types.ProjectPatch.inputFields.status.type.ProjectStatus',
		]));
	});

	it('accepts the current PostGraphile read surface when legacy one/condition hints are absent', () => {
		const schema = structuredClone(introspect());
		const queryRoot = schema.__schema.types.find(({ name }) => name === 'RootQuery')!;
		const projects = queryRoot.fields!.find(({ name }) => name === 'projects')!;
		projects.name = 'activities';
		projects.args = projects.args.filter(({ name }) => name !== 'condition');
		queryRoot.fields = queryRoot.fields!.filter(({ name }) => name !== 'project');
		schema.__schema.types = schema.__schema.types.filter(({ name }) => name !== 'ProjectCondition');

		const meta = metaQuery();
		const table = meta._meta!.tables![0]!;
		table.name = 'Activity';
		table.query!.all = 'activitys';

		expect(assessSchemaIntrospectionCompatibility(schema, meta)).toEqual({
			contractVersion: META_CONTRACT_VERSION,
			status: 'compatible',
			missingPaths: [],
		});
	});

	it('reports operation, argument, object, input, and enum drift as GraphQL paths', () => {
		const schema = structuredClone(introspect());
		const queryRoot = schema.__schema.types.find(({ name }) => name === 'RootQuery')!;
		const projects = queryRoot.fields!.find(({ name }) => name === 'projects')!;
		projects.args = projects.args.filter(({ name }) => name !== 'filter');

		const mutationRoot = schema.__schema.types.find(({ name }) => name === 'RootMutation')!;
		mutationRoot.fields = mutationRoot.fields!.filter(({ name }) => name !== 'deleteProject');

		const project = schema.__schema.types.find(({ name }) => name === 'Project')!;
		project.fields = project.fields!.filter(({ name }) => name !== 'status');

		const filter = schema.__schema.types.find(({ name }) => name === 'ProjectFilter')!;
		filter.kind = 'OBJECT';

		const updateInput = schema.__schema.types.find(({ name }) => name === 'UpdateProjectInput')!;
		updateInput.inputFields = updateInput.inputFields!.filter(({ name }) => name !== 'projectPatch');

		const status = schema.__schema.types.find(({ name }) => name === 'ProjectStatus')!;
		status.enumValues = status.enumValues!.filter(({ name }) => name !== 'ARCHIVED');

		const compatibility = assessSchemaIntrospectionCompatibility(schema, metaQuery());
		expect(compatibility.status).toBe('incompatible');
		expect(compatibility.missingPaths).toEqual(
			expect.arrayContaining([
				'__schema.types.ProjectFilter.kind.INPUT_OBJECT',
				'__schema.types.Project.fields.status',
				'__schema.types.ProjectStatus.enumValues.ARCHIVED',
				'__schema.types.RootQuery.fields.projects.args.filter|where',
				'__schema.types.RootMutation.fields.deleteProject',
				'__schema.types.UpdateProjectInput.inputFields.type.ProjectPatch',
			]),
		);
	});

	it('rejects a missing standard introspection result and malformed _meta data', () => {
		expect(assessSchemaIntrospectionCompatibility(undefined, metaQuery())).toEqual({
			contractVersion: META_CONTRACT_VERSION,
			status: 'incompatible',
			missingPaths: ['__schema'],
		});
		expect(() => assessSchemaIntrospectionCompatibility(introspect(), {})).toThrow(MetaContractError);
	});
});
