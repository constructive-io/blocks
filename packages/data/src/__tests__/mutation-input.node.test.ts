/**
 * Tests for mutation input filtering utilities.
 * Consolidated: covers create/update/patch with dirty tracking, nested objects, arrays, and options.
 */
import { describe, expect, it } from "vitest";

import {
	type PartialBy,
	prepareCreateInput,
	prepareMutationInput,
	preparePatchInput,
	prepareUpdateInput,
	stripEmpty,
} from "../mutation-input";

describe("prepareMutationInput", () => {
	// =========================================================================
	// CREATE Operations
	// =========================================================================
	describe("CREATE operations", () => {
		const basicCases = [
			[{ a: 1, b: undefined }, {}, { a: 1 }, "omits undefined"],
			[{ a: 1, b: null }, {}, { a: 1 }, "omits null without dirty tracking"],
			[
				{ a: 1, b: null },
				{ dirtyFields: new Set(["a"]) },
				{ a: 1 },
				"omits null when not dirty",
			],
			[
				{ a: 1, b: null },
				{ dirtyFields: new Set(["a", "b"]) },
				{ a: 1, b: null },
				"keeps null when dirty",
			],
			[
				{ a: "hello", b: "" },
				{ dirtyFields: new Set(["a"]) },
				{ a: "hello" },
				"omits empty string when not dirty",
			],
			[
				{ a: "hello", b: "" },
				{ dirtyFields: new Set(["a", "b"]) },
				{ a: "hello", b: "" },
				"keeps empty string when dirty",
			],
			[
				{ zero: 0, falsy: false },
				{},
				{ zero: 0, falsy: false },
				"keeps falsy values (0, false)",
			],
		] as const;

		it.each(basicCases)("CREATE: %s", (input, opts, expected, _desc) => {
			expect(prepareCreateInput(input, opts as any)).toEqual(expected);
		});
	});

	// =========================================================================
	// UPDATE Operations
	// =========================================================================
	describe("UPDATE operations", () => {
		const updateCases = [
			[{ a: 1, b: undefined }, {}, { a: 1 }, "omits undefined"],
			[
				{ a: 1, b: null },
				{ dirtyFields: new Set(["a"]) },
				{ a: 1 },
				"omits null when not dirty",
			],
			[
				{ a: 1, b: null },
				{ dirtyFields: new Set(["a", "b"]) },
				{ a: 1, b: null },
				"keeps null when dirty (for clearing)",
			],
			[
				{ a: "hello", b: "" },
				{ dirtyFields: new Set(["a", "b"]) },
				{ a: "hello", b: "" },
				"keeps empty strings",
			],
			[
				{ a: 1, b: null, c: "" },
				{},
				{ a: 1, b: null, c: "" },
				"keeps non-undefined without dirty set",
			],
		] as const;

		it.each(updateCases)("UPDATE: %s", (input, opts, expected, _desc) => {
			expect(prepareUpdateInput(input, opts as any)).toEqual(expected);
		});
	});

	// =========================================================================
	// PATCH Operations
	// =========================================================================
	describe("PATCH operations", () => {
		it("only includes dirty fields", () => {
			expect(
				preparePatchInput({ a: 1, b: 2, c: 3 }, new Set(["a", "c"])),
			).toEqual({ a: 1, c: 3 });
		});

		it("handles empty dirty set", () => {
			expect(preparePatchInput({ a: 1, b: 2 }, new Set())).toEqual({});
		});

		it("keeps null for dirty fields", () => {
			expect(preparePatchInput({ a: 1, b: null }, new Set(["a", "b"]))).toEqual(
				{ a: 1, b: null },
			);
		});
	});

	// =========================================================================
	// Nested Object Handling
	// =========================================================================
	describe("nested object handling", () => {
		it("recursively filters nested objects", () => {
			const result = prepareCreateInput({
				name: "test",
				settings: { theme: "dark", unused: undefined },
			});
			expect(result).toEqual({ name: "test", settings: { theme: "dark" } });
		});

		it("omits nested objects that become empty", () => {
			const result = prepareCreateInput({
				name: "test",
				settings: { unused: undefined, empty: null },
			});
			expect(result).toEqual({ name: "test" });
		});

		it("respects dot notation dirty fields in nested objects", () => {
			const result = prepareCreateInput(
				{ name: "test", settings: { theme: "dark", language: "en" } },
				{ dirtyFields: new Set(["name", "settings.theme"]) },
			);
			expect(result).toEqual({ name: "test", settings: { theme: "dark" } });
		});

		it("handles deeply nested + mixed dirty fields", () => {
			const result = prepareUpdateInput(
				{
					name: "org",
					displayName: "Organization",
					settings: {
						theme: "dark",
						notifications: true,
						billing: { plan: "pro", seats: 10 },
					},
				},
				{
					dirtyFields: new Set([
						"name",
						"settings.notifications",
						"settings.billing.seats",
					]),
				},
			);
			expect(result).toEqual({
				name: "org",
				settings: { notifications: true, billing: { seats: 10 } },
			});
		});
	});

	// =========================================================================
	// Array Handling
	// =========================================================================
	describe("array handling", () => {
		const arrayCases = [
			[
				{ tags: [] },
				{ dirtyFields: new Set(["tags"]) },
				{ tags: [] },
				"keeps empty arrays when dirty",
			],
			[
				{ tags: ["a", "b"] },
				{ dirtyFields: new Set(["tags"]) },
				{ tags: ["a", "b"] },
				"keeps non-empty arrays when dirty",
			],
			[
				{ name: "test", tags: ["a"] },
				{ dirtyFields: new Set(["name"]) },
				{ name: "test" },
				"omits arrays when not dirty",
			],
			[
				{ tags: ["a", "b"] },
				{},
				{ tags: ["a", "b"] },
				"keeps arrays without dirty tracking",
			],
		] as const;

		it.each(arrayCases)("arrays: %s", (input, opts, expected, _desc) => {
			expect(prepareCreateInput(input, opts as any)).toEqual(expected);
		});

		it("does not recurse into arrays", () => {
			const result = prepareCreateInput({
				items: [{ id: 1, unused: undefined }],
			});
			expect(result).toEqual({ items: [{ id: 1, unused: undefined }] });
		});
	});

	// =========================================================================
	// Options: alwaysInclude, exclude, defaultValues
	// =========================================================================
	describe("options", () => {
		it("alwaysInclude: includes specified fields even if nullish", () => {
			expect(
				prepareCreateInput(
					{ required: null, optional: null },
					{ alwaysInclude: ["required"] },
				),
			).toEqual({ required: null });
		});

		it("alwaysInclude: includes fields even when not dirty", () => {
			const result = prepareCreateInput(
				{ required: "value", optional: "other" },
				{ dirtyFields: new Set(["optional"]), alwaysInclude: ["required"] },
			);
			expect(result).toEqual({ required: "value", optional: "other" });
		});

		it("alwaysInclude: supports dot notation", () => {
			expect(
				prepareCreateInput(
					{ settings: { required: null } },
					{ alwaysInclude: ["settings.required"] },
				),
			).toEqual({ settings: { required: null } });
		});

		it("exclude: removes specified fields", () => {
			expect(
				prepareCreateInput(
					{ a: 1, b: 2, computed: "x" },
					{ exclude: ["computed"] },
				),
			).toEqual({ a: 1, b: 2 });
		});

		it("exclude: supports dot notation", () => {
			expect(
				prepareCreateInput(
					{ settings: { keep: 1, secret: "x" } },
					{ exclude: ["settings.secret"] },
				),
			).toEqual({ settings: { keep: 1 } });
		});

		it("exclude takes precedence over alwaysInclude", () => {
			expect(
				prepareCreateInput(
					{ a: 1, b: 2 },
					{ alwaysInclude: ["a"], exclude: ["a"] },
				),
			).toEqual({ b: 2 });
		});

		it("defaultValues: skips unchanged defaults when not dirty", () => {
			const result = prepareCreateInput(
				{ name: "default", other: "changed" },
				{
					defaultValues: { name: "default", other: "original" },
					dirtyFields: new Set(["other"]),
				},
			);
			expect(result).toEqual({ other: "changed" });
		});
	});

	// =========================================================================
	// Edge Cases
	// =========================================================================
	describe("edge cases", () => {
		const edgeCases = [
			[{}, {}, {}, "empty input"],
			[{ a: undefined, b: null, c: "" }, {}, {}, "only nullish values"],
			[
				{ a: "null", b: "undefined" },
				{},
				{ a: "null", b: "undefined" },
				'string "null"/"undefined"',
			],
		] as const;

		it.each(edgeCases)("edge: %s", (input, opts, expected, _desc) => {
			expect(prepareCreateInput(input, opts as any)).toEqual(expected);
		});

		it("handles Date objects", () => {
			const date = new Date("2024-01-01");
			expect(prepareCreateInput({ createdAt: date })).toEqual({
				createdAt: date,
			});
		});

		it("does not mutate input", () => {
			const input = { a: 1, b: undefined, nested: { x: 1 } };
			const copy = JSON.parse(JSON.stringify(input));
			prepareCreateInput(input);
			expect(input.a).toBe(copy.a);
		});
	});

	// =========================================================================
	// Real-world Scenarios
	// =========================================================================
	describe("real-world scenarios", () => {
		it("organization create with optional fields", () => {
			const result = prepareCreateInput(
				{
					displayName: "My Org",
					username: "",
					settings: { legalName: undefined, addressLineOne: undefined },
				},
				{ dirtyFields: new Set(["displayName"]) },
			);
			expect(result).toEqual({ displayName: "My Org" });
		});

		it("update with explicit field clearing", () => {
			const result = prepareUpdateInput(
				{
					id: "org-123",
					name: "Updated Org",
					description: null,
					settings: { theme: "light", logo: null },
				},
				{
					dirtyFields: new Set(["name", "description", "settings.logo"]),
					alwaysInclude: ["id"],
				},
			);
			expect(result).toEqual({
				id: "org-123",
				name: "Updated Org",
				description: null,
				settings: { logo: null },
			});
		});
	});
});

describe("prepareMutationInput direct usage", () => {
	it("works with explicit operation parameter", () => {
		expect(
			prepareMutationInput({ a: 1, b: null }, { operation: "create" }),
		).toEqual({ a: 1 });
	});
});

// =========================================================================
// PartialBy Type Utility (compile-time checks)
// =========================================================================
describe("PartialBy type utility", () => {
	it("makes specified keys optional (compile-time check)", () => {
		type Input = { name: string; inheritsId: string; databaseId: string };
		type SafeInput = PartialBy<Input, "inheritsId">;

		// This compiles — inheritsId is now optional
		const valid: SafeInput = { name: "test", databaseId: "db-1" };
		expect(valid.name).toBe("test");
		expect(valid.databaseId).toBe("db-1");
		expect(valid).not.toHaveProperty("inheritsId");
	});

	it("makes multiple keys optional", () => {
		type Input = { name: string; inheritsId: string; databaseId: string };
		type SafeInput = PartialBy<Input, "inheritsId" | "databaseId">;

		const valid: SafeInput = { name: "test" };
		expect(valid.name).toBe("test");
	});
});

// =========================================================================
// stripEmpty
// =========================================================================
describe("stripEmpty", () => {
	it("strips null → undefined", () => {
		expect(stripEmpty(null)).toBeUndefined();
	});

	it("strips undefined → undefined", () => {
		expect(stripEmpty(undefined)).toBeUndefined();
	});

	it("strips empty string → undefined", () => {
		expect(stripEmpty("")).toBeUndefined();
	});

	it("preserves false (fixes useRls bug)", () => {
		expect(stripEmpty(false)).toBe(false);
	});

	it("preserves 0", () => {
		expect(stripEmpty(0)).toBe(0);
	});

	it("preserves non-empty strings", () => {
		expect(stripEmpty("hello")).toBe("hello");
	});

	it("preserves objects", () => {
		const obj = { key: "value" };
		expect(stripEmpty(obj)).toBe(obj);
	});

	it("preserves empty arrays", () => {
		const arr: string[] = [];
		expect(stripEmpty(arr)).toBe(arr);
	});
});
