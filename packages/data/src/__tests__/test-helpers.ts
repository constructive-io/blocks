/**
 * Pure test utilities for data library testing
 * No React, no app-specific dependencies
 */
import { vi } from 'vitest';

import type { MetaQuery, MetaschemaTable, MetaschemaField } from '../meta-query.types';
import type { CleanField, CleanTable } from '../data.types';

/**
 * Mock GraphQL execute function
 */
export function createMockExecute() {
	const mockExecute = vi.fn();

	// Default successful response
	mockExecute.mockResolvedValue({
		data: {},
	});

	return mockExecute;
}

/**
 * Mock meta query response
 */
export function createMockMetaResponse(): MetaQuery {
	return {
		_meta: {
			tables: [
				createMockTable('users'),
				createMockTable('posts'),
				createMockTable('actions'),
				createMockTable('complex_table'),
			],
		},
	};
}

/**
 * Convert snake_case table name to camelCase plural form (matching PostGraphile inflection)
 * e.g. "users" → "users", "complex_table" → "complexTables", "posts" → "posts"
 */
function toCamelCasePlural(name: string): string {
	// Split by underscore, camelCase join, then ensure plural 's'
	const parts = name.split('_');
	const camelCase = parts[0] + parts.slice(1).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('');
	return camelCase.endsWith('s') ? camelCase : camelCase + 's';
}

export function createMockTable(name: string): MetaschemaTable {
	const baseFields = [
		createMockField('id', 'UUID', false),
		createMockField('createdAt', 'Datetime', false),
		createMockField('updatedAt', 'Datetime', false),
	];

	const specificFields = getTableSpecificFields(name);

	const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
	const queryAll = toCamelCasePlural(name);

	return {
		name,
		fields: [...baseFields, ...specificFields],
		query: {
			all: queryAll,
			create: `create${capitalized}`,
			one: name,
			update: `update${capitalized}`,
			delete: `delete${capitalized}`,
		},
		inflection: {
			allRows: `all${capitalized}`,
			conditionType: `${capitalized}Condition`,
			connection: `${capitalized}Connection`,
			createInputType: `${capitalized}Input`,
			createPayloadType: `Create${capitalized}Payload`,
			deletePayloadType: `Delete${capitalized}Payload`,
			edge: `${capitalized}Edge`,
			filterType: `${capitalized}Filter`,
			orderByType: `${capitalized}OrderBy`,
			patchType: `${capitalized}Patch`,
			tableType: capitalized,
			updatePayloadType: `Update${capitalized}Payload`,
			allRowsSimple: name,
			createField: `create${capitalized}`,
			deleteByPrimaryKey: `delete${capitalized}`,
			edgeField: `${name}Edge`,
			enumType: capitalized,
			inputType: `${capitalized}Input`,
			patchField: 'patch',
			tableFieldName: name,
			typeName: capitalized,
			updateByPrimaryKey: `update${capitalized}`,
		},
		relations: {
			belongsTo: [],
			hasOne: [],
			hasMany: [],
			manyToMany: [],
		},
	};
}

/**
 * Get table-specific fields for mock tables
 */
function getTableSpecificFields(
	tableName: string,
): MetaschemaField[] {
	switch (tableName) {
		case 'users':
			return [
				createMockField('name', 'String', false),
				createMockField('email', 'String', false),
				createMockField('isActive', 'Boolean', false),
				createMockField('tags', 'String', true),
			];
		case 'posts':
			return [
				createMockField('title', 'String', false),
				createMockField('content', 'String', false),
				createMockField('published', 'Boolean', false),
				createMockField('authorId', 'UUID', false),
			];
		case 'actions':
			return [
				createMockField('title', 'String', false),
				createMockField('description', 'String', false),
				createMockField('location', 'GeometryPoint', false),
				createMockField('timeRequired', 'Interval', false),
				createMockField('metadata', 'JSON', false),
			];
		default:
			return [];
	}
}

/**
 * Create a mock field
 */
export function createMockField(
	name: string,
	gqlType: string,
	isArray: boolean = false,
): MetaschemaField {
	return {
		name,
		type: {
			gqlType,
			isArray,
			modifier: null,
			pgAlias: null,
			pgType: gqlType.toLowerCase(),
			subtype: null,
			typmod: null,
		},
	};
}

/**
 * Create a clean table for testing
 */
export function createCleanTable(name: string): CleanTable {
	const mockTable = createMockTable(name);

	return {
		name: mockTable.name,
		fields:
			mockTable.fields?.map((field) => ({
				name: field!.name,
				type: {
					gqlType: field!.type!.gqlType,
					isArray: field!.type!.isArray,
					modifier: field!.type!.modifier,
					pgAlias: field!.type!.pgAlias,
					pgType: field!.type!.pgType,
					subtype: field!.type!.subtype,
					typmod: field!.type!.typmod,
				},
			})) || [],
		relations: {
			belongsTo: [],
			hasOne: [],
			hasMany: [],
			manyToMany: [],
		},
	};
}

/**
 * Mock successful GraphQL responses
 */
export const mockResponses = {
	users: {
		users: {
			totalCount: 2,
			nodes: [
				{ id: '1', name: 'John Doe', email: 'john@example.com', isActive: true },
				{ id: '2', name: 'Jane Smith', email: 'jane@example.com', isActive: false },
			],
		},
	},
	posts: {
		posts: {
			totalCount: 1,
			nodes: [{ id: '1', title: 'Test Post', content: 'Test content', published: true, authorId: '1' }],
		},
	},
	actions: {
		actions: {
			totalCount: 1,
			nodes: [
				{
					id: '1',
					title: 'Test Action',
					description: 'Test description',
					location: { x: 10.5, y: 20.3 },
					timeRequired: { days: 1, hours: 2, minutes: 30, months: 0, seconds: 0, years: 0 },
					metadata: { key: 'value' },
				},
			],
		},
	},
};

/**
 * Mock error responses
 */
export const mockErrors = {
	networkError: new Error('Network error'),
	graphqlError: {
		errors: [
			{
				message: 'Field "invalidField" doesn\'t exist on type "User"',
				locations: [{ line: 2, column: 3 }],
				path: ['users'],
			},
		],
	},
	validationError: {
		errors: [
			{
				message: 'Variable "$input" of required type "CreateUserInput!" was not provided.',
				locations: [{ line: 1, column: 1 }],
			},
		],
	},
};

/**
 * Wait for async operations to complete
 */
export function waitForAsync(ms: number = 0): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create mock mutation responses
 */
export const mockMutationResponses = {
	createUser: {
		createUser: {
			user: {
				id: '3',
				name: 'New User',
				email: 'new@example.com',
				isActive: true,
			},
		},
	},
	updateUser: {
		updateUser: {
			user: {
				id: '1',
				name: 'Updated User',
				email: 'updated@example.com',
				isActive: true,
			},
		},
	},
	deleteUser: {
		deleteUser: {
			user: {
				id: '1',
			},
		},
	},
};
