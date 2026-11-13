// Public '/testing' subpath — consumer test harness for @constructive-io/sheets.
// Not part of the core graph; bundled separately so production consumers never
// pull in the in-memory mock backend.
export * from './mock-sheets-provider';
export * from './meta-contract-fixture';
export { createModelBackend } from './model-backend';
export type { ModelBackend, ModelBackendOptions, ModelBackendUploadOptions, RecordedUpload } from './model-backend';
export { buildMetaSchemaSdl } from './meta-schema';
