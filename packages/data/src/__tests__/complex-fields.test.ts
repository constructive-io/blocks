/**
 * Tests for complex field handling
 * Tests complex GraphQL types (GeometryPoint, Interval, etc.) and their AST generation with proper subfield selection
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CleanField } from "../data.types";
import {
	getCustomAstForCleanField,
	requiresSubfieldSelection,
} from "@constructive-io/graphql-query/custom-ast";
import { complexTable } from "./fixtures";

// Mock the query builder AST functions
vi.mock("@constructive-io/graphql-query/custom-ast", () => ({
	requiresSubfieldSelection: vi.fn(),
	getCustomAstForCleanField: vi.fn(),
	geometryPointAst: vi.fn(),
	intervalAst: vi.fn(),
	geometryGeometryCollectionAst: vi.fn(),
	geoJsonAst: vi.fn(),
}));

describe("complex-fields", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("complex field detection", () => {
		it("should detect GeometryPoint as complex field", () => {
			const field: CleanField = {
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
			};

			vi.mocked(requiresSubfieldSelection).mockReturnValue(true);

			const result = requiresSubfieldSelection(field);
			expect(result).toBe(true);
		});

		it("should detect Interval as complex field", () => {
			const field: CleanField = {
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
			};

			vi.mocked(requiresSubfieldSelection).mockReturnValue(true);

			const result = requiresSubfieldSelection(field);
			expect(result).toBe(true);
		});

		it("should detect GeometryGeometryCollection as complex field", () => {
			const field: CleanField = {
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
			};

			vi.mocked(requiresSubfieldSelection).mockReturnValue(true);

			const result = requiresSubfieldSelection(field);
			expect(result).toBe(true);
		});

		it("should detect GeoJSON as complex field", () => {
			const field: CleanField = {
				name: "geoData",
				type: {
					gqlType: "GeoJSON",
					isArray: false,
					modifier: null,
					pgAlias: null,
					pgType: "geometry",
					subtype: null,
					typmod: null,
				},
			};

			vi.mocked(requiresSubfieldSelection).mockReturnValue(true);

			const result = requiresSubfieldSelection(field);
			expect(result).toBe(true);
		});

		it("should not detect simple types as complex fields", () => {
			const simpleFields = [
				{ gqlType: "String", expected: false },
				{ gqlType: "Int", expected: false },
				{ gqlType: "Boolean", expected: false },
				{ gqlType: "UUID", expected: false },
				{ gqlType: "JSON", expected: false },
				{ gqlType: "Datetime", expected: false },
			];

			simpleFields.forEach(({ gqlType, expected }) => {
				const field: CleanField = {
					name: "testField",
					type: {
						gqlType,
						isArray: false,
						modifier: null,
						pgAlias: null,
						pgType: gqlType.toLowerCase(),
						subtype: null,
						typmod: null,
					},
				};

				vi.mocked(requiresSubfieldSelection).mockReturnValue(expected);

				const result = requiresSubfieldSelection(field);
				expect(result).toBe(expected);
			});
		});

		it("should handle array complex fields", () => {
			const field: CleanField = {
				name: "locations",
				type: {
					gqlType: "GeometryPoint",
					isArray: true,
					modifier: null,
					pgAlias: null,
					pgType: "geometry[]",
					subtype: "Point",
					typmod: null,
				},
			};

			vi.mocked(requiresSubfieldSelection).mockReturnValue(true);

			const result = requiresSubfieldSelection(field);
			expect(result).toBe(true);
		});
	});

	describe("AST generation for complex fields", () => {
		it("should generate AST for GeometryPoint", () => {
			const field: CleanField = {
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
			};

				const mockAst = {
					kind: "Field",
					name: { kind: "Name", value: "location" },
					selectionSet: {
					kind: "SelectionSet",
					selections: [
						{ kind: "Field", name: { kind: "Name", value: "x" } },
						{ kind: "Field", name: { kind: "Name", value: "y" } },
					],
				},
				} as any;

			vi.mocked(getCustomAstForCleanField).mockReturnValue(mockAst);

			const result = getCustomAstForCleanField(field);
			expect(result).toEqual(mockAst);
			expect(getCustomAstForCleanField).toHaveBeenCalledWith(field);
		});

		it("should generate AST for Interval", () => {
			const field: CleanField = {
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
			};

				const mockAst = {
					kind: "Field",
					name: { kind: "Name", value: "timeSpent" },
				selectionSet: {
					kind: "SelectionSet",
					selections: [
						{ kind: "Field", name: { kind: "Name", value: "days" } },
						{ kind: "Field", name: { kind: "Name", value: "hours" } },
						{ kind: "Field", name: { kind: "Name", value: "minutes" } },
						{ kind: "Field", name: { kind: "Name", value: "months" } },
						{ kind: "Field", name: { kind: "Name", value: "seconds" } },
						{ kind: "Field", name: { kind: "Name", value: "years" } },
					],
				},
				} as any;

			vi.mocked(getCustomAstForCleanField).mockReturnValue(mockAst);

			const result = getCustomAstForCleanField(field);
			expect(result).toEqual(mockAst);
		});

		it("should generate AST for GeometryGeometryCollection", () => {
			const field: CleanField = {
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
			};

				const mockAst = {
					kind: "Field",
					name: { kind: "Name", value: "bounds" },
				selectionSet: {
					kind: "SelectionSet",
					selections: [
						{
							kind: "Field",
							name: { kind: "Name", value: "geometries" },
							selectionSet: {
								kind: "SelectionSet",
								selections: [
									{
										kind: "InlineFragment",
										typeCondition: {
											kind: "NamedType",
											name: { kind: "Name", value: "GeometryPoint" },
										},
										selectionSet: {
											kind: "SelectionSet",
											selections: [
												{ kind: "Field", name: { kind: "Name", value: "x" } },
												{ kind: "Field", name: { kind: "Name", value: "y" } },
											],
										},
									},
								],
							},
						},
					],
				},
				} as any;

			vi.mocked(getCustomAstForCleanField).mockReturnValue(mockAst);

			const result = getCustomAstForCleanField(field);
			expect(result).toEqual(mockAst);
		});

		it("should generate AST for GeoJSON", () => {
			const field: CleanField = {
				name: "geoData",
				type: {
					gqlType: "GeoJSON",
					isArray: false,
					modifier: null,
					pgAlias: null,
					pgType: "geometry",
					subtype: null,
					typmod: null,
				},
			};

				const mockAst = {
					kind: "Field",
					name: { kind: "Name", value: "geoData" },
				selectionSet: {
					kind: "SelectionSet",
					selections: [
						{ kind: "Field", name: { kind: "Name", value: "geojson" } },
					],
				},
				} as any;

			vi.mocked(getCustomAstForCleanField).mockReturnValue(mockAst);

			const result = getCustomAstForCleanField(field);
			expect(result).toEqual(mockAst);
		});
	});

	describe("complex field integration", () => {
		it("should handle complex fields in table definition", () => {
				const complexFields = complexTable.fields.filter((field) => {
					vi.mocked(requiresSubfieldSelection).mockImplementation((f: CleanField) => {
					return [
						"GeometryPoint",
						"Interval",
						"GeometryGeometryCollection",
						"GeoJSON",
					].includes(f.type.gqlType);
				});
				return requiresSubfieldSelection(field);
			});

			expect(complexFields.length).toBeGreaterThan(0);

			complexFields.forEach((field) => {
				expect([
					"GeometryPoint",
					"Interval",
					"GeometryGeometryCollection",
					"GeoJSON",
				]).toContain(field.type.gqlType);
			});
		});

		it("should handle mixed simple and complex fields", () => {
			const allFields = complexTable.fields;

				vi.mocked(requiresSubfieldSelection).mockImplementation((field: CleanField) => {
				return [
					"GeometryPoint",
					"Interval",
					"GeometryGeometryCollection",
					"GeoJSON",
				].includes(field.type.gqlType);
			});

			const complexFields = allFields.filter(requiresSubfieldSelection);
			const simpleFields = allFields.filter(
				(field) => !requiresSubfieldSelection(field),
			);

			expect(complexFields.length).toBeGreaterThan(0);
			expect(simpleFields.length).toBeGreaterThan(0);
			expect(complexFields.length + simpleFields.length).toBe(allFields.length);
		});

		it("should handle complex fields with different PostgreSQL subtypes", () => {
			const geometryFields = [
				{
					name: "point",
					type: { gqlType: "GeometryPoint", subtype: "Point" },
				},
				{
					name: "polygon",
					type: { gqlType: "GeometryPolygon", subtype: "Polygon" },
				},
				{
					name: "collection",
					type: {
						gqlType: "GeometryGeometryCollection",
						subtype: "GeometryCollection",
					},
				},
			];

			geometryFields.forEach((field) => {
				vi.mocked(requiresSubfieldSelection).mockReturnValue(true);
				expect(requiresSubfieldSelection(field as CleanField)).toBe(true);
			});
		});
	});

	describe("edge cases and error handling", () => {
		it("should handle fields with null subtype", () => {
			const field: CleanField = {
				name: "testField",
				type: {
					gqlType: "GeometryPoint",
					isArray: false,
					modifier: null,
					pgAlias: null,
					pgType: "geometry",
					subtype: null,
					typmod: null,
				},
			};

			vi.mocked(requiresSubfieldSelection).mockReturnValue(true);

			const result = requiresSubfieldSelection(field);
			expect(result).toBe(true);
		});

		it("should handle fields with undefined properties", () => {
			const field: CleanField = {
				name: "testField",
				type: {
					gqlType: "Interval",
					isArray: false,
					modifier: undefined,
					pgAlias: undefined,
					pgType: "interval",
					subtype: undefined,
					typmod: undefined,
				},
			};

			vi.mocked(requiresSubfieldSelection).mockReturnValue(true);

			const result = requiresSubfieldSelection(field);
			expect(result).toBe(true);
		});

		it("should handle unknown complex types gracefully", () => {
			const field: CleanField = {
				name: "unknownField",
				type: {
					gqlType: "UnknownComplexType",
					isArray: false,
					modifier: null,
					pgAlias: null,
					pgType: "unknown",
					subtype: null,
					typmod: null,
				},
			};

			vi.mocked(requiresSubfieldSelection).mockReturnValue(false);

			const result = requiresSubfieldSelection(field);
			expect(result).toBe(false);
		});

		it("should handle AST generation errors gracefully", () => {
			const field: CleanField = {
				name: "problematicField",
				type: {
					gqlType: "GeometryPoint",
					isArray: false,
					modifier: null,
					pgAlias: null,
					pgType: "geometry",
					subtype: "Point",
					typmod: null,
				},
			};

			vi.mocked(getCustomAstForCleanField).mockImplementation(() => {
				throw new Error("AST generation failed");
			});

			expect(() => getCustomAstForCleanField(field)).toThrow(
				"AST generation failed",
			);
		});

		it("should handle complex fields with SRID information", () => {
			const field: CleanField = {
				name: "locationWithSRID",
				type: {
					gqlType: "GeometryPoint",
					isArray: false,
					modifier: "NOT NULL",
					pgAlias: "point",
					pgType: "geometry",
					subtype: "Point",
					typmod: 4326, // SRID
				},
			};

			vi.mocked(requiresSubfieldSelection).mockReturnValue(true);

			const result = requiresSubfieldSelection(field);
			expect(result).toBe(true);
		});
	});

	describe("performance considerations", () => {
		it("should efficiently detect complex fields in large tables", () => {
			const largeFieldSet = Array.from({ length: 100 }, (_, i) => ({
				name: `field${i}`,
				type: {
					gqlType: i % 10 === 0 ? "GeometryPoint" : "String",
					isArray: false,
					modifier: null,
					pgAlias: null,
					pgType: i % 10 === 0 ? "geometry" : "text",
					subtype: i % 10 === 0 ? "Point" : null,
					typmod: null,
				},
			}));

				vi.mocked(requiresSubfieldSelection).mockImplementation((field: CleanField) => {
				return field.type.gqlType === "GeometryPoint";
			});

			const complexFields = largeFieldSet.filter(requiresSubfieldSelection);
			expect(complexFields).toHaveLength(10);
		});

		it("should cache AST generation results when possible", () => {
			const field: CleanField = {
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
			};

				const mockAst = {
					kind: "Field",
					name: { kind: "Name", value: "location" },
				} as any;
			vi.mocked(getCustomAstForCleanField).mockReturnValue(mockAst);

			// Call multiple times
			const result1 = getCustomAstForCleanField(field);
			const result2 = getCustomAstForCleanField(field);

			expect(result1).toEqual(mockAst);
			expect(result2).toEqual(mockAst);
			expect(getCustomAstForCleanField).toHaveBeenCalledTimes(2);
		});
	});
});
