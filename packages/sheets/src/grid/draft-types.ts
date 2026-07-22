// Survivor types relocated out of `grid/editor-registry.ts` (deleted in the glide
// cutover). `DraftSubmitResult` is the result of submitting a client-side draft row;
// it is consumed by the draft-submission hook, use-sheets, and the image editor's
// DOM re-host.

/** Result of submitting a draft row */
export interface DraftSubmitResult {
	/** The created row with real database ID */
	createdRow: { id: string | number; [key: string]: unknown } | null;
}
