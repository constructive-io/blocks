/**
 * Spec for the PUBLIC customization seam (P4 Phase 2, Stage A).
 *
 * <Sheets> composes the consumer `commands` / `keymap` / `interceptors` / `onCommand`
 * props into the SAME primitives tested here — createGridCommandRegistry(commands),
 * a consumer-FIRST keymap scanned by resolveKeyCommand, and makeDispatch with the
 * consumer interceptors OUTERMOST + a tailObserver(onCommand) innermost. These specs
 * assert that composition so the seam wiring is verified WITHOUT mounting the full
 * GraphQL-backed grid (its data hooks are awkward under vitest — see sheets-dom.smoke).
 *
 * Omitting every prop reproduces the defaults: createGridCommandRegistry(undefined) is
 * DEFAULT_COMMANDS, [...[], ...DEFAULT_KEYMAP] is DEFAULT_KEYMAP, and an empty interceptor
 * chain is the Phase-1 behavior — so no-props = unchanged is structural, not re-asserted.
 */

import { describe, expect, it, vi } from 'vitest';

import { createGridCommandRegistry } from '../registry';
import { makeDispatch, tailObserver, type Interceptor } from '../dispatch';
import { resolveKeyCommand, DEFAULT_KEYMAP, type Binding } from '../keymap';
import { kbd } from '../keybinding';
import type { GridCommand } from '../types';
import { createMockCtx } from './mock-context';

// Mirror the component's composition: consumer props in, dispatch + keymap out.
function composeSeam(opts: {
	commands?: GridCommand[];
	keymap?: Binding[];
	interceptors?: Interceptor[];
	onCommand?: Parameters<typeof tailObserver>[0];
}) {
	const ctx = createMockCtx();
	const registry = createGridCommandRegistry(opts.commands);
	const fullKeymap = [...(opts.keymap ?? []), ...DEFAULT_KEYMAP];
	const chain = [...(opts.interceptors ?? []), ...(opts.onCommand ? [tailObserver(opts.onCommand)] : [])];
	const dispatch = makeDispatch(registry, () => ctx, chain);
	return { ctx, dispatch, fullKeymap };
}

function keyEvent(key: string, mods: { shift?: boolean } = {}): KeyboardEvent {
	return { key, shiftKey: !!mods.shift, ctrlKey: false, metaKey: false, altKey: false } as KeyboardEvent;
}

describe('command customization seam', () => {
	it('a consumer command override replaces a built-in body (dispatch runs the override)', () => {
		const overrideRun = vi.fn();
		const { dispatch, ctx } = composeSeam({ commands: [{ id: 'edit.undo', run: overrideRun }] });

		dispatch('edit.undo', undefined, {});

		expect(overrideRun).toHaveBeenCalledTimes(1);
		// The built-in undo body would have called ctx.undo — the override took its place.
		expect(ctx.undo).not.toHaveBeenCalled();
	});

	it('an added command id + keymap binding resolves and fires through dispatch', () => {
		const customRun = vi.fn();
		const binding: Binding = { trigger: { kind: 'key', binding: kbd('k', 'shift') }, command: 'consumer.custom' };
		const { dispatch, fullKeymap } = composeSeam({
			commands: [{ id: 'consumer.custom', run: customRun }],
			keymap: [binding],
		});

		const resolved = resolveKeyCommand(keyEvent('k', { shift: true }), fullKeymap);
		expect(resolved).toBe('consumer.custom');

		dispatch(resolved, undefined, {});
		expect(customRun).toHaveBeenCalledTimes(1);
	});

	it('a consumer keymap rebind WINS over the default chord (consumer-first scan)', () => {
		// Rebind the Enter chord (default → editor.openActive) to a consumer command.
		const binding: Binding = { trigger: { kind: 'key', binding: kbd('Enter') }, command: 'consumer.onEnter' };
		const { fullKeymap } = composeSeam({ keymap: [binding] });

		// resolveKeyCommand is first-match-wins; consumer bindings precede the defaults.
		expect(resolveKeyCommand(keyEvent('Enter'), fullKeymap)).toBe('consumer.onEnter');
	});

	it('a consumer interceptor VETOES a command (run skipped)', () => {
		const run = vi.fn();
		const veto: Interceptor = () => ({ command: 'edit.undo', ran: false, prevented: false });
		const { dispatch } = composeSeam({
			commands: [{ id: 'edit.undo', run }],
			interceptors: [veto],
		});

		const result = dispatch('edit.undo', undefined, {});

		expect(result.ran).toBe(false);
		expect(run).not.toHaveBeenCalled();
	});

	it('onCommand OBSERVES every dispatch (id + result), never altering behavior', () => {
		const run = vi.fn();
		const onCommand = vi.fn();
		const { dispatch } = composeSeam({ commands: [{ id: 'edit.undo', run }], onCommand });

		dispatch('edit.undo', undefined, { v: 1 });

		expect(run).toHaveBeenCalledTimes(1);
		expect(onCommand).toHaveBeenCalledTimes(1);
		const [ev, result] = onCommand.mock.calls[0];
		expect(ev.command).toBe('edit.undo');
		expect(result).toEqual({ command: 'edit.undo', ran: true, prevented: false });
	});

	it('onCommand observes AFTER consumer interceptors (innermost tail observer)', () => {
		const order: string[] = [];
		const outer: Interceptor = (_ev, next) => {
			order.push('consumer:before');
			const r = next();
			order.push('consumer:after');
			return r;
		};
		const onCommand = () => order.push('onCommand');
		const { dispatch } = composeSeam({
			commands: [
				{
					id: 'edit.undo',
					run: () => {
						order.push('core');
					},
				},
			],
			interceptors: [outer],
			onCommand,
		});

		dispatch('edit.undo', undefined, {});

		// Consumer interceptor is OUTERMOST; onCommand runs after core, inside the consumer's after.
		expect(order).toEqual(['consumer:before', 'core', 'onCommand', 'consumer:after']);
	});
});
