/** Letters and digits only, lower-cased: `FIRST_NAME`, `firstName` and `first_name` all become `firstname`. */
export function canonicalName(value: string): string {
	return value.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
}
