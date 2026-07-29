import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  MultiStepConfig,
  MultiStepState,
  StepViewProps
} from '@constructive-io/command-palette';

import { MultiStepView } from './multi-step-view';

type TestContext = { name: string };

function InputStep({ onComplete }: StepViewProps<TestContext>) {
  const [value, setValue] = useState('');
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onComplete({ name: value });
      }}
    >
      <input
        aria-label="Project name"
        onChange={(event) => setValue(event.target.value)}
        value={value}
      />
    </form>
  );
}

const config: MultiStepConfig<TestContext> = {
  steps: [{ id: 'details', title: 'Details', Component: InputStep }]
};

const state: MultiStepState<TestContext> = {
  commandId: 'create-project',
  currentStepIndex: 0,
  context: {},
  steps: [{ status: 'active', error: null, data: undefined }],
  flowStatus: 'active',
  direction: 'forward'
};

function renderStep(onCompleteStep = vi.fn()) {
  return render(
    <MultiStepView
      config={config}
      onBack={() => undefined}
      onCancel={() => undefined}
      onCompleteStep={onCompleteStep}
      onError={() => undefined}
      onSkip={() => undefined}
      state={state}
    />
  );
}

afterEach(cleanup);

describe('MultiStepView keyboard ownership', () => {
  it.each(['Enter', 'ArrowUp', 'ArrowDown'])('keeps %s inside the active step', (key) => {
    const parentKeyDown = vi.fn();
    const view = render(
      <div onKeyDown={parentKeyDown}>
        <MultiStepView
          config={config}
          onBack={() => undefined}
          onCancel={() => undefined}
          onCompleteStep={() => undefined}
          onError={() => undefined}
          onSkip={() => undefined}
          state={state}
        />
      </div>
    );

    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Project name' }), { key });
    expect(parentKeyDown).not.toHaveBeenCalled();
    view.unmount();
  });

  it('allows Escape to reach the dialog dismissal layer', () => {
    const parentKeyDown = vi.fn();
    render(
      <div onKeyDown={parentKeyDown}>
        <MultiStepView
          config={config}
          onBack={() => undefined}
          onCancel={() => undefined}
          onCompleteStep={() => undefined}
          onError={() => undefined}
          onSkip={() => undefined}
          state={state}
        />
      </div>
    );

    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Project name' }), {
      key: 'Escape'
    });
    expect(parentKeyDown).toHaveBeenCalledTimes(1);
  });

  it('submits the active step with Enter', async () => {
    const onComplete = vi.fn();
    const user = userEvent.setup();
    renderStep(onComplete);

    await user.type(
      screen.getByRole('textbox', { name: 'Project name' }),
      'Northstar{Enter}'
    );
    expect(onComplete).toHaveBeenCalledWith({ name: 'Northstar' });
  });
});
