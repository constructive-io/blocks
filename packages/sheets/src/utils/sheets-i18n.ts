/**
 * Locale seam for @constructive-io/sheets.
 *
 * The host app may set a BCP-47 locale via SheetsConfig.locale. The provider
 * installs it into this module singleton (see sheets-provider.tsx), so any cell
 * renderer / editor can format dates and numbers locale-aware without threading
 * the locale through props/context. Defaults to 'en-US' (the prior hardcoded
 * behavior), so omitting `locale` changes nothing.
 */
const DEFAULT_LOCALE = 'en-US';

let active: string = DEFAULT_LOCALE;

/** Install (or reset) the active locale. Pass null/undefined to restore the default. */
export function setSheetsLocale(locale?: string | null): void {
	active = locale || DEFAULT_LOCALE;
}

/** Get the active locale (BCP-47). Safe to call anywhere; returns 'en-US' until set. */
export function sheetsLocale(): string {
	return active;
}
