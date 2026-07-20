import Link from 'next/link';

import { Button } from '@constructive-io/ui/button';

export default function NotFound() {
  return (
    <div className="registry-page flex min-h-[50dvh] max-w-lg flex-col justify-center py-20">
      <p className="registry-eyebrow">404</p>
      <h1 className="mt-2 text-[22px] font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 text-pretty text-sm leading-7 text-muted-foreground">
        The requested page is not part of the base primitive catalog.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link href="/">Overview</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/blocks">Setup</Link>
        </Button>
      </div>
    </div>
  );
}
