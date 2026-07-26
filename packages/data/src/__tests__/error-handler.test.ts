/**
 * Tests for error-handler.ts
 * Consolidated: removed redundant tests, kept essential coverage
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
	createDataError,
	DataError,
	DataErrorType,
	Errors,
	getConstraintMessage,
	handleDataError,
	PG_ERROR_CODES,
	parseGraphQLError,
	parseGraphQLErrorCode,
	withRetry,
} from "../error-handler";

describe("error-handler", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.clearAllTimers();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("DataError class", () => {
		it("creates error with all properties", () => {
			const error = new DataError(
				DataErrorType.VALIDATION_FAILED,
				"Test error",
				{
					tableName: "users",
					fieldName: "email",
					context: { field: "email" },
				},
			);

			expect(error).toBeInstanceOf(Error);
			expect(error).toBeInstanceOf(DataError);
			expect(error.type).toBe(DataErrorType.VALIDATION_FAILED);
			expect(error.message).toBe("Test error");
			expect(error.tableName).toBe("users");
			expect(error.fieldName).toBe("email");
			expect(error.context).toEqual({ field: "email" });
			expect(error.name).toBe("DataError");
		});

		it("creates error without optional properties", () => {
			const error = new DataError(DataErrorType.NETWORK_ERROR, "Network error");
			expect(error.type).toBe(DataErrorType.NETWORK_ERROR);
			expect(error.context).toBeUndefined();
		});

		it("provides serializable log details", () => {
			const error = new DataError(
				DataErrorType.QUERY_EXECUTION_FAILED,
				"GraphQL error",
				{
					tableName: "users",
					context: { query: "test" },
				},
			);
			const details = error.getLogDetails();
			expect(details.type).toBe(DataErrorType.QUERY_EXECUTION_FAILED);
			expect(details.tableName).toBe("users");
		});
	});

	describe("createDataError factories", () => {
		it("creates networkError", () => {
			const original = new Error("Connection failed");
			const error = createDataError.networkError(original);
			expect(error.type).toBe(DataErrorType.NETWORK_ERROR);
			expect(error.originalError).toBe(original);
		});

		it("creates validationFailed", () => {
			const error = createDataError.validationFailed("users", [
				"Required",
				"Invalid",
			]);
			expect(error.type).toBe(DataErrorType.VALIDATION_FAILED);
			expect(error.message).toBe("Validation failed: Required, Invalid");
			expect(error.tableName).toBe("users");
		});

		it("creates requiredFieldMissing", () => {
			const error = createDataError.requiredFieldMissing("email", "users");
			expect(error.type).toBe(DataErrorType.REQUIRED_FIELD_MISSING);
			expect(error.fieldName).toBe("email");
		});

		it("creates timeoutError", () => {
			const error = createDataError.timeoutError(new Error("timeout"));
			expect(error.type).toBe(DataErrorType.TIMEOUT_ERROR);
		});

		it("creates forbidden", () => {
			const error = createDataError.forbidden("users");
			expect(error.type).toBe(DataErrorType.FORBIDDEN);
		});

		it("creates unknown", () => {
			const original = new Error("Unknown");
			const error = createDataError.unknown(original, "users");
			expect(error.type).toBe(DataErrorType.UNKNOWN_ERROR);
			expect(error.originalError).toBe(original);
		});
	});

	describe("parseGraphQLError", () => {
		const errorClassificationCases = [
			["network", "Network request failed", DataErrorType.NETWORK_ERROR],
			["timeout", "Request timeout occurred", DataErrorType.TIMEOUT_ERROR],
			["forbidden", "Access forbidden", DataErrorType.FORBIDDEN],
			[
				"validation",
				"Validation constraint failed",
				DataErrorType.VALIDATION_FAILED,
			],
			["unknown", "Some random error", DataErrorType.UNKNOWN_ERROR],
		] as const;

		it.each(
			errorClassificationCases,
		)("classifies %s error correctly", (_, message, expectedType) => {
			const error = parseGraphQLError(new Error(message), "users");
			expect(error.type).toBe(expectedType);
		});

		it("handles non-Error objects", () => {
			const error = parseGraphQLError("String error", "users");
			expect(error).toBeInstanceOf(DataError);
			expect(error.type).toBe(DataErrorType.UNKNOWN_ERROR);
		});
	});

	describe("handleDataError", () => {
		it("passes through DataError instances", () => {
			const original = new DataError(DataErrorType.VALIDATION_FAILED, "Test");
			expect(handleDataError(original, "users")).toBe(original);
		});

		it("converts regular errors", () => {
			const result = handleDataError(new Error("Network failed"), "users");
			expect(result).toBeInstanceOf(DataError);
			expect(result.type).toBe(DataErrorType.NETWORK_ERROR);
		});
	});

	describe("withRetry", () => {
		it("succeeds on first attempt", async () => {
			const fn = vi.fn().mockResolvedValue("success");
			const result = await withRetry(fn);
			expect(result).toBe("success");
			expect(fn).toHaveBeenCalledTimes(1);
		});

		it("does not retry non-retryable errors", async () => {
			const fn = vi.fn().mockRejectedValue(new Error("Validation failed"));
			await expect(withRetry(fn, 3, 0)).rejects.toBeInstanceOf(DataError);
			expect(fn).toHaveBeenCalledTimes(1);
		});
	});

	describe("PostgreSQL error handling", () => {
		it("has correct SQLSTATE codes", () => {
			expect(PG_ERROR_CODES.UNIQUE_VIOLATION).toBe("23505");
			expect(PG_ERROR_CODES.FOREIGN_KEY_VIOLATION).toBe("23503");
			expect(PG_ERROR_CODES.NOT_NULL_VIOLATION).toBe("23502");
			expect(PG_ERROR_CODES.CHECK_VIOLATION).toBe("23514");
			expect(PG_ERROR_CODES.EXCLUSION_VIOLATION).toBe("23P01");
		});

		describe("parseGraphQLErrorCode", () => {
			const pgCodeMappings = [
				["23505", DataErrorType.UNIQUE_VIOLATION],
				["23503", DataErrorType.FOREIGN_KEY_VIOLATION],
				["23502", DataErrorType.NOT_NULL_VIOLATION],
				["23514", DataErrorType.CHECK_VIOLATION],
				["23P01", DataErrorType.EXCLUSION_VIOLATION],
				["42501", DataErrorType.FORBIDDEN],
				["42P01", DataErrorType.TABLE_NOT_FOUND],
			] as const;

			it.each(pgCodeMappings)("maps PG code %s to %s", (code, expectedType) => {
				expect(parseGraphQLErrorCode(code)).toBe(expectedType);
			});
		});

		describe("PostgreSQL error factories", () => {
			it("creates uniqueViolation", () => {
				const error = createDataError.uniqueViolation(
					"duplicate key",
					"users",
					"email",
					"users_email_key",
				);
				expect(error.type).toBe(DataErrorType.UNIQUE_VIOLATION);
				expect(error.fieldName).toBe("email");
				expect(error.constraint).toBe("users_email_key");
				expect(error.code).toBe("23505");
			});

			it("creates foreignKeyViolation", () => {
				const error = createDataError.foreignKeyViolation(
					"fk violation",
					"posts",
					"author_id",
					"fk_constraint",
				);
				expect(error.type).toBe(DataErrorType.FOREIGN_KEY_VIOLATION);
			});

			it("creates notNullViolation", () => {
				const error = createDataError.notNullViolation(
					"not null",
					"users",
					"name",
				);
				expect(error.type).toBe(DataErrorType.NOT_NULL_VIOLATION);
				expect(error.fieldName).toBe("name");
			});

			it("creates checkViolation", () => {
				const error = createDataError.checkViolation(
					"check",
					"products",
					"price",
					"price_check",
				);
				expect(error.type).toBe(DataErrorType.CHECK_VIOLATION);
			});
		});

		describe("parseGraphQLError with PostgreSQL extensions", () => {
			it("parses unique violation from extensions", () => {
				const error = parseGraphQLError({
					message: "duplicate key",
					extensions: {
						code: "23505",
						constraint: "users_email_key",
						column: "email",
						table: "users",
					},
				});
				expect(error.type).toBe(DataErrorType.UNIQUE_VIOLATION);
				expect(error.fieldName).toBe("email");
				expect(error.constraint).toBe("users_email_key");
			});

			it("parses foreign key violation from extensions", () => {
				const error = parseGraphQLError({
					message: "foreign key violation",
					extensions: {
						code: "23503",
						constraint: "posts_author_fkey",
						table: "posts",
					},
				});
				expect(error.type).toBe(DataErrorType.FOREIGN_KEY_VIOLATION);
			});

			it("extracts field from constraint name when column not provided", () => {
				const error = parseGraphQLError({
					message: "duplicate key",
					extensions: { code: "23505", constraint: "users_email_key" },
				});
				expect(error.fieldName).toBe("email");
			});

			it("extracts field from Key (field) pattern", () => {
				const error = parseGraphQLError({
					message: "duplicate key. Key (username)=(john) already exists.",
					extensions: { code: "23505" },
				});
				expect(error.fieldName).toBe("username");
			});

			it("falls back to message classification for constraint errors", () => {
				expect(parseGraphQLError(new Error("duplicate key value")).type).toBe(
					DataErrorType.UNIQUE_VIOLATION,
				);
				expect(parseGraphQLError(new Error("violates foreign key")).type).toBe(
					DataErrorType.FOREIGN_KEY_VIOLATION,
				);
				expect(parseGraphQLError(new Error("not-null constraint")).type).toBe(
					DataErrorType.NOT_NULL_VIOLATION,
				);
			});
		});

		describe("getUserMessage", () => {
			it("returns user-friendly messages for constraint violations", () => {
				expect(
					createDataError
						.uniqueViolation("", "users", "email")
						.getUserMessage(),
				).toBe("A record with this email already exists.");
				expect(
					createDataError.uniqueViolation("", "users").getUserMessage(),
				).toBe("A record with this value already exists.");
				expect(
					createDataError.foreignKeyViolation("", "posts").getUserMessage(),
				).toContain("does not exist");
				expect(
					createDataError
						.notNullViolation("", "users", "name")
						.getUserMessage(),
				).toBe('The field "name" cannot be empty.');
				expect(
					createDataError.notNullViolation("", "users").getUserMessage(),
				).toBe("A required field cannot be empty.");
				expect(
					createDataError
						.checkViolation("", "products", "price")
						.getUserMessage(),
				).toBe('The value for "price" is not valid.');
				expect(
					createDataError.exclusionViolation("", "bookings").getUserMessage(),
				).toContain("conflicts");
			});

			it("returns mapped messages for database provisioning name constraints", () => {
				expect(getConstraintMessage("database_provision_module_name_length_min")).toBe(
					"Database name must be at least 3 characters.",
				);
				expect(getConstraintMessage("database_provision_module_name_length_max")).toBe(
					"Database name must be 63 characters or less.",
				);
				expect(getConstraintMessage("database_provision_module_name_format")).toBe(
					"Database name must start with a letter and use only letters, numbers, underscores, or hyphens.",
				);
			});
		});
	});

	describe("Errors", () => {
		describe("parse", () => {
			it("delegates to parseGraphQLErrorCode", () => {
				expect(Errors.parse("UNAUTHENTICATED")).toBe(DataErrorType.UNAUTHORIZED);
				expect(Errors.parse("FORBIDDEN")).toBe(DataErrorType.FORBIDDEN);
				expect(Errors.parse(undefined)).toBe(DataErrorType.UNKNOWN_ERROR);
			});
		});

		describe("is", () => {
			it("returns true for matching code", () => {
				expect(Errors.is("UNAUTHENTICATED", DataErrorType.UNAUTHORIZED)).toBe(true);
				expect(Errors.is("BAD_TOKEN_DEFINITION", DataErrorType.UNAUTHORIZED)).toBe(true);
				expect(Errors.is("FORBIDDEN", DataErrorType.FORBIDDEN)).toBe(true);
			});

			it("returns false for non-matching code", () => {
				expect(Errors.is("FORBIDDEN", DataErrorType.UNAUTHORIZED)).toBe(false);
				expect(Errors.is("UNAUTHENTICATED", DataErrorType.FORBIDDEN)).toBe(false);
			});

			it("handles non-string values", () => {
				expect(Errors.is(undefined, DataErrorType.UNAUTHORIZED)).toBe(false);
				expect(Errors.is(null, DataErrorType.UNAUTHORIZED)).toBe(false);
				expect(Errors.is(42, DataErrorType.UNAUTHORIZED)).toBe(false);
				expect(Errors.is({}, DataErrorType.UNAUTHORIZED)).toBe(false);
			});
		});

		describe("match", () => {
			it("matches DataError instances by type", () => {
				const authErr = new DataError(DataErrorType.UNAUTHORIZED, "auth required");
				const forbiddenErr = new DataError(DataErrorType.FORBIDDEN, "no access");

				expect(Errors.match(authErr, DataErrorType.UNAUTHORIZED)).toBe(true);
				expect(Errors.match(authErr, DataErrorType.FORBIDDEN)).toBe(false);
				expect(Errors.match(forbiddenErr, DataErrorType.FORBIDDEN)).toBe(true);
			});

			it("parses plain Error objects via message classification", () => {
				expect(Errors.match(new Error("unauthenticated"), DataErrorType.UNAUTHORIZED)).toBe(true);
				expect(Errors.match(new Error("network error"), DataErrorType.NETWORK_ERROR)).toBe(true);
				expect(Errors.match(new Error("something random"), DataErrorType.UNAUTHORIZED)).toBe(false);
			});

			it("parses GraphQL error objects", () => {
				const gqlError = { message: "Not allowed", extensions: { code: "FORBIDDEN" } };
				expect(Errors.match(gqlError, DataErrorType.FORBIDDEN)).toBe(true);
				expect(Errors.match(gqlError, DataErrorType.UNAUTHORIZED)).toBe(false);
			});
		});

		describe("from", () => {
			it("returns a DataError", () => {
				const result = Errors.from(new Error("network error"));
				expect(result).toBeInstanceOf(DataError);
				expect(result.type).toBe(DataErrorType.NETWORK_ERROR);
			});

			it("passes through existing DataError", () => {
				const existing = new DataError(DataErrorType.FORBIDDEN, "no");
				expect(Errors.from(existing)).toBe(existing);
			});

			it("accepts tableName", () => {
				const result = Errors.from(new Error("unknown"), "users");
				expect(result.tableName).toBe("users");
			});
		});
	});
});
