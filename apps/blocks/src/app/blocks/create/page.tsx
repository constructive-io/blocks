import type { Metadata } from 'next';

import { ThemePlayground } from '@/components/theme-playground/theme-playground';
import { OG_IMAGE, withBase } from '@/lib/site';

const TITLE = 'Create';
const DESCRIPTION =
  "Pick a theme preset or tune Constructive's neutrals, accent, radius, type, elevation and motion against every primitive and block, then copy the CSS or install it.";

export default function CreatePage() {
  return <ThemePlayground />;
}

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: withBase('/blocks/create') },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: withBase('/blocks/create'),
    images: [OG_IMAGE],
  },
};
