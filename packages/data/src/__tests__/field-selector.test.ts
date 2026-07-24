/**
 * Tests for field-selector.ts
 * Tests field selection presets, custom selections, validation, and complex field handling
 */
import { beforeEach, describe, expect, it } from "vitest";

import {
	convertToSelectionOptions,
	type FieldSelection,
	type SimpleFieldSelection,
	validateFieldSelection,
} from "../index";
import { complexTable, fieldSelectionFixtures, simpleTable } from "./fixtures";
import { createCleanTable } from "./test-helpers";

describe("field-selector", () => {
	let testTable: typeof complexTable;
	let allTables: (typeof complexTable)[];

	beforeEach(() => {
		testTable = complexTable;
		allTables = [complexTable, simpleTable];
	});

	describe("convertToSelectionOptions", () => {
		describe("preset selections", () => {
			it('should convert "minimal" preset correctly', () => {
				const result = convertToSelectionOptions(
					testTable,
					allTables,
					"minimal",
				);

				expect(result).toBeDefined();
				expect(result!.id).toBe(true);
				expect(result!.name).toBe(true);
				expect(result!.email).toBe(true); // Minimal includes first 3 fields

				// Should not include all fields
				expect(result!.metadata).toBeUndefined();
				expect(result!.location).toBeUndefined();
			});

			it('should convert "display" preset correctly', () => {
				const result = convertToSelectionOptions(
					testTable,
					allTables,
					"display",
				);

				expect(result).toBeDefined();
				expect(result!.id).toBe(true);
				expect(result!.name).toBe(true);

				// Should include common display fields
				expect(result!.createdAt).toBe(true);

				// Should not include complex metadata
				expect(result!.searchVector).toBeUndefined();
			});

			it('should convert "all" preset correctly', () => {
				const result = convertToSelectionOptions(testTable, allTables, "all");

				expect(result).toBeDefined();

				// Should include all non-relational fields
				expect(result!.id).toBe(true);
				expect(result!.name).toBe(true);
				expect(result!.email).toBe(true);
				expect(result!.location).toBe(true);
				expect(result!.metadata).toBe(true);
				expect(result!.tags).toBe(true);

				// Should not include relation fields (these would be handled separately)
				expect(result!.owner).toBeUndefined();
				expect(result!.posts).toBeUndefined();
			});

			it('should convert "full" preset correctly', () => {
				const result = convertToSelectionOptions(testTable, allTables, "full");

				expect(result).toBeDefined();

				// Should include all fields including relations
				expect(result!.id).toBe(true);
				expect(result!.name).toBe(true);
				expect(result!.location).toBe(true);
				expect(result!.metadata).toBe(true);
			});

			it("should handle undefined selection with default", () => {
				const result = convertToSelectionOptions(
					testTable,
					allTables,
					undefined,
				);

				expect(result).toBeDefined();
				// Should default to 'display' preset
				expect(result!.id).toBe(true);
				expect(result!.name).toBe(true);
			});
		});

		describe("custom selections", () => {
			it("should convert simple custom selection", () => {
				const selection: SimpleFieldSelection = {
					select: ["id", "name", "email"],
				};

				const result = convertToSelectionOptions(
					testTable,
					allTables,
					selection,
				);

				expect(result).toBeDefined();
				expect(result!.id).toBe(true);
				expect(result!.name).toBe(true);
				expect(result!.email).toBe(true);

				// Should not include unspecified fields
				expect(result!.age).toBeUndefined();
				expect(result!.metadata).toBeUndefined();
			});

			it("should handle custom selection with exclusions", () => {
				const selection: SimpleFieldSelection = {
					select: ["id", "name", "email", "age"],
					exclude: ["email"],
				};

				const result = convertToSelectionOptions(
					testTable,
					allTables,
					selection,
				);

				expect(result).toBeDefined();
				expect(result!.id).toBe(true);
				expect(result!.name).toBe(true);
				expect(result!.age).toBe(true);

				// Should exclude specified field
				expect(result!.email).toBeUndefined();
			});

			it("should handle custom selection with relations", () => {
				const selection: SimpleFieldSelection = {
					select: ["id", "name"],
					include: {
						owner: ["id", "name"],
						posts: true,
					},
				};

				const result = convertToSelectionOptions(
					testTable,
					allTables,
					selection,
				);

				expect(result).toBeDefined();
				expect(result!.id).toBe(true);
				expect(result!.name).toBe(true);

				// Relations should be handled appropriately
				// (exact implementation depends on how relations are processed)
				expect(result).toHaveProperty("id");
				expect(result).toHaveProperty("name");
			});

			it("should handle complex nested selections", () => {
				const selection = fieldSelectionFixtures.customComplex;

				const result = convertToSelectionOptions(
					testTable,
					allTables,
					selection,
				);

				expect(result).toBeDefined();
				expect(result!.id).toBe(true);
				expect(result!.name).toBe(true);
				expect(result!.location).toBe(true);
				expect(result!.timeSpent).toBe(true);
				expect(result!.metadata).toBe(true);

				// Should exclude specified fields
				expect(result!.searchVector).toBeUndefined();
			});

			it("should handle empty selections gracefully", () => {
				const selection: SimpleFieldSelection = {
					select: [],
				};

				const result = convertToSelectionOptions(
					testTable,
					allTables,
					selection,
				);

				expect(result).toBeDefined();
				// Should handle empty selection appropriately
			});
		});

		describe("edge cases", () => {
			it("should handle table with no fields", () => {
				const emptyTable = createCleanTable("empty");
				emptyTable.fields = [];

				const result = convertToSelectionOptions(
					emptyTable,
					[emptyTable],
					"all",
				);

				expect(result).toBeDefined();
			});

			it("should handle invalid field names gracefully", () => {
				const selection: SimpleFieldSelection = {
					select: ["id", "nonExistentField", "name"],
				};

				const result = convertToSelectionOptions(
					testTable,
					allTables,
					selection,
				);

				expect(result).toBeDefined();
				expect(result!.id).toBe(true);
				expect(result!.name).toBe(true);
				// Invalid field should be ignored or handled gracefully
			});
		});
	});

	describe("validateFieldSelection", () => {
		describe("preset validation", () => {
			it("should validate preset selections as valid", () => {
				const presets: Array<"minimal" | "display" | "all" | "full"> = [
					"minimal",
					"display",
					"all",
					"full",
				];

				presets.forEach((preset) => {
					const result = validateFieldSelection(preset, testTable);
					expect(result.isValid).toBe(true);
					expect(result.errors).toHaveLength(0);
				});
			});
		});

		describe("custom selection validation", () => {
			it("should validate valid custom selections", () => {
				const selection: SimpleFieldSelection = {
					select: ["id", "name", "email"],
				};

				const result = validateFieldSelection(selection, testTable);

				expect(result.isValid).toBe(true);
				expect(result.errors).toHaveLength(0);
			});

			it("should detect invalid field names", () => {
				const selection: SimpleFieldSelection = {
					select: ["id", "nonExistentField", "anotherInvalidField"],
				};

				const result = validateFieldSelection(selection, testTable);

				expect(result.isValid).toBe(false);
				expect(result.errors).toContain(
					"Field 'nonExistentField' does not exist in table 'complex_table'",
				);
				expect(result.errors).toContain(
					"Field 'anotherInvalidField' does not exist in table 'complex_table'",
				);
			});

			it("should validate exclude fields", () => {
				const selection: SimpleFieldSelection = {
					select: ["id", "name"],
					exclude: ["invalidField"],
				};

				const result = validateFieldSelection(selection, testTable);

				expect(result.isValid).toBe(false);
				expect(result.errors).toContain(
					"Exclude field 'invalidField' does not exist in table 'complex_table'",
				);
			});

			it("should handle mixed valid and invalid fields", () => {
				const selection: SimpleFieldSelection = {
					select: ["id", "invalidField", "name"],
					exclude: ["email", "anotherInvalidField"],
				};

				const result = validateFieldSelection(selection, testTable);

				expect(result.isValid).toBe(false);
				expect(result.errors.length).toBeGreaterThanOrEqual(2);
				expect(result.errors).toContain(
					"Field 'invalidField' does not exist in table 'complex_table'",
				);
				expect(
					result.errors.some((error) => error.includes("anotherInvalidField")),
				).toBe(true);
			});

			it("should handle empty field arrays", () => {
				const selection: SimpleFieldSelection = {
					select: [],
					exclude: [],
				};

				const result = validateFieldSelection(selection, testTable);

				expect(result.isValid).toBe(true);
				expect(result.errors).toHaveLength(0);
			});
		});

		describe("edge cases", () => {
			it("should handle undefined select array", () => {
				const selection: SimpleFieldSelection = {
					exclude: ["email"],
				};

				const result = validateFieldSelection(selection, testTable);

				expect(result.isValid).toBe(true);
				expect(result.errors).toHaveLength(0);
			});

			it("should handle undefined exclude array", () => {
				const selection: SimpleFieldSelection = {
					select: ["id", "name"],
				};

				const result = validateFieldSelection(selection, testTable);

				expect(result.isValid).toBe(true);
				expect(result.errors).toHaveLength(0);
			});

			it("should handle table with no fields", () => {
				const emptyTable = createCleanTable("empty");
				emptyTable.fields = [];

				const selection: SimpleFieldSelection = {
					select: ["anyField"],
				};

				const result = validateFieldSelection(selection, emptyTable);

				expect(result.isValid).toBe(false);
				expect(result.errors).toContain(
					"Field 'anyField' does not exist in table 'empty'",
				);
			});
		});
	});

	describe("complex field handling", () => {
		it("should handle complex GraphQL types in selections", () => {
			const selection: SimpleFieldSelection = {
				select: ["id", "location", "timeSpent", "bounds"],
			};

			const result = convertToSelectionOptions(testTable, allTables, selection);

			expect(result).toBeDefined();
			expect(result!.location).toBe(true);
			expect(result!.timeSpent).toBe(true);
			expect(result!.bounds).toBe(true);
		});

		it("should handle array fields in selections", () => {
			const selection: SimpleFieldSelection = {
				select: ["id", "tags", "scores", "dates"],
			};

			const result = convertToSelectionOptions(testTable, allTables, selection);

			expect(result).toBeDefined();
			expect(result!.tags).toBe(true);
			expect(result!.scores).toBe(true);
			expect(result!.dates).toBe(true);
		});

		it("should handle JSON fields in selections", () => {
			const selection: SimpleFieldSelection = {
				select: ["id", "metadata", "settings"],
			};

			const result = convertToSelectionOptions(testTable, allTables, selection);

			expect(result).toBeDefined();
			expect(result!.metadata).toBe(true);
			expect(result!.settings).toBe(true);
		});
	});
});
