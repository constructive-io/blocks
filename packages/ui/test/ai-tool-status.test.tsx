import { describe, expect, it } from 'vitest';

import { normalizeToolStatus } from '../src/components/ai/types';

describe('normalizeToolStatus', () => {
	it('maps AI SDK part states', () => {
		expect(normalizeToolStatus('input-streaming')).toBe('pending');
		expect(normalizeToolStatus('input-available')).toBe('running');
		expect(normalizeToolStatus('output-available')).toBe('success');
		expect(normalizeToolStatus('output-error')).toBe('error');
	});

	it('maps desktop enums', () => {
		expect(normalizeToolStatus('pending')).toBe('pending');
		expect(normalizeToolStatus('running')).toBe('running');
		expect(normalizeToolStatus('success')).toBe('success');
		expect(normalizeToolStatus('error')).toBe('error');
		expect(normalizeToolStatus('aborted')).toBe('aborted');
	});

	it('defaults unknown values to pending', () => {
		expect(normalizeToolStatus(undefined)).toBe('pending');
		expect(normalizeToolStatus('nope')).toBe('pending');
	});
});
