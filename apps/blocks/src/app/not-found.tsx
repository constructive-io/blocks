import Link from 'next/link';

import { Button } from '@constructive-io/ui/button';

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-xl flex-col justify-center px-6 py-20 text-center">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="mt-3 text-balance text-3xl font-semibold">Page not found</h1>
      <p className="mt-4 text-pretty leading-7 text-muted-foreground">The requested documentation page is not part of the base primitive catalog.</p>
      <Button asChild className="mx-auto mt-8">
        <Link href="/blocks">Browse primitives</Link>
      </Button>
    </div>
  );
}
