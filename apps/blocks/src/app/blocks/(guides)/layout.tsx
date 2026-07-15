import type { ReactNode } from 'react';

/**
 * Guides / concepts keep the calm ~720px reading column. Only the data-driven
 * reference pages under `[...slug]` use the wider shell column (`blocks/layout`),
 * which exists so wide component previews (tables, master/detail) have room. The
 * essay prose here would read poorly stretched, so it stays capped + centered.
 */
export default function GuidesLayout({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-[720px]">{children}</div>;
}
