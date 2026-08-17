import { describe, expect, it } from 'vitest';

import { multiStepCommand } from '../multi-step/builder';
import type { StepViewProps } from '../multi-step/types';

function StubStep(_props: StepViewProps<unknown>) {
  return null;
}

const base = { id: 'test', label: 'Test', group: 'g' };

describe('multiStepCommand builder', () => {
  it('preserves the ordered flow configuration', () => {
    const onComplete = () => undefined;
    const command = multiStepCommand<{ name: string }>(base)
      .step({ id: 'first', title: 'First', Component: StubStep })
      .step({ id: 'second', title: 'Second', Component: StubStep, skippable: true })
      .initialContext({ name: 'default' })
      .onComplete(onComplete)
      .build();

    expect(command.multiStep).toMatchObject({
      steps: [{ id: 'first' }, { id: 'second', skippable: true }],
      initialContext: { name: 'default' },
      onComplete,
    });
  });

  it('rejects a flow without steps', () => {
    expect(() => multiStepCommand(base).build()).toThrow('at least one step is required');
  });

  it('rejects duplicate step ids', () => {
    expect(() =>
      multiStepCommand(base)
        .step({ id: 'duplicate', title: 'A', Component: StubStep })
        .step({ id: 'duplicate', title: 'B', Component: StubStep })
        .build(),
    ).toThrow('duplicate step id "duplicate"');
  });
});
