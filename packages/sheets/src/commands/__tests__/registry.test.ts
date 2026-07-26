/**
 * Spec for createGridCommandRegistry (registry.ts). Covers default population, consumer
 * override REPLACING a default by id, and a new id ADDING a command (the Phase 2 seam).
 */

import { describe, expect, it, vi } from 'vitest';

import { createGridCommandRegistry, DEFAULT_COMMANDS } from '../registry';

describe('createGridCommandRegistry', () => {
	it('populates every default command by id', () => {
		const registry = createGridCommandRegistry();
		for (const cmd of DEFAULT_COMMANDS) {
			expect(registry.get(cmd.id)).toBe(cmd);
		}
		expect(registry.size).toBe(DEFAULT_COMMANDS.length);
	});

	it('a consumer override with a matching id REPLACES the default', () => {
		const override = { id: 'edit.undo', run: vi.fn() };
		const registry = createGridCommandRegistry([override]);
		expect(registry.get('edit.undo')).toBe(override);
		// size unchanged — replacement, not addition.
		expect(registry.size).toBe(DEFAULT_COMMANDS.length);
	});

	it('a consumer override with a NEW id ADDS a command', () => {
		const added = { id: 'consumer.custom', run: vi.fn() };
		const registry = createGridCommandRegistry([added]);
		expect(registry.get('consumer.custom')).toBe(added);
		expect(registry.size).toBe(DEFAULT_COMMANDS.length + 1);
	});

	it('returns a fresh Map each call (no shared mutable state)', () => {
		const a = createGridCommandRegistry();
		const b = createGridCommandRegistry();
		expect(a).not.toBe(b);
		a.delete('edit.undo');
		expect(b.get('edit.undo')).toBeDefined();
	});
});
