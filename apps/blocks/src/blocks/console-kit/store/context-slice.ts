import type { StateCreator } from 'zustand/vanilla';

export type ConsoleKitContext = Readonly<{
  databaseId: string;
  organizationId: string | null;
}>;

export type ConsoleKitContextSlice = {
  context: ConsoleKitContext | null;
  setContext: (context: ConsoleKitContext) => void;
  clearContext: () => void;
};

export function createConsoleKitContextSlice(
  initialContext: ConsoleKitContext | null
): StateCreator<ConsoleKitContextSlice, [], [], ConsoleKitContextSlice> {
  return (set) => ({
    context: initialContext ? { ...initialContext } : null,
    setContext: (context) => set({ context: { ...context } }),
    clearContext: () => set({ context: null })
  });
}
