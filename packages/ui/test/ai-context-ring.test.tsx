import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ContextRing } from '../src/components/ai/context-ring';

const label = (usage: Parameters<typeof ContextRing>[0]['usage']) => renderToStaticMarkup(<ContextRing usage={usage} />).match(/aria-label="([^"]*)"/)?.[1];

describe('ContextRing label', () => {
	it('reports the percent the host gave, including a context that is past its window', () => {
		expect(label({ tokens: 48_000, percent: 42, contextWindow: 128_000 })).toBe('42% used · 48K / 128K');
		expect(label({ tokens: 143_000, percent: 112, contextWindow: 128_000 })).toBe('112% used · 143K / 128K');
	});

	it('works the percent out from the tokens when the host did not give one', () => {
		expect(label({ tokens: 64_000, contextWindow: 128_000 })).toBe('50% used · 64K / 128K');
		expect(label({ tokens: 143_000, contextWindow: 128_000 })).toBe('112% used · 143K / 128K');
		expect(label({ tokens: 1_000, contextWindow: 0 })).toBe('0% used · 1K / 0');
	});

	it('says what it is waiting for', () => {
		expect(label(undefined)).toBe('No usage yet');
		expect(label({ tokens: null, contextWindow: 128_000 })).toBe('Recomputing after compaction…');
	});

	it('still draws no more than a full ring', () => {
		const filled = (usage: Parameters<typeof ContextRing>[0]['usage']) => (renderToStaticMarkup(<ContextRing usage={usage} />).match(/<line /g) ?? []).length;
		expect(filled({ tokens: 143_000, percent: 112, contextWindow: 128_000 })).toBe(filled({ tokens: 128_000, percent: 100, contextWindow: 128_000 }));
	});
});
