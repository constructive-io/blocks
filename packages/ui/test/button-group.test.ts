import { describe, expect, it } from 'vitest';

import { buttonGroupVariants } from '../src/components/button-group';

// The group squares only the shared edges. A blanket "every child loses its
// trailing radius" rule left the last button square on the outside, so pin the
// selectors: first child keeps its leading corners, last keeps its trailing ones.
describe('buttonGroupVariants', () => {
	it('squares only shared edges horizontally', () => {
		const classes = buttonGroupVariants({ orientation: 'horizontal' });
		expect(classes).toContain('[&>[data-slot]:not(:last-child)]:rounded-r-none');
		expect(classes).toContain('[&>[data-slot]:not(:first-child)]:rounded-l-none');
		expect(classes).toContain('[&>[data-slot]:not(:first-child)]:border-l-0');
		expect(classes).not.toMatch(/(^|\s)\*:data-\[slot\]:rounded-r-none/);
	});

	it('squares only shared edges vertically', () => {
		const classes = buttonGroupVariants({ orientation: 'vertical' });
		expect(classes).toContain('[&>[data-slot]:not(:last-child)]:rounded-b-none');
		expect(classes).toContain('[&>[data-slot]:not(:first-child)]:rounded-t-none');
		expect(classes).toContain('[&>[data-slot]:not(:first-child)]:border-t-0');
	});

	it('keeps the Button highlight overlay in step with the squared corners', () => {
		const classes = buttonGroupVariants({ orientation: 'horizontal' });
		expect(classes).toContain('[&>[data-slot]:not(:last-child)]:before:rounded-r-none');
		expect(classes).toContain('[&>[data-slot]:not(:first-child)]:before:rounded-l-none');
	});
});
