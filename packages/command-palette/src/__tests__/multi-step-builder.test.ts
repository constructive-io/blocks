import { describe, expect, it } from 'vitest';

import { multiStepCommand } from '../multi-step/builder';
import type { StepViewProps } from '../multi-step/types';

function StubStep(_props: StepViewProps<unknown>) {
  return null;
}

const base = { id: 'test', label: 'Test', group: 'g' };

describe('multiStepCommand builder', () => {

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
