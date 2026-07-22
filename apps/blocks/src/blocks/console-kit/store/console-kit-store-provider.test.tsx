import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  ConsoleKitStoreProvider,
  createConsoleKitStore,
  useConsoleKitStore
} from './console-kit-store';

function ActiveFeature() {
  return <span>{useConsoleKitStore((state) => state.activeFeature)}</span>;
}

describe('ConsoleKitStoreProvider', () => {
  it('uses the current host-owned store after a rerender', () => {
    const first = createConsoleKitStore('data');
    const second = createConsoleKitStore('auth');
    const { rerender } = render(
      <ConsoleKitStoreProvider initialFeature='data' store={first}>
        <ActiveFeature />
      </ConsoleKitStoreProvider>
    );

    expect(screen.getByText('data')).toBeInTheDocument();

    rerender(
      <ConsoleKitStoreProvider initialFeature='data' store={second}>
        <ActiveFeature />
      </ConsoleKitStoreProvider>
    );

    expect(screen.getByText('auth')).toBeInTheDocument();
  });
});
