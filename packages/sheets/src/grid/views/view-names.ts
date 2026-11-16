/** The most characters a saved view's name may have. */
export const MAX_VIEW_NAME_LENGTH = 80;

/**
 * The name for a copy of a view: "<name> copy", then "<name> copy 2", "<name> copy 3"…
 * while `isTaken` says a name is in use. The name is cut short when the suffix would not
 * fit, so every candidate is a valid name and the search always ends.
 */
export function copyViewName(name: string, isTaken: (candidate: string) => boolean): string {
	for (let n = 1; ; n += 1) {
		const suffix = n === 1 ? ' copy' : ` copy ${n}`;
		const candidate = `${name.trim().slice(0, MAX_VIEW_NAME_LENGTH - suffix.length).trimEnd()}${suffix}`;
		if (!isTaken(candidate)) return candidate;
	}
}
