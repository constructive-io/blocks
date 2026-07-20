'use client';

import type { ReactNode } from 'react';

export function Demo({ children }: { children: ReactNode }) {
  return <div className="flex w-full flex-col items-center">{children}</div>;
}
