/**
 * Injectable logger seam for @constructive-io/sheets.
 *
 * The host app may provide a custom logger via SheetsConfig.logger. The provider
 * installs it into this module singleton (see sheets-provider.tsx), so any module
 * or hook can log without threading the logger through props/context.
 *
 * Default behaviour matches the prior console.* calls. `debug` is omitted from the
 * default logger (no-op) so verbose diagnostics stay silent unless a host opts in.
 */
export interface SheetsLogger {
	debug?(msg: string, ctx?: unknown): void;
	warn(msg: string, ctx?: unknown): void;
	error(msg: string, ctx?: unknown): void;
}

const defaultLogger: SheetsLogger = {
	warn: (...a) => console.warn(...a),
	error: (...a) => console.error(...a),
	// debug omitted = no-op
};

let active: SheetsLogger = defaultLogger;

/**
 * Install (or reset) the active logger. Pass a host logger to override; pass
 * null/undefined to restore the default. Host overrides are merged over the
 * default so a partial logger still gets working warn/error.
 */
export function setSheetsLogger(l?: SheetsLogger | null): void {
	active = l ? { ...defaultLogger, ...l } : defaultLogger;
}

/** Get the active logger. Safe to call anywhere (returns the default until set). */
export function sheetsLogger(): SheetsLogger {
	return active;
}
