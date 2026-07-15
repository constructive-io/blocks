'use client';

import { useState } from 'react';

import { AuthSocialButtons, type SocialButtonsLayout } from '@/blocks/auth/social-buttons/social-buttons';
import { Demo, Segmented } from '@/components/docs/showcase-kit';

const DEMO_PROVIDERS = ['google', 'github', 'microsoft', 'apple'];

const LAYOUTS: readonly SocialButtonsLayout[] = ['stacked', 'grid', 'icon-only'];
const MODES: readonly ('sign-in' | 'sign-up')[] = ['sign-in', 'sign-up'];

export function BlockDemo() {
  const [layout, setLayout] = useState<SocialButtonsLayout>('stacked');
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');

  return (
    <Demo>
      <Segmented label="Layout" value={layout} options={LAYOUTS} onChange={setLayout} />
      <Segmented label="Mode" value={mode} options={MODES} onChange={setMode} />
      <AuthSocialButtons
        className="max-w-lg"
        providers={DEMO_PROVIDERS}
        layout={layout}
        mode={mode}
        showDivider
        onProviderClick={() => false}
      />
    </Demo>
  );
}
