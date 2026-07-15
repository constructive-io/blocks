import type { KeyboardEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { handleActivationKeyDown } from '../schema/schema-builder-core/lib/keyboard-activation';

function keyboardEvent(
  key: string,
  { nested = false }: { nested?: boolean } = {}
): KeyboardEvent<HTMLElement> {
  const currentTarget = document.createElement('div');
  const target = nested ? document.createElement('button') : currentTarget;

  return {
    key,
    target,
    currentTarget,
    preventDefault: vi.fn()
  } as unknown as KeyboardEvent<HTMLElement>;
}

describe('schema editor row keyboard activation', () => {
  it.each(['table', 'field', 'index', 'relationship'])('activates the %s row with Enter and Space', () => {
    const activate = vi.fn();
    const enterEvent = keyboardEvent('Enter');
    const spaceEvent = keyboardEvent(' ');

    handleActivationKeyDown(enterEvent, activate);
    handleActivationKeyDown(spaceEvent, activate);

    expect(activate).toHaveBeenCalledTimes(2);
    expect(enterEvent.preventDefault).toHaveBeenCalledOnce();
    expect(spaceEvent.preventDefault).toHaveBeenCalledOnce();
  });

  it('does not activate a row from nested control keys', () => {
    const activate = vi.fn();
    const nestedEnter = keyboardEvent('Enter', { nested: true });
    const nestedSpace = keyboardEvent(' ', { nested: true });

    handleActivationKeyDown(nestedEnter, activate);
    handleActivationKeyDown(nestedSpace, activate);

    expect(activate).not.toHaveBeenCalled();
    expect(nestedEnter.preventDefault).not.toHaveBeenCalled();
    expect(nestedSpace.preventDefault).not.toHaveBeenCalled();
  });

  it('keeps disabled rows out of the activation path', () => {
    const activate = vi.fn();
    const event = keyboardEvent('Enter');

    handleActivationKeyDown(event, activate, true);

    expect(activate).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});
