// The one rule for opening the address in an email or web address cell, shared by the
// cell view (its link) and the grid's "Open link" command. A web address cell holds text
// that people typed, so only http, https and mailto addresses ever open: a typed
// `javascript:` or `data:` address must never run, and text that is not a full address
// (`example.com`) is not a link.

import type { SheetsCell } from './sheets-cell';

const OPENABLE_PROTOCOLS: ReadonlySet<string> = new Set(['http:', 'https:', 'mailto:']);

/** The address as the browser would open it, or null when it is not a full http, https or mailto address. */
function openableHref(text: string): string | null {
	let url: URL;
	try {
		url = new URL(text);
	} catch {
		return null;
	}
	return OPENABLE_PROTOCOLS.has(url.protocol) ? url.href : null;
}

/** The address a link cell (`kind: 'uri'`) opens, or null: an empty cell, another kind, or an address that may not open. */
export function uriCellHref(cell: SheetsCell): string | null {
	if (cell.kind !== 'uri' || typeof cell.data !== 'string' || cell.data === '') return null;
	return openableHref(cell.data);
}

/**
 * Open a link cell's address: a web address in a new tab (no opener, no referrer), an
 * email address in the mail app. An address that may not open is ignored.
 */
export function openUriCellLink(href: string): void {
	const safe = openableHref(href);
	if (!safe) return;
	// A mailto address hands off to the mail app without leaving the page; in a new tab it
	// would leave an empty tab behind.
	if (safe.startsWith('mailto:')) window.open(safe, '_self');
	else window.open(safe, '_blank', 'noopener,noreferrer');
}
