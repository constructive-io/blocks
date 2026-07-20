'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

import { SiteSidebar } from '@/components/site/site-sidebar';
import { SiteTopbar } from '@/components/site/site-topbar';

export function RegistryShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  return (
    <div className="registry-app">
      {mobileOpen ? (
        <button
          type="button"
          className="registry-side-backdrop min-[861px]:hidden"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <SiteSidebar open={mobileOpen} onNavigate={() => setMobileOpen(false)} />

      <div className="registry-main">
        <SiteTopbar onMenuClick={() => setMobileOpen(true)} />
        <div className="registry-content flex-1">{children}</div>
      </div>
    </div>
  );
}
