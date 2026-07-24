export function createMetadataHash(value: unknown): string {
	const serialized = JSON.stringify(value, stableReplacer);
	let hash = 0;
	for (let index = 0; index < serialized.length; index += 1) {
		hash = (hash * 33) ^ serialized.charCodeAt(index);
	}

	return `h${(hash >>> 0).toString(16)}`;
}

function stableReplacer(_key: string, value: unknown): unknown {
	if (value && typeof value === 'object' && !Array.isArray(value)) {
		return Object.keys(value)
			.sort()
			.reduce<Record<string, unknown>>((acc, key) => {
				acc[key] = (value as Record<string, unknown>)[key];
				return acc;
			}, {});
	}
	return value;
}
