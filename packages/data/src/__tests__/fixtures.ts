/**
 * Test fixtures for data library testing
 * Contains sample data, complex scenarios, and edge cases
 */
import type {
	CleanField,
	CleanTable,
	Filter,
	QueryOptions,
} from "../data.types";
import type { FieldSelection } from "@constructive-io/graphql-query/types/selection";

/**
 * Complex table with various field types for comprehensive testing
 */
export const complexTable: CleanTable = {
	name: "complex_table",
	fields: [
		// Basic fields
		{
			name: "id",
			type: {
				gqlType: "UUID",
				isArray: false,
				modifier: null,
				pgAlias: null,
				pgType: "uuid",
				subtype: null,
				typmod: null,
			},
		},
		{
			name: "name",
			type: {
				gqlType: "String",
				isArray: false,
				modifier: null,
				pgAlias: null,
				pgType: "text",
				subtype: null,
				typmod: null,
			},
		},
		{
			name: "email",
			type: {
				gqlType: "String",
				isArray: false,
				modifier: null,
				pgAlias: null,
				pgType: "text",
				subtype: null,
				typmod: null,
			},
		},

		// Numeric fields
		{
			name: "age",
			type: {
				gqlType: "Int",
				isArray: false,
				modifier: null,
				pgAlias: null,
				pgType: "integer",
				subtype: null,
				typmod: null,
			},
		},
		{
			name: "score",
			type: {
				gqlType: "BigFloat",
				isArray: false,
				modifier: null,
				pgAlias: null,
				pgType: "numeric",
				subtype: null,
				typmod: null,
			},
		},

		// Boolean field
		{
			name: "isActive",
			type: {
				gqlType: "Boolean",
				isArray: false,
				modifier: null,
				pgAlias: null,
				pgType: "boolean",
				subtype: null,
				typmod: null,
			},
		},

		// Date/time fields
		{
			name: "createdAt",
			type: {
				gqlType: "Datetime",
				isArray: false,
				modifier: null,
				pgAlias: null,
				pgType: "timestamptz",
				subtype: null,
				typmod: null,
			},
		},
		{
			name: "birthDate",
			type: {
				gqlType: "Date",
				isArray: false,
				modifier: null,
				pgAlias: null,
				pgType: "date",
				subtype: null,
				typmod: null,
			},
		},

		// Complex fields requiring subfield selection
		{
			name: "location",
			type: {
				gqlType: "GeometryPoint",
				isArray: false,
				modifier: null,
				pgAlias: null,
				pgType: "geometry",
				subtype: "Point",
				typmod: null,
			},
		},
		{
			name: "timeSpent",
			type: {
				gqlType: "Interval",
				isArray: false,
				modifier: null,
				pgAlias: null,
				pgType: "interval",
				subtype: null,
				typmod: null,
			},
		},
		{
			name: "bounds",
			type: {
				gqlType: "GeometryGeometryCollection",
				isArray: false,
				modifier: null,
				pgAlias: null,
				pgType: "geometry",
				subtype: "GeometryCollection",
				typmod: null,
			},
		},

		// JSON fields
		{
			name: "metadata",
			type: {
				gqlType: "JSON",
				isArray: false,
				modifier: null,
				pgAlias: null,
				pgType: "jsonb",
				subtype: null,
				typmod: null,
			},
		},
		{
			name: "settings",
			type: {
				gqlType: "JSON",
				isArray: false,
				modifier: null,
				pgAlias: null,
				pgType: "json",
				subtype: null,
				typmod: null,
			},
		},

		// Array fields
		{
			name: "tags",
			type: {
				gqlType: "String",
				isArray: true,
				modifier: null,
				pgAlias: null,
				pgType: "text[]",
				subtype: null,
				typmod: null,
			},
		},
		{
			name: "scores",
			type: {
				gqlType: "Int",
				isArray: true,
				modifier: null,
				pgAlias: null,
				pgType: "integer[]",
				subtype: null,
				typmod: null,
			},
		},
		{
			name: "dates",
			type: {
				gqlType: "Date",
				isArray: true,
				modifier: null,
				pgAlias: null,
				pgType: "date[]",
				subtype: null,
				typmod: null,
			},
		},

		// Special PostgreSQL types
		{
			name: "searchVector",
			type: {
				gqlType: "String",
				isArray: false,
				modifier: null,
				pgAlias: null,
				pgType: "tsvector",
				subtype: null,
				typmod: null,
			},
		},
		{
			name: "ipAddress",
			type: {
				gqlType: "String",
				isArray: false,
				modifier: null,
				pgAlias: null,
				pgType: "inet",
				subtype: null,
				typmod: null,
			},
		},
	],
	relations: {
		belongsTo: [
			{
				fieldName: "owner",
				isUnique: false,
				referencesTable: "users",
				type: "belongsTo",
				keys: [],
			},
		],
		hasOne: [
			{
				fieldName: "profile",
				isUnique: true,
				referencedByTable: "profiles",
				type: "hasOne",
				keys: [],
			},
		],
		hasMany: [
			{
				fieldName: "posts",
				isUnique: false,
				referencedByTable: "posts",
				type: "hasMany",
				keys: [],
			},
		],
		manyToMany: [
			{
				fieldName: "roles",
				rightTable: "roles",
				junctionTable: "user_roles",
				type: "manyToMany",
			},
		],
	},
};

/**
 * Simple table for basic testing
 */
export const simpleTable: CleanTable = {
	name: "simple_table",
	fields: [
		{
			name: "id",
			type: {
				gqlType: "UUID",
				isArray: false,
				modifier: null,
				pgAlias: null,
				pgType: "uuid",
				subtype: null,
				typmod: null,
			},
		},
		{
			name: "name",
			type: {
				gqlType: "String",
				isArray: false,
				modifier: null,
				pgAlias: null,
				pgType: "text",
				subtype: null,
				typmod: null,
			},
		},
		{
			name: "isActive",
			type: {
				gqlType: "Boolean",
				isArray: false,
				modifier: null,
				pgAlias: null,
				pgType: "boolean",
				subtype: null,
				typmod: null,
			},
		},
	],
	relations: {
		belongsTo: [],
		hasOne: [],
		hasMany: [],
		manyToMany: [],
	},
};

/**
 * Sample field selection scenarios
 */
export const fieldSelectionFixtures = {
	minimal: "minimal" as const,
	display: "display" as const,
	all: "all" as const,
	full: "full" as const,

	customSimple: {
		select: ["id", "name", "email"],
	} as FieldSelection,

	customWithExclusions: {
		select: ["id", "name", "email", "isActive"],
		exclude: ["email"],
	} as FieldSelection,

	customWithRelations: {
		select: ["id", "name"],
		include: {
			posts: ["id", "title"],
			profile: true,
		},
	} as FieldSelection,

	customComplex: {
		select: ["id", "name", "location", "timeSpent", "metadata"],
		include: {
			owner: ["id", "name"],
			posts: ["id", "title", "content"],
		},
		exclude: ["searchVector"],
		maxDepth: 3,
	} as FieldSelection,
};

/**
 * Sample query options for testing
 */
export const queryOptionsFixtures: Record<string, QueryOptions> = {
	basic: {
		fieldSelection: "display",
	},

	withPagination: {
		fieldSelection: "all",
		first: 10,
		offset: 20,
	},

	withSorting: {
		fieldSelection: "display",
		orderBy: [
			{ field: "name", direction: "asc" },
			{ field: "createdAt", direction: "desc" },
		],
	},

	withFiltering: {
		fieldSelection: "all",
		where: {
			isActive: { equalTo: true },
			name: { includes: "test" },
			age: { greaterThan: 18 },
		},
	},

	complex: {
		fieldSelection: fieldSelectionFixtures.customComplex,
		first: 50,
		offset: 0,
		orderBy: [
			{ field: "name", direction: "asc" },
			{ field: "createdAt", direction: "desc" },
		],
		where: {
			and: [
				{ isActive: { equalTo: true } },
				{
					or: [
						{ name: { includes: "admin" } },
						{ email: { endsWith: "@company.com" } },
					],
				},
			],
		},
	},
};

/**
 * Sample filter scenarios for testing
 */
export const filterFixtures: Record<string, Filter> = {
	simple: {
		isActive: { equalTo: true },
	},

	stringOperators: {
		name: { includes: "test" },
		email: { endsWith: "@example.com" },
		description: { startsWith: "Important" },
	},

	numericOperators: {
		age: { greaterThan: 18 },
		score: { lessThanOrEqualTo: 100 },
		rating: { in: [4, 5] },
	},

	arrayOperators: {
		tags: { contains: ["important", "urgent"] },
		categories: { overlaps: ["tech", "business"] },
	},

	nullChecks: {
		deletedAt: { isNull: true },
		archivedAt: { isNull: false },
	},

	logicalOperators: {
		and: [{ isActive: { equalTo: true } }, { age: { greaterThan: 18 } }],
		or: [
			{ role: { equalTo: "admin" } },
			{ permissions: { contains: ["write"] } },
		],
	},

	nested: {
		and: [
			{ isActive: { equalTo: true } },
			{
				or: [
					{ name: { includes: "admin" } },
					{
						and: [
							{ age: { greaterThan: 25 } },
							{ experience: { greaterThan: 5 } },
						],
					},
				],
			},
		],
	},

	relational: {
		posts: {
			some: {
				published: { equalTo: true },
				createdAt: { greaterThan: "2024-01-01" },
			},
		},
		profile: {
			every: {
				isComplete: { equalTo: true },
			},
		},
	},
};

/**
 * Sample data responses for testing
 */
export const dataResponseFixtures = {
	users: {
		users: {
			totalCount: 3,
			nodes: [
				{
					id: "1",
					name: "John Doe",
					email: "john@example.com",
					isActive: true,
					age: 30,
					createdAt: "2024-01-01T00:00:00Z",
				},
				{
					id: "2",
					name: "Jane Smith",
					email: "jane@example.com",
					isActive: false,
					age: 25,
					createdAt: "2024-01-02T00:00:00Z",
				},
				{
					id: "3",
					name: "Admin User",
					email: "admin@company.com",
					isActive: true,
					age: 35,
					createdAt: "2024-01-03T00:00:00Z",
				},
			],
		},
	},

	complexData: {
		complexTables: {
			totalCount: 1,
			nodes: [
				{
					id: "1",
					name: "Complex Record",
					email: "complex@example.com",
					age: 30,
					score: 95.5,
					isActive: true,
					createdAt: "2024-01-01T00:00:00Z",
					birthDate: "1994-01-01",
					location: { x: 10.5, y: 20.3 },
					timeSpent: {
						days: 1,
						hours: 2,
						minutes: 30,
						months: 0,
						seconds: 0,
						years: 0,
					},
					bounds: {
						geometries: [
							{ __typename: "GeometryPoint", x: 0, y: 0 },
							{ __typename: "GeometryPoint", x: 10, y: 10 },
						],
					},
					metadata: { key: "value", nested: { prop: "test" } },
					settings: { theme: "dark", notifications: true },
					tags: ["important", "urgent", "test"],
					scores: [85, 90, 95],
					dates: ["2024-01-01", "2024-01-02", "2024-01-03"],
					searchVector: "test:1 important:2",
					ipAddress: "192.168.1.1",
				},
			],
		},
	},

	empty: {
		users: {
			totalCount: 0,
			nodes: [],
		},
	},
};

/**
 * Error scenarios for testing
 */
export const errorFixtures = {
	networkError: new Error("Network request failed"),

	graphqlFieldError: {
		errors: [
			{
				message: 'Field "nonExistentField" doesn\'t exist on type "User"',
				locations: [{ line: 2, column: 3 }],
				path: ["users"],
				extensions: { code: "GRAPHQL_VALIDATION_FAILED" },
			},
		],
	},

	graphqlPermissionError: {
		errors: [
			{
				message: 'Access denied for field "sensitiveData"',
				locations: [{ line: 3, column: 5 }],
				path: ["users", 0, "sensitiveData"],
				extensions: { code: "FORBIDDEN" },
			},
		],
	},

	validationError: {
		errors: [
			{
				message:
					'Variable "$input" of required type "CreateUserInput!" was not provided.',
				locations: [{ line: 1, column: 1 }],
				extensions: { code: "GRAPHQL_VALIDATION_FAILED" },
			},
		],
	},

	multipleErrors: {
		errors: [
			{
				message: "Field error 1",
				path: ["field1"],
			},
			{
				message: "Field error 2",
				path: ["field2"],
			},
		],
	},
};
