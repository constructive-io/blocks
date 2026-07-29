import Link from 'next/link';

import {
  getApplicationDocNeighbors,
  type ApplicationDocId,
  type ApplicationDocLink,
} from '@/lib/application-doc-navigation';

function NeighborLink({
  direction,
  neighbor,
}: {
  direction: 'Previous' | 'Next';
  neighbor?: ApplicationDocLink;
}) {
  if (!neighbor) return <span />;

  return (
    <Link
      className="inline-flex min-h-10 flex-col justify-center rounded-md text-sm text-muted-foreground outline-none transition-colors duration-150 ease-out hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      href={`/blocks/${neighbor.id}`}
    >
      <span className="block text-xs">{direction}</span>
      <span className="font-medium text-foreground">{neighbor.title}</span>
    </Link>
  );
}

export function ApplicationDocPagination({
  current,
}: {
  current: ApplicationDocId;
}) {
  const { next, previous } = getApplicationDocNeighbors(current);

  return (
    <nav
      aria-label="Application block pagination"
      className="mt-12 grid grid-cols-2 gap-6 border-t border-border pt-6"
    >
      <NeighborLink direction="Previous" neighbor={previous} />
      <div className="text-right">
        <NeighborLink direction="Next" neighbor={next} />
      </div>
    </nav>
  );
}
