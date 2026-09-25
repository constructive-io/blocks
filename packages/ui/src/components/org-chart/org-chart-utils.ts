/** Get up to 2-char uppercase initials from a display name */
export function getInitials(name: string | null): string {
	if (!name) return '--';
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return '--';
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function personName(person: { displayName: string | null }) {
	return person.displayName ?? 'Unnamed person';
}

export function reportsLabel(count: number) {
	return `${count} ${count === 1 ? 'report' : 'reports'}`;
}
