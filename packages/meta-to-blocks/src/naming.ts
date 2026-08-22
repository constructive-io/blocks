/**
 * Column and table names → human labels.
 *
 * Sentence case, not title case, and all-caps words are left alone so acronyms
 * survive (`api_url` → `Api URL`). Trailing `_id`/`Id` is dropped because a
 * foreign key renders as a picker over the referenced row, not as an id.
 */

export function titleize(name: string): string {
	if (!name) return '';

	const words = name
		.replace(/[_-]+/g, ' ')
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.trim()
		.split(/\s+/)
		.map((word) => (word === word.toUpperCase() ? word : word.toLowerCase()));

	const trimmed = words.length > 1 && words[words.length - 1].toLowerCase() === 'id' ? words.slice(0, -1) : words;

	return trimmed.join(' ').replace(/^./, (character) => character.toUpperCase());
}
