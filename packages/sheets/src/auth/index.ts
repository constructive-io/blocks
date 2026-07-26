// =============================================================================
// @constructive-io/sheets/auth — Standalone auth surface
// =============================================================================
// Subpath entry for consumers running Sheets in standalone (non-embedded) mode.
// Re-exported from the root for back-compat; prefer importing from here.

export { SheetsAuthGate } from './auth-gate';
export type { SheetsAuthGateProps } from './auth-gate';
export { useSheetsLogin, useSheetsRegister, useSheetsForgotPassword, useSheetsResetPassword } from './hooks';
