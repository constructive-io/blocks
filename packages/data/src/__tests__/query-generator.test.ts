/**
 * Query Generator Tests
 * Covers server-aware names and emitted relation aliases.
 */
import { describe, expect, it } from "vitest";

import {
	buildSelect,
	toCamelCasePlural,
	toCamelCaseSingular,
	toPatchFieldName,
} from "../index";
import { createCleanTable } from "./test-helpers";

describe("query-generator", () => {
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
});
