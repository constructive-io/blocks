/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { CellCreationMetadata } from '../../grid/grid-cell-types';
import { createSheetsCell } from '../create-sheets-cell';
import { openUriCellLink, uriCellHref } from '../uri-link';

function metadata(cellType: string): CellCreationMetadata {
	return { cellType, fieldName: 'link', canEdit: true, isReadonly: false, activationBehavior: 'double-click' };
}

describe('link cells: which addresses may open', () => {
	it('opens web and email addresses as the browser reads them', () => {
		expect(uriCellHref(createSheetsCell('https://example.com/a?b=c', metadata('url')))).toBe('https://example.com/a?b=c');
		expect(uriCellHref(createSheetsCell('http://example.com', metadata('url')))).toBe('http://example.com/');
		expect(uriCellHref(createSheetsCell('  https://example.com/x  ', metadata('url')))).toBe('https://example.com/x');
		expect(uriCellHref(createSheetsCell('ada@example.com', metadata('email')))).toBe('mailto:ada@example.com');
	});

	it('never opens typed script or data addresses, partial addresses or empty cells', () => {
		for (const typed of ['javascript:alert(1)', 'JavaScript:alert(1)', 'java\tscript:alert(1)', 'data:text/html,<script>1</script>', 'vbscript:x', 'file:///etc/passwd']) {
			expect(uriCellHref(createSheetsCell(typed, metadata('url')))).toBeNull();
		}
		expect(uriCellHref(createSheetsCell('example.com', metadata('url')))).toBeNull();
		expect(uriCellHref(createSheetsCell('/relative/path', metadata('url')))).toBeNull();
		expect(uriCellHref(createSheetsCell('', metadata('url')))).toBeNull();
		expect(uriCellHref(createSheetsCell('https://example.com', metadata('text')))).toBeNull();
	});
});

describe('openUriCellLink', () => {
	afterEach(() => vi.restoreAllMocks());

	it('opens a web address in a new tab without opener or referrer, and an email address in place for the mail app', () => {
		const open = vi.spyOn(window, 'open').mockReturnValue(null);
		openUriCellLink('https://example.com/a');
		openUriCellLink('mailto:ada@example.com');
		expect(open.mock.calls).toEqual([
			['https://example.com/a', '_blank', 'noopener,noreferrer'],
			['mailto:ada@example.com', '_self'],
		]);
	});

	it('ignores an address that may not open', () => {
		const open = vi.spyOn(window, 'open').mockReturnValue(null);
		openUriCellLink('javascript:alert(1)');
		openUriCellLink('example.com');
		expect(open).not.toHaveBeenCalled();
	});
});
