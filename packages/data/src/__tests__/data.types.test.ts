/**
 * Tests for data.types.ts
 * Tests core type definitions, utilities, and type conversion functions
 */
import { beforeEach, describe, expect, it } from "vitest";
import type { CleanTable, Filter, MetaTable } from "../data.types";
import { cleanTable, pgFieldToCamelCase } from "../data.types";
import { complexTable, filterFixtures, simpleTable } from "./fixtures";
import { createMockMetaResponse, createMockTable } from "./test-helpers";

describe("data.types", () => {
	describe("cleanTable", () => {
		it("should convert MetaTable to CleanTable", () => {
			const metaTable = createMockTable("users")!;
			const result = cleanTable(metaTable);

			expect(result.name).toBe("users");
			expect(result.fields).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						name: "id",
						type: expect.objectContaining({
							gqlType: "UUID",
							isArray: false,
						}),
					}),
					expect.objectContaining({
						name: "name",
						type: expect.objectContaining({
							gqlType: "String",
							isArray: false,
						}),
					}),
				]),
			);
			expect(result.relations).toEqual(
				expect.objectContaining({
					belongsTo: [],
					hasOne: [],
					hasMany: [],
					manyToMany: [],
				}),
			);
			// v5 fields are populated from _meta
			expect(result).toHaveProperty("inflection");
			expect(result).toHaveProperty("query");
		});

		it("should handle null fields gracefully", () => {
			const metaTable = {
				name: "test_table",
				fields: [null, undefined],
				relations: null,
			} as MetaTable;

			const result = cleanTable(metaTable);

			expect(result.name).toBe("test_table");
			expect(result.fields).toEqual([]);
			expect(result.relations).toEqual({
				belongsTo: [],
				hasOne: [],
				hasMany: [],
				manyToMany: [],
			});
		});

		it("should preserve all field type information", () => {
			const metaTable = {
				name: "complex_table",
				fields: [
					{
						name: "complexField",
						type: {
							gqlType: "GeometryPoint",
							isArray: false,
							modifier: null,
							pgAlias: "point",
							pgType: "geometry",
							subtype: "Point",
							typmod: 4326,
						},
					},
				],
				relations: null,
			} as MetaTable;

			const result = cleanTable(metaTable);

			expect(result.fields[0]).toEqual(
				expect.objectContaining({
					name: "complexField",
					type: {
						gqlType: "GeometryPoint",
						isArray: false,
						modifier: null,
						pgAlias: "point",
						pgType: "geometry",
						subtype: "Point",
						typmod: 4326,
					},
				}),
			);
		});
	});

	describe("field conversion within cleanTable", () => {
		it("should convert fields correctly within table conversion", () => {
			const metaTable = {
				name: "testTable",
				fields: [
					{
						name: "testField",
						type: {
							gqlType: "String",
							isArray: false,
							modifier: null,
							pgAlias: "text",
							pgType: "text",
							subtype: null,
							typmod: null,
						},
					},
				],
				relations: null,
			} as MetaTable;

			const result = cleanTable(metaTable);

			expect(result.fields[0]).toEqual(
				expect.objectContaining({
					name: "testField",
					type: {
						gqlType: "String",
						isArray: false,
						modifier: null,
						pgAlias: "text",
						pgType: "text",
						subtype: null,
						typmod: null,
					},
				}),
			);
		});

		it("should handle array fields correctly", () => {
			const metaTable = {
				name: "testTable",
				fields: [
					{
						name: "arrayField",
						type: {
							gqlType: "String",
							isArray: true,
							modifier: null,
							pgAlias: "text",
							pgType: "text[]",
							subtype: null,
							typmod: null,
						},
					},
				],
				relations: null,
			} as MetaTable;

			const result = cleanTable(metaTable);

			expect(result.fields[0].type.isArray).toBe(true);
			expect(result.fields[0].type.pgType).toBe("text[]");
		});

		it("should preserve complex type information", () => {
			const metaTable = {
				name: "testTable",
				fields: [
					{
						name: "geometryField",
						type: {
							gqlType: "GeometryPoint",
							isArray: false,
							modifier: null,
							pgAlias: "point",
							pgType: "geometry",
							subtype: "Point",
							typmod: 4326,
						},
					},
				],
				relations: null,
			} as MetaTable;

			const result = cleanTable(metaTable);

			expect(result.fields[0].type).toEqual({
				gqlType: "GeometryPoint",
				isArray: false,
				modifier: null,
				pgAlias: "point",
				pgType: "geometry",
				subtype: "Point",
				typmod: 4326,
			});
		});
	});

	describe("relations conversion within cleanTable", () => {
		it("should handle null relations gracefully", () => {
			const metaTable = {
				name: "testTable",
				fields: [],
				relations: null,
			} as unknown as MetaTable;

			const result = cleanTable(metaTable);

			expect(result.relations).toEqual({
				belongsTo: [],
				hasOne: [],
				hasMany: [],
				manyToMany: [],
			});
		});

		it("should convert relations correctly", () => {
			const metaTable = {
				name: "testTable",
				fields: [],
				relations: {
					belongsTo: [
						{
							fieldName: "ownerId",
							isUnique: true,
							references: { name: "users" },
							type: "belongsTo",
						},
					],
					hasOne: [],
					hasMany: [],
					manyToMany: [],
				},
			} as unknown as MetaTable;

			const result = cleanTable(metaTable);

			expect(result.relations.belongsTo).toHaveLength(1);
			expect(result.relations.belongsTo[0]).toEqual({
				fieldName: "ownerId",
				isUnique: true,
				referencesTable: "User",
				type: "belongsTo",
				keys: [], // keys field is always present in CleanBelongsToRelation
			});
		});
	});

	describe("manyToMany enrichment in cleanTable", () => {
		it("should map junction key attributes to key fields", () => {
			const metaTable = {
				name: "actions",
				fields: [{ name: "id", type: { gqlType: "UUID", isArray: false } }],
				relations: {
					belongsTo: [],
					hasOne: [],
					hasMany: [],
					manyToMany: [
						{
							fieldName: "goals",
							type: "Goal",
							rightTable: { name: "goals" },
							junctionTable: { name: "actionGoals" },
							junctionLeftKeyAttributes: [
								{ name: "action_id", type: { gqlType: "UUID", isArray: false } },
							],
							junctionRightKeyAttributes: [
								{ name: "goal_id", type: { gqlType: "UUID", isArray: false } },
							],
							leftKeyAttributes: [
								{ name: "id", type: { gqlType: "UUID", isArray: false } },
							],
							rightKeyAttributes: [
								{ name: "id", type: { gqlType: "UUID", isArray: false } },
							],
							junctionLeftConstraint: { name: "fk_action", fields: [], refFields: [], refTable: { name: "actions" } },
							junctionRightConstraint: { name: "fk_goal", fields: [], refFields: [], refTable: { name: "goals" } },
						},
					],
				},
			} as unknown as MetaTable;

			const result = cleanTable(metaTable);

			expect(result.relations.manyToMany).toHaveLength(1);
			expect(result.relations.manyToMany[0]).toEqual(
				expect.objectContaining({
					fieldName: "goals",
					rightTable: "Goal",
					junctionTable: "ActionGoal",
					type: "Goal",
					junctionLeftKeyFields: ["actionId"],
					junctionRightKeyFields: ["goalId"],
					leftKeyFields: ["id"],
					rightKeyFields: ["id"],
				}),
			);
		});

		it("should handle missing junction key attributes gracefully", () => {
			const metaTable = {
				name: "actions",
				fields: [],
				relations: {
					belongsTo: [],
					hasOne: [],
					hasMany: [],
					manyToMany: [
						{
							fieldName: "goals",
							type: "Goal",
							rightTable: { name: "goals" },
							junctionTable: { name: "actionGoals" },
						},
					],
				},
			} as unknown as MetaTable;

			const result = cleanTable(metaTable);

			expect(result.relations.manyToMany[0]).toEqual(
				expect.objectContaining({
					fieldName: "goals",
					junctionLeftKeyFields: [],
					junctionRightKeyFields: [],
					leftKeyFields: [],
					rightKeyFields: [],
				}),
			);
		});

		it("should dedup by rightTable and preserve key fields from last-wins entry", () => {
			const metaTable = {
				name: "actions",
				fields: [],
				relations: {
					belongsTo: [],
					hasOne: [],
					hasMany: [],
					manyToMany: [
						{
							fieldName: "goalsByIncidental",
							type: "Goal",
							rightTable: { name: "goals" },
							junctionTable: { name: "incidentalJunction" },
							junctionLeftKeyAttributes: [
								{ name: "wrong_id", type: { gqlType: "UUID", isArray: false } },
							],
							junctionRightKeyAttributes: [],
							leftKeyAttributes: [],
							rightKeyAttributes: [],
						},
						{
							fieldName: "goals",
							type: "Goal",
							rightTable: { name: "goals" },
							junctionTable: { name: "actionGoals" },
							junctionLeftKeyAttributes: [
								{ name: "action_id", type: { gqlType: "UUID", isArray: false } },
							],
							junctionRightKeyAttributes: [
								{ name: "goal_id", type: { gqlType: "UUID", isArray: false } },
							],
							leftKeyAttributes: [],
							rightKeyAttributes: [],
						},
					],
				},
			} as unknown as MetaTable;

			const result = cleanTable(metaTable);

			expect(result.relations.manyToMany).toHaveLength(1);
			expect(result.relations.manyToMany[0].fieldName).toBe("goals");
			expect(result.relations.manyToMany[0].junctionTable).toBe("ActionGoal");
			expect(result.relations.manyToMany[0].junctionLeftKeyFields).toEqual(["actionId"]);
			expect(result.relations.manyToMany[0].junctionRightKeyFields).toEqual(["goalId"]);
		});

		it("should apply pgFieldToCamelCase to junction key attribute names", () => {
			const metaTable = {
				name: "projects",
				fields: [],
				relations: {
					belongsTo: [],
					hasOne: [],
					hasMany: [],
					manyToMany: [
						{
							fieldName: "tags",
							type: "Tag",
							rightTable: { name: "tags" },
							junctionTable: { name: "projectTags" },
							junctionLeftKeyAttributes: [
								{ name: "project_id", type: { gqlType: "UUID", isArray: false } },
							],
							junctionRightKeyAttributes: [
								{ name: "tag_id", type: { gqlType: "UUID", isArray: false } },
							],
							leftKeyAttributes: [
								{ name: "id", type: { gqlType: "UUID", isArray: false } },
							],
							rightKeyAttributes: [
								{ name: "id", type: { gqlType: "UUID", isArray: false } },
							],
						},
					],
				},
			} as unknown as MetaTable;

			const result = cleanTable(metaTable);

			expect(result.relations.manyToMany[0].junctionLeftKeyFields).toEqual(["projectId"]);
			expect(result.relations.manyToMany[0].junctionRightKeyFields).toEqual(["tagId"]);
		});
	});

	describe("Filter type validation", () => {
		it("should accept valid simple filters", () => {
			const filter: Filter = filterFixtures.simple;

			expect(filter).toEqual({
				isActive: { equalTo: true },
			});
		});

		it("should accept valid string operator filters", () => {
			const filter: Filter = filterFixtures.stringOperators;

			expect(filter).toEqual({
				name: { includes: "test" },
				email: { endsWith: "@example.com" },
				description: { startsWith: "Important" },
			});
		});

		it("should accept valid numeric operator filters", () => {
			const filter: Filter = filterFixtures.numericOperators;

			expect(filter).toEqual({
				age: { greaterThan: 18 },
				score: { lessThanOrEqualTo: 100 },
				rating: { in: [4, 5] },
			});
		});

		it("should accept valid logical operator filters", () => {
			const filter: Filter = filterFixtures.logicalOperators;

			expect(filter).toHaveProperty("and");
			expect(filter).toHaveProperty("or");
			expect(Array.isArray(filter.and)).toBe(true);
			expect(Array.isArray(filter.or)).toBe(true);
		});

		it("should accept valid nested filters", () => {
			const filter: Filter = filterFixtures.nested;

			expect(filter).toHaveProperty("and");
			expect(Array.isArray(filter.and)).toBe(true);
			expect(filter.and).toHaveLength(2);
		});

		it("should accept valid relational filters", () => {
			const filter: Filter = filterFixtures.relational;

			expect(filter).toHaveProperty("posts");
			expect(filter).toHaveProperty("profile");
			expect(filter.posts).toHaveProperty("some");
			expect(filter.profile).toHaveProperty("every");
		});
	});

	describe("pgFieldToCamelCase", () => {
		it("should convert snake_case to camelCase", () => {
			expect(pgFieldToCamelCase("owner_id")).toBe("ownerId");
			expect(pgFieldToCamelCase("created_at")).toBe("createdAt");
			expect(pgFieldToCamelCase("updated_at")).toBe("updatedAt");
			expect(pgFieldToCamelCase("is_active")).toBe("isActive");
		});

		it("should leave camelCase and simple names unchanged", () => {
			expect(pgFieldToCamelCase("id")).toBe("id");
			expect(pgFieldToCamelCase("name")).toBe("name");
			expect(pgFieldToCamelCase("ownerId")).toBe("ownerId");
			expect(pgFieldToCamelCase("createdAt")).toBe("createdAt");
		});

		it("should handle multiple underscores", () => {
			expect(pgFieldToCamelCase("long_field_name_here")).toBe(
				"longFieldNameHere",
			);
		});

		it("should handle digits after underscores", () => {
			expect(pgFieldToCamelCase("field_2_name")).toBe("field2Name");
		});
	});

	describe("cleanTable snake_case field conversion", () => {
		it("should convert snake_case field names to camelCase", () => {
			const metaTable = {
				name: "cars",
				fields: [
					{ name: "id", type: { gqlType: "UUID", isArray: false } },
					{ name: "owner_id", type: { gqlType: "UUID", isArray: false } },
					{ name: "created_at", type: { gqlType: "Datetime", isArray: false } },
					{ name: "model_year", type: { gqlType: "Int", isArray: false } },
				],
				relations: null,
			} as MetaTable;

			const result = cleanTable(metaTable);

			expect(result.fields.map((f) => f.name)).toEqual([
				"id",
				"ownerId",
				"createdAt",
				"modelYear",
			]);
		});

		it("should convert snake_case relation key names to camelCase", () => {
			const metaTable = {
				name: "cars",
				fields: [],
				relations: {
					belongsTo: [
						{
							fieldName: "owner",
							isUnique: false,
							references: { name: "users" },
							type: "belongsTo",
							keys: [
								{ name: "owner_id", type: { gqlType: "UUID", isArray: false } },
							],
						},
					],
					hasOne: [],
					hasMany: [],
					manyToMany: [],
				},
			} as unknown as MetaTable;

			const result = cleanTable(metaTable);

			expect(result.relations.belongsTo[0].keys[0].name).toBe("ownerId");
		});
	});

	describe("Type safety and edge cases", () => {
		it("should handle empty table names", () => {
			const metaTable = {
				name: "",
				fields: [],
				relations: null,
			} as unknown as MetaTable;

			const result = cleanTable(metaTable);
			expect(result.name).toBe("");
		});

		it("should handle fields with missing type information", () => {
			const metaTable = {
				name: "testTable",
				fields: [
					{
						name: "incompleteField",
						type: {
							gqlType: "String",
							isArray: false,
							modifier: null,
							pgAlias: "text",
							pgType: "text",
							subtype: null,
							typmod: null,
						},
					},
				],
				relations: null,
			} as MetaTable;

			const result = cleanTable(metaTable);
			expect(result.fields[0].type.pgType).toBe("text");
		});

		it("should preserve undefined and null values correctly", () => {
			const metaTable = {
				name: "testTable",
				fields: [
					{
						name: "testField",
						type: {
							gqlType: "String",
							isArray: false,
							modifier: null,
							pgAlias: "text",
							pgType: "text",
							subtype: null,
							typmod: null,
						},
					},
				],
				relations: null,
			} as MetaTable;

			const result = cleanTable(metaTable);
			expect(result.fields[0].type.modifier).toBeNull();
			expect(result.fields[0].type.pgAlias).toBe("text");
			expect(result.fields[0].type.subtype).toBeNull();
			expect(result.fields[0].type.typmod).toBeNull();
		});
	});
});
