/**
 * The ONE interceptable dispatch pipeline (P4 Phase 1).
 *
 * `dispatch(command, native?, payload?)`:
 *   1. resolve `command` in the registry — a missing / null id is a silent NO-OP
 *      (so an unbound key falls through to the browser: NO `preventDefault`).
 *   2. run the interceptor chain (reduceRight → first-listed is OUTERMOST). Each
 *      interceptor may VETO (not call `next` → command never runs, nothing prevented),
 *      TRANSFORM (mutate `ev.payload` before `next`), or OBSERVE (read `next()`'s result).
 *   3. AFTER the chain, check `command.canRun(ctx, payload)` — false NO-OPs (and does
 *      NOT preventDefault).
 *   4. `native?.preventDefault()` happens ONLY here in the core (so a vetoed / unresolved /
 *      can't-run command leaves the native event untouched and the key reaches the browser).
 *   5. `command.run(ctx, payload)` — synchronous return (it MAY kick a Promise; we never
 *      await — NO async-dispatch / re-entrancy machinery).
 *
 * Phase 1 ships ZERO interceptors (the consumer seam is Phase 2); the chain is wired so
 * adding one later is purely additive and behavior stays byte-for-byte identical.
 */

import type { GridCommandContext } from './context';
import type { GridCommandRegistry } from './types';

/** The mutable event threaded through the interceptor chain. */
export interface DispatchEvent {
	/** The resolved command id. */
	command: string;
	/** The originating native event, if any (the funnel's `preventDefault` target). */
	native?: Event;
	/** The command payload — interceptors MAY mutate this in place to TRANSFORM. */
	payload?: unknown;
}

/** Result of a dispatch attempt — observable by interceptors via `next()`. */
export interface CommandResult {
	/** The dispatched command id (or null when nothing resolved). */
	command: string | null;
	/** Whether `command.run` was invoked (false = unresolved / vetoed / canRun=false). */
	ran: boolean;
	/** Whether `native.preventDefault()` was called. */
	prevented: boolean;
}

/**
 * An interceptor wraps the rest of the chain (`next`). Call `next()` to continue
 * (returning its CommandResult); SKIP it to VETO; mutate `ev.payload` before `next()`
 * to TRANSFORM. The OUTERMOST (first-listed) interceptor sees the final result.
 */
export type Interceptor = (ev: DispatchEvent, next: () => CommandResult) => CommandResult;

/** The dispatch fn signature wired into the grid root. */
export type Dispatch = (command: string | null, native?: Event, payload?: unknown) => CommandResult;

const UNRESOLVED: CommandResult = { command: null, ran: false, prevented: false };

/**
 * Wrap an `onCommand(ev, result)` callback as an INNERMOST tail OBSERVER interceptor:
 * it always calls `next()` (never vetoes / transforms), then reports the final
 * {@link CommandResult} to the consumer. Listed LAST in the interceptor array so it
 * runs after all consumer interceptors (closest to the core) and observes the actual
 * outcome — purely observational, never altering behavior.
 */
export function tailObserver(onCommand: (ev: DispatchEvent, result: CommandResult) => void): Interceptor {
	return (ev, next) => {
		const result = next();
		onCommand(ev, result);
		return result;
	};
}

/**
 * Build the dispatch fn over a registry + live context + (optional) interceptor list.
 * `getContext` is read fresh per dispatch so the latched context is always current.
 */
export function makeDispatch(
	registry: GridCommandRegistry,
	getContext: () => GridCommandContext,
	interceptors: Interceptor[] = [],
): Dispatch {
	return function dispatch(command, native, payload): CommandResult {
		if (command == null) return UNRESOLVED;
		const cmd = registry.get(command);
		if (!cmd) return { command, ran: false, prevented: false };

		const ev: DispatchEvent = { command, native, payload };

		// The CORE runs last (innermost): canRun gate → preventDefault → run.
		const core = (): CommandResult => {
			const ctx = getContext();
			if (cmd.canRun && !cmd.canRun(ctx, ev.payload)) {
				return { command, ran: false, prevented: false };
			}
			let prevented = false;
			if (ev.native) {
				ev.native.preventDefault();
				prevented = true;
			}
			void cmd.run(ctx, ev.payload);
			return { command, ran: true, prevented };
		};

		// reduceRight so the FIRST-LISTED interceptor is the OUTERMOST wrapper.
		const chain = interceptors.reduceRight<() => CommandResult>(
			(next, interceptor) => () => interceptor(ev, next),
			core,
		);
		return chain();
	};
}
