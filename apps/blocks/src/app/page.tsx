import Link from 'next/link';

import { Button } from '@constructive-io/ui/button';

import { BASE_PRIMITIVES } from '@/lib/base-primitives';

export default function HomePage() {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-5xl flex-col justify-center px-6 py-20 sm:px-8">
      <div className="max-w-2xl">
        <p className="mb-4 text-sm font-medium text-muted-foreground">@constructive-io/ui</p>
        <h1 className="text-balance text-4xl font-semibold text-foreground sm:text-6xl">A clean foundation for Constructive interfaces.</h1>
        <p className="mt-6 max-w-xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
          Install the same base primitives as a versioned npm package or copy their source into your project with the
          shadcn CLI.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/blocks">View setup</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/blocks/ui/button">Browse primitives</Link>
          </Button>
        </div>
      </div>

      <p className="mt-16 text-pretty text-sm text-muted-foreground">
        {BASE_PRIMITIVES.length} base primitives, one canonical implementation.
      </p>
    </div>
  );
}
