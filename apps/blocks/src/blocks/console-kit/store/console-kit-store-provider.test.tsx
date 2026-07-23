import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  ConsoleKitStoreProvider,
  createConsoleKitStore,
  useConsoleKitStore
} from './console-kit-store';
import { storageConsoleStoreSlice } from '../../feature-packs/storage/storage-console-slice';

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

  it('rejects a host-owned store that omitted an active module slice', () => {
    const store = createConsoleKitStore('storage');

    expect(() => render(
      <ConsoleKitStoreProvider
        initialFeature='storage'
        sliceContributions={[storageConsoleStoreSlice]}
        store={store}
      >
        <ActiveFeature />
      </ConsoleKitStoreProvider>
    )).toThrow(/missing the storage module slice/u);
  });
});
