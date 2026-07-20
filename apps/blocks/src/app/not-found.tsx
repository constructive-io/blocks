import Link from 'next/link';

import { Button } from '@constructive-io/ui/button';

export default function NotFound() {
  return (
    <div className="site-container flex min-h-[calc(100dvh-10rem)] max-w-lg flex-col justify-center py-20">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="mt-2 text-balance text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-3 text-pretty text-[15px] leading-7 text-muted-foreground">
        The requested page is not part of the base primitive catalog.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link href="/">Browse components</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/blocks">Setup</Link>
        </Button>
      </div>
    </div>
  );
}
