/**
 * Query Generator Tests
 * Consolidated: table utilities, select/findOne/count, mutations, edge cases
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CleanTable, QueryOptions } from "../data.types";
import {
	buildCount,
	buildFindOne,
	buildPostGraphileCreate,
	buildPostGraphileDelete,
	buildPostGraphileUpdate,
	buildSelect,
	createASTQueryBuilder,
	toCamelCasePlural,
	toCamelCaseSingular,
	toPatchFieldName,
} from "../index";
import { complexTable, queryOptionsFixtures, simpleTable } from "./fixtures";
import { createCleanTable } from "./test-helpers";

vi.mock("@constructive-io/graphql-query/query-builder", () => ({
	QueryBuilder: vi.fn().mockImplementation(() => ({
		query: vi.fn().mockReturnThis(),
		getMany: vi.fn().mockReturnThis(),
		getOne: vi.fn().mockReturnThis(),
		create: vi.fn().mockReturnThis(),
		update: vi.fn().mockReturnThis(),
		delete: vi.fn().mockReturnThis(),
		print: vi
			.fn()
			.mockReturnValue({ _hash: "mock-hash", _queryName: "mockQuery" }),
	})),
}));

describe("query-generator", () => {
	let testTable: CleanTable;
	let allTables: CleanTable[];

	beforeEach(() => {
		testTable = complexTable;
		allTables = [complexTable, simpleTable];
		vi.clearAllMocks();
	});

	describe("toCamelCasePlural", () => {
		const cases = [
			["user", "users"],
			["post", "posts"],
			["category", "categories"],
			["user_profile", "userProfiles"],
			["blog_post", "blogPosts"],
			["users", "users"],
			["data", "data"],
			["", "s"],
		] as const;

		it.each(cases)("converts %s → %s", (input, expected) => {
			expect(toCamelCasePlural(input)).toBe(expected);
		});

		it("prefers valid server-provided query.all names", () => {
			const table = createCleanTable("Activity");
			table.query = { ...(table.query ?? {}), all: "customActivities" } as any;

			expect(toCamelCasePlural("Activity", table)).toBe("customActivities");
		});

		it("ignores likely-naive _meta fallback names when they conflict with inflection rules", () => {
			const table = createCleanTable("Activity");
			table.query = { ...(table.query ?? {}), all: "activitys" } as any;
			table.inflection = {
				...(table.inflection ?? {}),
				allRows: "activitys",
			} as any;

			expect(toCamelCasePlural("Activity", table)).toBe("activities");
		});

		it("rejects miscased server values for multi-word tables", () => {
			const table = createCleanTable("delivery_zones");
			table.query = { ...(table.query ?? {}), all: "deliveryzones" } as any;
			expect(toCamelCasePlural("delivery_zones", table)).toBe("deliveryZones");
		});

		it("accepts correctly-cased server values for multi-word tables", () => {
			const table = createCleanTable("delivery_zones");
			table.query = { ...(table.query ?? {}), all: "deliveryZones" } as any;
			expect(toCamelCasePlural("delivery_zones", table)).toBe("deliveryZones");
		});

		it("accepts genuinely different server override names", () => {
			const table = createCleanTable("delivery_zones");
			table.query = { ...(table.query ?? {}), all: "zones" } as any;
			expect(toCamelCasePlural("delivery_zones", table)).toBe("zones");
		});
	});

	describe("name helpers", () => {
		it("resolves singular names from server query metadata", () => {
			const table = createCleanTable("Activity");
			table.query = { ...(table.query ?? {}), one: "activityRecord" } as any;

			expect(toCamelCaseSingular("Activity", table)).toBe("activityRecord");
		});

		it("singular: rejects miscased server values", () => {
			const table = createCleanTable("tracking_event");
			table.query = { ...(table.query ?? {}), one: "trackingevent" } as any;
			table.inflection = undefined as any;
			expect(toCamelCaseSingular("tracking_event", table)).toBe(
				"trackingEvent",
			);
		});

		it("singular: accepts correctly-cased server values", () => {
			const table = createCleanTable("tracking_event");
			table.query = { ...(table.query ?? {}), one: "trackingEvent" } as any;
			expect(toCamelCaseSingular("tracking_event", table)).toBe(
				"trackingEvent",
			);
		});

		it("singular: accepts genuinely different server override names", () => {
			const table = createCleanTable("tracking_event");
			table.query = { ...(table.query ?? {}), one: "event" } as any;
			expect(toCamelCaseSingular("tracking_event", table)).toBe("event");
		});

		it("uses v5-style entity patch field fallback when patchField is absent", () => {
			const table = createCleanTable("Contact");
			table.query = { ...(table.query ?? {}), one: "contact" } as any;
			table.inflection = {
				...(table.inflection ?? {}),
				patchField: undefined,
			} as any;

			expect(toPatchFieldName("Contact", table)).toBe("contactPatch");
		});
	});

	describe("buildSelect", () => {
		const selectCases = [
			["basic", { fieldSelection: "display" }],
			["with pagination", queryOptionsFixtures.withPagination],
			["with sorting", queryOptionsFixtures.withSorting],
			["with filtering", queryOptionsFixtures.withFiltering],
			["complex", queryOptionsFixtures.complex],
			["empty", {}],
			["undefined", undefined],
		] as const;

		it.each(selectCases)("builds %s query", (_, options) => {
			const result = buildSelect(testTable, allTables, options as any);
			expect(result).toBeDefined();
			expect(typeof result.toString()).toBe("string");
		});

		it("aliases remapped relation fields to preserve raw response keys", () => {
			const activityTable = createCleanTable("Activity");
			const contactTable = createCleanTable("Contact");
			contactTable.fields = contactTable.fields.filter((field) =>
				["id", "name"].includes(field.name),
			);

			activityTable.fields = [
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
					name: "contactId",
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
			];
			activityTable.relations.belongsTo = [
				{
					fieldName: "contactsByMyContactId",
					isUnique: false,
					referencesTable: "Contact",
					type: "belongsTo",
					keys: [
						{
							name: "contactId",
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
					],
				},
			];

			const result = buildSelect(activityTable, [activityTable, contactTable], {
				fieldSelection: { includeRelations: ["contactsByMyContactId"] },
				relationFieldMap: { contactsByMyContactId: "contactByContactId" },
			});

			expect(result.toString()).toContain(
				"contactsByMyContactId: contactByContactId",
			);
		});

		it("omits unmapped relation fields when relationFieldMap marks them as null", () => {
			const activityTable = createCleanTable("Activity");
			const contactTable = createCleanTable("Contact");
			contactTable.fields = contactTable.fields.filter((field) =>
				["id", "name"].includes(field.name),
			);

			activityTable.fields = [
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
					name: "contactId",
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
			];
			activityTable.relations.belongsTo = [
				{
					fieldName: "contactsByMyContactId",
					isUnique: false,
					referencesTable: "Contact",
					type: "belongsTo",
					keys: [
						{
							name: "contactId",
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
					],
				},
			];

			const result = buildSelect(activityTable, [activityTable, contactTable], {
				fieldSelection: { includeRelations: ["contactsByMyContactId"] },
				relationFieldMap: { contactsByMyContactId: null },
			});
			const query = result.toString();

			expect(query).not.toContain("contactsByMyContactId");
			expect(query).toContain("id");
		});
	});

	describe("buildFindOne", () => {
		it("builds with default and custom primary key", () => {
			expect(buildFindOne(testTable)).toBeDefined();
			expect(buildFindOne(testTable, "customId")).toBeDefined();
		});

		it("handles table without id field", () => {
			const tableWithoutId = createCleanTable("no_id");
			tableWithoutId.fields = [
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
			];
			expect(buildFindOne(tableWithoutId)).toBeDefined();
		});
	});

	describe("buildCount", () => {
		it("builds count query", () => {
			expect(buildCount(testTable)).toBeDefined();
			expect(typeof buildCount(testTable).toString()).toBe("string");
		});
	});

	describe("PostGraphile mutations", () => {
		const mutationCases = [
			["create default", () => buildPostGraphileCreate(testTable, allTables)],
			[
				"create all fields",
				() =>
					buildPostGraphileCreate(testTable, allTables, {
						fieldSelection: "all",
					}),
			],
			[
				"create specific",
				() =>
					buildPostGraphileCreate(testTable, allTables, {
						fieldSelection: { select: ["id", "name"] },
					}),
			],
			["update default", () => buildPostGraphileUpdate(testTable, allTables)],
			[
				"update display",
				() =>
					buildPostGraphileUpdate(testTable, allTables, {
						fieldSelection: "display",
					}),
			],
			["delete default", () => buildPostGraphileDelete(testTable, allTables)],
			["delete simple", () => buildPostGraphileDelete(simpleTable, allTables)],
		] as const;

		it.each(mutationCases)("builds %s mutation", (_, buildFn) => {
			const result = buildFn();
			expect(result).toBeDefined();
			expect(typeof result.toString()).toBe("string");
		});
	});

	describe("createASTQueryBuilder", () => {
		it("creates builder with tables", () => {
			expect(createASTQueryBuilder(allTables)).toBeDefined();
			expect(createASTQueryBuilder([testTable])).toBeDefined();
		});
	});

	describe("edge cases", () => {
		it("handles empty fields", () => {
			const emptyTable = createCleanTable("empty");
			emptyTable.fields = [];
			expect(buildSelect(emptyTable, [emptyTable])).toBeDefined();
		});

		it("handles invalid field selection", () => {
			const options: QueryOptions = {
				fieldSelection: { select: ["nonExistent"] },
			};
			expect(buildSelect(testTable, allTables, options)).toBeDefined();
		});

		it("handles complex nested filters", () => {
			const options: QueryOptions = {
				where: {
					and: [
						{
							or: [
								{ name: { includes: "test" } },
								{ email: { endsWith: ".com" } },
							],
						},
						{
							and: [
								{ isActive: { equalTo: true } },
								{ age: { greaterThan: 18 } },
							],
						},
					],
				},
			};
			expect(buildSelect(testTable, allTables, options)).toBeDefined();
		});

		it("handles null/undefined options", () => {
			const options: QueryOptions = {
				fieldSelection: undefined,
				where: undefined,
				orderBy: undefined,
			};
			expect(buildSelect(testTable, allTables, options)).toBeDefined();
		});
	});
});
