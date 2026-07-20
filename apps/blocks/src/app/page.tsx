import Link from 'next/link';

import { ComponentGrid } from '@/components/docs/component-grid';
import { PageHeader } from '@/components/docs/page-header';
import { Button } from '@constructive-io/ui/button';

import { BASE_PRIMITIVES } from '@/lib/base-primitives';

export default function HomePage() {
  return (
    <>
      <div className="site-container">
        <PageHeader
          title="A clean foundation for Constructive interfaces."
          description={`Install the same ${BASE_PRIMITIVES.length} base primitives as a versioned npm package or copy their source with the shadcn CLI.`}
        >
          <Button asChild size="sm">
            <Link href="/blocks">Get started</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="#component-catalog">Browse {BASE_PRIMITIVES.length} components</Link>
          </Button>
        </PageHeader>
      </div>

      <div className="site-rule">
        <div className="site-container py-8 sm:py-10">
          <ComponentGrid />
        </div>
      </div>
    </>
  );
}
