import { describe, it, expect, vi } from 'vitest';
import { multiStepCommand } from '../multi-step/builder';
import { kbd } from '../keybinding';
import type { StepViewProps } from '../multi-step/types';

// Minimal step component for testing
function StubStep(_props: StepViewProps<any>) {
  return null;
}

const base = { id: 'test', label: 'Test', group: 'g' };

describe('multiStepCommand builder', () => {
  it('builds a valid CommandDefinition with type multi-step', () => {
    const cmd = multiStepCommand(base)
      .step({ id: 's1', title: 'Step 1', Component: StubStep })
      .build();

    expect(cmd.id).toBe('test');
    expect(cmd.type).toBe('multi-step');
    expect(cmd.multiStep).toBeDefined();
    expect(cmd.multiStep!.steps).toHaveLength(1);
    expect(cmd.multiStep!.steps[0].id).toBe('s1');
  });

  it('preserves all base fields', () => {
    const cmd = multiStepCommand({
      ...base,
      description: 'desc',
      shortcut: kbd('n', 'mod'),
      keywords: ['a', 'b'],
      priority: 5,
    })
      .step({ id: 's1', title: 'S1', Component: StubStep })
      .build();

    expect(cmd.description).toBe('desc');
    expect(cmd.shortcut).toEqual(kbd('n', 'mod'));
    expect(cmd.keywords).toEqual(['a', 'b']);
    expect(cmd.priority).toBe(5);
  });

  it('supports multiple steps in order', () => {
    const cmd = multiStepCommand(base)
      .step({ id: 's1', title: 'First', Component: StubStep })
      .step({ id: 's2', title: 'Second', Component: StubStep })
      .step({ id: 's3', title: 'Third', Component: StubStep })
      .build();

    const steps = cmd.multiStep!.steps;
    expect(steps).toHaveLength(3);
    expect(steps[0].id).toBe('s1');
    expect(steps[1].id).toBe('s2');
    expect(steps[2].id).toBe('s3');
  });

  it('sets initialContext', () => {
    const cmd = multiStepCommand<{ name: string }>(base)
      .step({ id: 's1', title: 'S1', Component: StubStep })
      .initialContext({ name: 'default' })
      .build();

    expect(cmd.multiStep!.initialContext).toEqual({ name: 'default' });
  });

  it('sets onComplete callback', () => {
    const fn = vi.fn();
    const cmd = multiStepCommand(base)
      .step({ id: 's1', title: 'S1', Component: StubStep })
      .onComplete(fn)
      .build();

    expect(cmd.multiStep!.onComplete).toBe(fn);
  });

  it('sets onCancel callback', () => {
    const fn = vi.fn();
    const cmd = multiStepCommand(base)
      .step({ id: 's1', title: 'S1', Component: StubStep })
      .onCancel(fn)
      .build();

    expect(cmd.multiStep!.onCancel).toBe(fn);
  });

  it('throws if no steps added', () => {
    expect(() => multiStepCommand(base).build()).toThrow(
      'at least one step is required'
    );
  });

  it('throws on duplicate step ids', () => {
    expect(() =>
      multiStepCommand(base)
        .step({ id: 'dup', title: 'A', Component: StubStep })
        .step({ id: 'dup', title: 'B', Component: StubStep })
        .build()
    ).toThrow('duplicate step id "dup"');
  });

  it('supports fluent chaining', () => {
    const builder = multiStepCommand<{ x: number }>(base);
    const same = builder
      .step({ id: 's1', title: 'S1', Component: StubStep })
      .initialContext({ x: 1 })
      .onComplete(() => {})
      .onCancel(() => {});

    // All methods return the same builder
    expect(same).toBe(builder);
  });

  it('includes step config fields (loader, validate, skippable)', () => {
    const loader = vi.fn();
    const validate = vi.fn();

    const cmd = multiStepCommand(base)
      .step({
        id: 's1',
        title: 'S1',
        Component: StubStep,
        loader,
        validate,
        skippable: true,
        description: 'step desc',
      })
      .build();

    const step = cmd.multiStep!.steps[0];
    expect(step.loader).toBe(loader);
    expect(step.validate).toBe(validate);
    expect(step.skippable).toBe(true);
    expect(step.description).toBe('step desc');
  });
});
