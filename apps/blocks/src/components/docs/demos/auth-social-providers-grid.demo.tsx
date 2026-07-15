'use client';

import { useState } from 'react';

import { AuthSocialProvidersGrid } from '@/blocks/auth/social-providers-grid/social-providers-grid';
import { Demo, Segmented } from '@/components/docs/showcase-kit';

const DEMO_PROVIDERS = ['google', 'github', 'microsoft'];

const MODES: readonly ('sign-in' | 'sign-up')[] = ['sign-in', 'sign-up'];
const LAYOUTS: readonly ('stacked' | 'grid' | 'icon-only')[] = ['stacked', 'grid', 'icon-only'];

export function BlockDemo() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [layout, setLayout] = useState<'stacked' | 'grid' | 'icon-only'>('stacked');

  return (
    <Demo>
      <Segmented label="Mode" value={mode} options={MODES} onChange={setMode} />
      <Segmented label="Layout" value={layout} options={LAYOUTS} onChange={setLayout} />
      <AuthSocialProvidersGrid
        className="max-w-lg"
        providers={DEMO_PROVIDERS}
        mode={mode}
        layout={layout}
        showDivider
        onProviderClick={() => false}
      />
    </Demo>
  );
}
