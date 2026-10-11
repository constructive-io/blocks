/**
 * Tests for field-selector.ts
 * Tests field selection presets, custom selections, validation, and complex field handling
 */
import { beforeEach, describe, expect, it } from "vitest";

import {
	convertToSelectionOptions,
	type SimpleFieldSelection,
	validateFieldSelection,
} from "../index";
import { complexTable, simpleTable } from "./fixtures";

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
		});
	});
});
