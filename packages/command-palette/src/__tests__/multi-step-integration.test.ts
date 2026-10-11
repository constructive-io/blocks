import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { multiStepCommand, useMultiStepExecution, type MultiStepConfig } from '../index';

afterEach(cleanup);

type Context = { name: string; color: string };
const Component = () => null;
const step = (id: string) => ({ id, title: id, Component });
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

describe('multi-step host integration', () => {
  it('validates, revisits a loaded step with fresh context, and completes a skipped final step', async () => {
    const onComplete = vi.fn();
    const onCompleted = vi.fn();
    const loader = vi.fn(async (context: Readonly<Context>) => [context.name]);
    const command = multiStepCommand<Context>({ id: 'project', label: 'Project', group: 'projects' })
      .initialContext({ name: '' })
      .step({ ...step('name'), validate: (context) => context.name ? true : 'Name is required' })
      .step({ ...step('color'), loader })
      .step({ ...step('review'), skippable: true })
      .onComplete(onComplete)
      .build();
    const { result } = renderHook(() => useMultiStepExecution({ onCompleted }));
    act(() => result.current.start(command.id, command.multiStep as MultiStepConfig<Context>));
    act(() => result.current.goBack());
    act(() => result.current.completeStep({ name: '' }));
    expect(result.current.state?.steps[0].error?.message).toBe('Name is required');
    expect(result.current.state?.currentStepIndex).toBe(0);
    await act(async () => result.current.completeStep({ name: 'Original' }));
    expect(result.current.state?.steps[1].data).toEqual(['Original']);
    act(() => result.current.goBack());
    expect(result.current.state?.context).toEqual({ name: 'Original' });
    await act(async () => result.current.completeStep({ name: 'Updated' }));
    expect(result.current.state?.steps[1].data).toEqual(['Updated']);
    expect(loader.mock.calls.map(([context]) => context.name)).toEqual(['Original', 'Updated']);
    act(() => result.current.completeStep({ color: 'blue' }));
    await act(async () => result.current.skipStep());
    expect(onComplete).toHaveBeenCalledWith({ name: 'Updated', color: 'blue' });
    expect(onCompleted).toHaveBeenCalledOnce();
    expect(result.current.state?.flowStatus).toBe('completed');
    expect(result.current.config).toBeNull();
  });

  it('keeps completion failures retryable and blocks navigation until the host settles', async () => {
    const retry = deferred<void>();
    const onComplete = vi.fn().mockRejectedValueOnce(new Error('Save failed')).mockImplementationOnce(() => retry.promise);
    const { result } = renderHook(() => useMultiStepExecution());
    act(() => result.current.start('save', { steps: [{ ...step('save'), skippable: true, validate: (context: { name?: string }) => context.name ? true : 'Name is required' }], onComplete }));
    await act(async () => result.current.completeStep({ name: 'Project' }));
    expect(result.current.state?.steps[0].error?.message).toBe('Save failed');
    expect(result.current.state?.flowStatus).toBe('active');
    act(() => result.current.completeStep({ name: 'Fixed' }));
    act(() => result.current.completeStep({ name: '' }));
    act(() => result.current.goBack());
    act(() => result.current.skipStep());
    expect(result.current.state?.flowStatus).toBe('completing');
    expect(onComplete.mock.calls).toEqual([[{ name: 'Project' }], [{ name: 'Fixed' }]]);
    await act(async () => retry.resolve());
    expect(result.current.state?.flowStatus).toBe('completed');
    act(() => result.current.setError('Late error'));
    expect(result.current.state?.flowStatus).toBe('completed');
  });

  it('keeps an in-flight loader alive when navigation and completion are blocked', async () => {
    const pending = deferred<string[]>();
    const onComplete = vi.fn();
    const { result } = renderHook(() => useMultiStepExecution());
    act(() => result.current.start('load', { steps: [step('first'), {
      ...step('loaded'), loader: () => pending.promise,
      validate: (context: { color?: string }) => context.color === 'ignored' ? 'Cannot advance' : true,
    }], onComplete }));
    act(() => result.current.completeStep({ name: 'Project' }));
    expect(result.current.state?.steps[1].status).toBe('loading');
    act(() => result.current.completeStep({ color: 'ignored' }));
    act(() => result.current.goBack());
    act(() => result.current.skipStep());
    expect(result.current.state?.currentStepIndex).toBe(1);
    expect(onComplete).not.toHaveBeenCalled();
    await act(async () => pending.resolve(['ready']));
    expect(result.current.state?.steps[1].data).toEqual(['ready']);
    await act(async () => result.current.completeStep({ color: 'blue' }));
    expect(onComplete).toHaveBeenCalledWith({ name: 'Project', color: 'blue' });
  });

  it('cancels pending loaders and completion without accepting their late results', async () => {
    const pendingLoad = deferred<string[]>();
    const pendingSave = deferred<void>();
    const onCancel = vi.fn();
    const onCompleted = vi.fn();
    const { result } = renderHook(() => useMultiStepExecution({ onCompleted }));
    const onSkipComplete = vi.fn();
    for (const timing of ['after commit', 'same batch']) {
      for (const outcome of ['reject', 'resolve']) {
        const skipped = deferred<string[]>();
        const next = deferred<string[]>();
        act(() => result.current.start('skip', {
          steps: [
            { ...step('optional'), skippable: true, loader: () => skipped.promise },
            { ...step('next'), loader: () => next.promise },
          ],
          onComplete: onSkipComplete,
        }));
        expect(result.current.state?.steps[0].status).toBe('loading');
        const settleSkipped = () => outcome === 'resolve'
          ? skipped.resolve(['stale'])
          : skipped.reject(new Error('Stale load error'));
        if (timing === 'after commit') {
          act(() => result.current.skipStep());
          await act(async () => settleSkipped());
        } else {
          await act(async () => {
            result.current.skipStep();
            settleSkipped();
          });
        }
        const scenario = `${outcome} ${timing}`;
        expect(result.current.state?.currentStepIndex, scenario).toBe(1);
        expect(result.current.state?.steps[1].status, scenario).toBe('loading');
        expect(result.current.state?.steps[1].data, scenario).toBeUndefined();
        expect(result.current.state?.steps[1].error, scenario).toBeNull();
        await act(async () => next.resolve(['current']));
        expect(result.current.state?.steps[1].data, scenario).toEqual(['current']);
        await act(async () => result.current.completeStep({ name: 'Kept' }));
        expect(onSkipComplete).toHaveBeenLastCalledWith({ name: 'Kept' });
        expect(result.current.state?.flowStatus, scenario).toBe('completed');
      }
    }
    expect(onSkipComplete).toHaveBeenCalledTimes(4);
    expect(onCompleted).toHaveBeenCalledTimes(4);
    onCompleted.mockClear();
    act(() => result.current.start('load', { steps: [{ ...step('load'), loader: () => pendingLoad.promise }], onCancel }));
    act(() => result.current.cancel());
    await act(async () => pendingLoad.reject(new Error('Late load error')));
    expect(result.current.state).toBeNull();
    expect(onCancel).toHaveBeenCalledWith({}, 0);
    act(() => result.current.start('save', { steps: [step('save')], onComplete: () => pendingSave.promise, onCancel }));
    act(() => result.current.completeStep({ name: 'Project' }));
    act(() => result.current.cancel());
    await act(async () => pendingSave.resolve());
    expect(result.current.state).toBeNull();
    expect(result.current.config).toBeNull();
    expect(onCancel).toHaveBeenLastCalledWith({ name: 'Project' }, 0);
    expect(onCompleted).not.toHaveBeenCalled();
  });
});
