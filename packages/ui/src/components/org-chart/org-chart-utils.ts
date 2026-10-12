import { initials } from '../../lib/initials';

/** Up to 2 initials for a display name, or `null` when there are none so the avatar can show an icon instead. */
export function getInitials(name: string | null): string | null {
	return initials(name);
}

export function personName(person: { displayName: string | null }) {
	// A blank or whitespace-only name is as missing as a null one; an empty title would leave a card nobody can identify.
	return person.displayName?.trim() || 'Unnamed person';
}

export function reportsLabel(count: number) {
	return `${count} ${count === 1 ? 'report' : 'reports'}`;
}
