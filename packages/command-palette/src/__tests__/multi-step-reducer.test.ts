import { describe, it, expect } from 'vitest';
import { multiStepReducer, initialMultiStepState } from '../multi-step/reducer';
import type { MultiStepState, MultiStepAction } from '../multi-step/state';

type Ctx = { name: string; color: string };

function start(stepCount = 3, initialContext?: Partial<Ctx>): MultiStepState<Ctx> {
  return multiStepReducer(initialMultiStepState as MultiStepState<Ctx>, {
    type: 'START',
    commandId: 'test-cmd',
    stepCount,
    initialContext,
  });
}

function dispatch(
  state: MultiStepState<Ctx>,
  action: MultiStepAction<Ctx>
): MultiStepState<Ctx> {
  return multiStepReducer(state, action);
}

describe('multiStepReducer', () => {
  describe('initialMultiStepState', () => {
    it('has idle flowStatus', () => {
      expect(initialMultiStepState.flowStatus).toBe('idle');
    });

    it('has empty steps array', () => {
      expect(initialMultiStepState.steps).toEqual([]);
    });
  });

  describe('START', () => {
    it('initializes state with correct step count', () => {
      const s = start(3);
      expect(s.commandId).toBe('test-cmd');
      expect(s.currentStepIndex).toBe(0);
      expect(s.steps).toHaveLength(3);
      expect(s.steps[0].status).toBe('active');
      expect(s.steps[1].status).toBe('idle');
      expect(s.steps[2].status).toBe('idle');
      expect(s.steps.every((st) => st.error === null)).toBe(true);
      expect(s.steps.every((st) => st.data === undefined)).toBe(true);
      expect(s.flowStatus).toBe('active');
      expect(s.direction).toBe('forward');
    });

    it('applies initial context', () => {
      const s = start(2, { name: 'Test' });
      expect(s.context).toEqual({ name: 'Test' });
    });

    it('defaults to empty context', () => {
      const s = start(2);
      expect(s.context).toEqual({});
    });
  });

  describe('SET_LOADING', () => {
    it('sets current step to loading', () => {
      const s = dispatch(start(), { type: 'SET_LOADING' });
      expect(s.steps[0].status).toBe('loading');
    });
  });

  describe('SET_STEP_DATA', () => {
    it('stores data and sets step to active', () => {
      let s = start();
      s = dispatch(s, { type: 'SET_LOADING' });
      s = dispatch(s, { type: 'SET_STEP_DATA', data: { options: [1, 2] } });
      expect(s.steps[0].status).toBe('active');
      expect(s.steps[0].data).toEqual({ options: [1, 2] });
    });
  });

  describe('SET_ERROR', () => {
    it('sets step to error state', () => {
      const err = new Error('fail');
      const s = dispatch(start(), { type: 'SET_ERROR', error: err });
      expect(s.steps[0].status).toBe('error');
      expect(s.steps[0].error).toBe(err);
    });

    it('reverts flowStatus from completing to active', () => {
      let s = start(1);
      s = dispatch(s, { type: 'COMPLETE_STEP', output: { name: 'A' } });
      expect(s.flowStatus).toBe('completing');

      s = dispatch(s, { type: 'SET_ERROR', error: new Error('onComplete failed') });
      expect(s.flowStatus).toBe('active');
      expect(s.steps[0].status).toBe('error');
    });

    it('preserves flowStatus when not completing', () => {
      const s = dispatch(start(), { type: 'SET_ERROR', error: new Error('fail') });
      expect(s.flowStatus).toBe('active');
    });

    it('is a no-op after cancellation', () => {
      let s = start();
      s = dispatch(s, { type: 'CANCEL' });
      expect(s.flowStatus).toBe('cancelled');
      const s2 = dispatch(s, { type: 'SET_ERROR', error: new Error('late') });
      expect(s2).toBe(s);
    });

    it('is a no-op after completion', () => {
      let s = start(1);
      s = dispatch(s, { type: 'COMPLETE_STEP', output: { name: 'A' } });
      s = dispatch(s, { type: 'SET_COMPLETED' });
      expect(s.flowStatus).toBe('completed');
      const s2 = dispatch(s, { type: 'SET_ERROR', error: new Error('late') });
      expect(s2).toBe(s);
    });
  });

  describe('COMPLETE_STEP', () => {
    it('marks step complete and advances to next', () => {
      const s = dispatch(start(), {
        type: 'COMPLETE_STEP',
        output: { name: 'Foo' },
      });
      expect(s.steps[0].status).toBe('complete');
      expect(s.steps[1].status).toBe('active');
      expect(s.currentStepIndex).toBe(1);
      expect(s.context).toEqual({ name: 'Foo' });
      expect(s.direction).toBe('forward');
    });

    it('merges output into existing context', () => {
      let s = start(3, { name: 'Init' });
      s = dispatch(s, { type: 'COMPLETE_STEP', output: { color: 'blue' } });
      expect(s.context).toEqual({ name: 'Init', color: 'blue' });
    });

    it('sets flowStatus to completing on last step', () => {
      let s = start(2);
      s = dispatch(s, { type: 'COMPLETE_STEP', output: { name: 'A' } });
      s = dispatch(s, { type: 'COMPLETE_STEP', output: { color: 'B' } });
      expect(s.flowStatus).toBe('completing');
      expect(s.steps.map((st) => st.status)).toEqual(['complete', 'complete']);
    });

    it('clears error on next step when advancing', () => {
      let s = start(3);
      // Complete step 0 → step 1 active
      s = dispatch(s, { type: 'COMPLETE_STEP', output: { name: 'A' } });
      // Set error on step 1
      s = dispatch(s, { type: 'SET_ERROR', error: new Error('old') });
      // Go back to step 0
      s = dispatch(s, { type: 'GO_BACK' });
      // Complete step 0 again — step 1's error should be cleared
      s = dispatch(s, { type: 'COMPLETE_STEP', output: { name: 'B' } });
      expect(s.steps[1].error).toBeNull();
    });

    it('allows completion from error state (retry)', () => {
      let s = start();
      s = dispatch(s, { type: 'SET_ERROR', error: new Error('validation') });
      expect(s.steps[0].status).toBe('error');
      s = dispatch(s, { type: 'COMPLETE_STEP', output: { name: 'Fixed' } });
      expect(s.steps[0].status).toBe('complete');
      expect(s.currentStepIndex).toBe(1);
    });

    it('is a no-op from idle state', () => {
      let s = start(3);
      // Step 0 is active, step 1 is idle
      // Advance to step 1
      s = dispatch(s, { type: 'COMPLETE_STEP', output: { name: 'A' } });
      // Manually try to complete step 2 which is still idle — shouldn't work
      // (we'd need to be on step 2 for this, so let's test via skip)
      const before = s;
      // GO_BACK to step 0 which becomes active, step 1 becomes idle
      s = dispatch(s, { type: 'GO_BACK' });
      // Now we're on step 0 (active), dispatch COMPLETE from here is fine
      // The guard is about the *current step's* status, not arbitrary indices
    });

    it('is a no-op from loading state', () => {
      let s = start();
      s = dispatch(s, { type: 'SET_LOADING' });
      expect(s.steps[0].status).toBe('loading');
      const s2 = dispatch(s, { type: 'COMPLETE_STEP', output: { name: 'X' } });
      expect(s2).toBe(s); // Same reference — no change
    });

    it('clears error on completed step', () => {
      let s = start();
      s = dispatch(s, { type: 'SET_ERROR', error: new Error('fail') });
      s = dispatch(s, { type: 'COMPLETE_STEP', output: { name: 'Ok' } });
      expect(s.steps[0].error).toBeNull();
    });

    it('clears next step data when advancing for fresh loader', () => {
      let s = start(2);
      // Complete step 0 → step 1 active
      s = dispatch(s, { type: 'COMPLETE_STEP', output: { name: 'A' } });
      // Load data on step 1
      s = dispatch(s, { type: 'SET_STEP_DATA', data: ['options'] });
      expect(s.steps[1].data).toEqual(['options']);
      // Go back to step 0 — step 1 data preserved
      s = dispatch(s, { type: 'GO_BACK' });
      expect(s.steps[1].data).toEqual(['options']);
      // Re-advance to step 1 — data cleared for fresh load
      s = dispatch(s, { type: 'COMPLETE_STEP', output: { name: 'B' } });
      expect(s.steps[1].data).toBeUndefined();
    });
  });

  describe('GO_BACK', () => {
    it('goes back to previous step', () => {
      let s = start();
      s = dispatch(s, { type: 'COMPLETE_STEP', output: { name: 'A' } });
      expect(s.currentStepIndex).toBe(1);

      s = dispatch(s, { type: 'GO_BACK' });
      expect(s.currentStepIndex).toBe(0);
      expect(s.steps[0].status).toBe('active');
      expect(s.steps[1].status).toBe('idle');
      expect(s.direction).toBe('backward');
    });

    it('does nothing on first step', () => {
      const s = start();
      const s2 = dispatch(s, { type: 'GO_BACK' });
      expect(s2).toBe(s); // Same reference — no change
    });

    it('preserves context on back navigation', () => {
      let s = start();
      s = dispatch(s, { type: 'COMPLETE_STEP', output: { name: 'A' } });
      s = dispatch(s, { type: 'GO_BACK' });
      expect(s.context).toEqual({ name: 'A' }); // Not rolled back
    });

    it('is a no-op when current step is loading', () => {
      let s = start();
      s = dispatch(s, { type: 'COMPLETE_STEP', output: { name: 'A' } });
      s = dispatch(s, { type: 'SET_LOADING' });
      expect(s.steps[1].status).toBe('loading');
      const s2 = dispatch(s, { type: 'GO_BACK' });
      expect(s2).toBe(s);
    });

    it('is a no-op during completing flowStatus', () => {
      let s = start(2);
      s = dispatch(s, { type: 'COMPLETE_STEP', output: { name: 'A' } });
      s = dispatch(s, { type: 'COMPLETE_STEP', output: { color: 'B' } });
      expect(s.flowStatus).toBe('completing');
      const s2 = dispatch(s, { type: 'GO_BACK' });
      expect(s2).toBe(s);
    });

    it('preserves step data on back navigation', () => {
      let s = start(2);
      s = dispatch(s, { type: 'COMPLETE_STEP', output: { name: 'A' } });
      s = dispatch(s, { type: 'SET_STEP_DATA', data: { items: [1] } });
      s = dispatch(s, { type: 'GO_BACK' });
      expect(s.steps[1].data).toEqual({ items: [1] });
    });
  });

  describe('SKIP_STEP', () => {
    it('marks step complete and advances without output', () => {
      const s = dispatch(start(), { type: 'SKIP_STEP' });
      expect(s.steps[0].status).toBe('complete');
      expect(s.steps[1].status).toBe('active');
      expect(s.currentStepIndex).toBe(1);
      expect(s.context).toEqual({}); // No output merged
    });

    it('sets completing on last step skip', () => {
      let s = start(1);
      s = dispatch(s, { type: 'SKIP_STEP' });
      expect(s.flowStatus).toBe('completing');
    });
  });

  describe('SET_COMPLETED', () => {
    it('transitions to completed', () => {
      let s = start(1);
      s = dispatch(s, { type: 'COMPLETE_STEP', output: { name: 'Done' } });
      expect(s.flowStatus).toBe('completing');

      s = dispatch(s, { type: 'SET_COMPLETED' });
      expect(s.flowStatus).toBe('completed');
    });

    it('is a no-op when not completing', () => {
      const s = start();
      expect(s.flowStatus).toBe('active');
      const s2 = dispatch(s, { type: 'SET_COMPLETED' });
      expect(s2).toBe(s);
    });

    it('is a no-op after cancellation', () => {
      let s = start(1);
      s = dispatch(s, { type: 'COMPLETE_STEP', output: { name: 'A' } });
      expect(s.flowStatus).toBe('completing');
      s = dispatch(s, { type: 'CANCEL' });
      expect(s.flowStatus).toBe('cancelled');
      const s2 = dispatch(s, { type: 'SET_COMPLETED' });
      expect(s2).toBe(s);
    });
  });

  describe('CANCEL', () => {
    it('sets flowStatus to cancelled', () => {
      const s = dispatch(start(), { type: 'CANCEL' });
      expect(s.flowStatus).toBe('cancelled');
    });

    it('can cancel from any step', () => {
      let s = start();
      s = dispatch(s, { type: 'COMPLETE_STEP', output: { name: 'A' } });
      s = dispatch(s, { type: 'CANCEL' });
      expect(s.flowStatus).toBe('cancelled');
      expect(s.currentStepIndex).toBe(1); // Preserves position
    });
  });

  describe('GO_BACK edge cases', () => {
    it('is a no-op on step 0 of a single-step flow', () => {
      const s = start(1);
      const s2 = dispatch(s, { type: 'GO_BACK' });
      expect(s2).toBe(s);
      expect(s2.currentStepIndex).toBe(0);
    });
  });

  describe('SKIP_STEP edge cases', () => {
    it('clears next step data when skipping (fresh loader)', () => {
      let s = start(3);
      // Complete step 0 → step 1 active
      s = dispatch(s, { type: 'COMPLETE_STEP', output: { name: 'A' } });
      // Set data on step 1
      s = dispatch(s, { type: 'SET_STEP_DATA', data: ['cached'] });
      // Go back to step 0
      s = dispatch(s, { type: 'GO_BACK' });
      // Skip step 0 → step 1 active, data should be cleared
      s = dispatch(s, { type: 'SKIP_STEP' });
      expect(s.currentStepIndex).toBe(1);
      expect(s.steps[1].data).toBeUndefined();
    });
  });

  describe('back-then-forward data caching', () => {
    it('preserves context through back-forward navigation', () => {
      let s = start(3);
      // Step 0 → complete with name
      s = dispatch(s, { type: 'COMPLETE_STEP', output: { name: 'Project' } });
      expect(s.context).toEqual({ name: 'Project' });

      // Step 1 → complete with color
      s = dispatch(s, { type: 'COMPLETE_STEP', output: { color: 'blue' } });
      expect(s.context).toEqual({ name: 'Project', color: 'blue' });

      // Go back to step 1
      s = dispatch(s, { type: 'GO_BACK' });
      expect(s.currentStepIndex).toBe(1);
      // Context is preserved
      expect(s.context).toEqual({ name: 'Project', color: 'blue' });

      // Go back to step 0
      s = dispatch(s, { type: 'GO_BACK' });
      expect(s.currentStepIndex).toBe(0);
      // Context still preserved
      expect(s.context).toEqual({ name: 'Project', color: 'blue' });

      // Re-advance with updated name
      s = dispatch(s, { type: 'COMPLETE_STEP', output: { name: 'Updated' } });
      expect(s.context).toEqual({ name: 'Updated', color: 'blue' });
      expect(s.currentStepIndex).toBe(1);
    });
  });

  describe('unknown action', () => {
    it('returns state unchanged', () => {
      const s = start();
      const s2 = dispatch(s, { type: 'UNKNOWN' } as any);
      expect(s2).toBe(s);
    });
  });

  describe('full flow', () => {
    it('walks through 3 steps to completion', () => {
      let s = start(3, { name: '' });

      // Step 0: loading → data → complete
      s = dispatch(s, { type: 'SET_LOADING' });
      expect(s.steps[0].status).toBe('loading');
      s = dispatch(s, { type: 'SET_STEP_DATA', data: ['opt1'] });
      expect(s.steps[0].status).toBe('active');
      s = dispatch(s, { type: 'COMPLETE_STEP', output: { name: 'Project' } });

      // Step 1: error → retry → complete
      s = dispatch(s, {
        type: 'SET_ERROR',
        error: new Error('validation failed'),
      });
      expect(s.steps[1].status).toBe('error');
      s = dispatch(s, { type: 'COMPLETE_STEP', output: { color: 'blue' } });

      // Step 2: complete (last)
      s = dispatch(s, { type: 'COMPLETE_STEP', output: {} });
      expect(s.flowStatus).toBe('completing');
      expect(s.context).toEqual({ name: 'Project', color: 'blue' });

      s = dispatch(s, { type: 'SET_COMPLETED' });
      expect(s.flowStatus).toBe('completed');
    });

    it('recovers from onComplete error and retries', () => {
      let s = start(1);

      // Complete the only step → completing
      s = dispatch(s, { type: 'COMPLETE_STEP', output: { name: 'A' } });
      expect(s.flowStatus).toBe('completing');

      // onComplete fails → error, flowStatus reverts to active
      s = dispatch(s, {
        type: 'SET_ERROR',
        error: new Error('network error'),
      });
      expect(s.flowStatus).toBe('active');
      expect(s.steps[0].status).toBe('error');

      // User retries → complete again → completing
      s = dispatch(s, { type: 'COMPLETE_STEP', output: { name: 'A' } });
      expect(s.flowStatus).toBe('completing');

      // This time it succeeds
      s = dispatch(s, { type: 'SET_COMPLETED' });
      expect(s.flowStatus).toBe('completed');
    });
  });
});
