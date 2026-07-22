/**
 * Centralized concurrency limits for Sheets async workflows.
 * Keep these values conservative to avoid overloading API endpoints.
 */
export const SHEETS_CONCURRENCY = {
	draftSubmit: 3,
	bulkDelete: 4,
} as const;
