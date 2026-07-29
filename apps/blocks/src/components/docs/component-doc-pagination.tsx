import Link from 'next/link';

import {
  getComponentDocNeighbors,
  type ComponentDocId,
  type ComponentDocLink,
} from '@/lib/component-doc-navigation';

function NeighborLink({
  direction,
  neighbor,
}: {
  direction: 'Previous' | 'Next';
  neighbor?: ComponentDocLink;
}) {
  if (!neighbor) return <span />;

  return (
    <Link
      className="inline-flex min-h-10 flex-col justify-center rounded-md text-sm text-muted-foreground outline-none transition-colors duration-150 ease-out hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      href={neighbor.href}
    >
      <span className="block text-xs">{direction}</span>
      <span className="font-medium text-foreground">{neighbor.title}</span>
    </Link>
  );
}

export function ComponentDocPagination({
  current,
}: {
  current: ComponentDocId;
}) {
  const { next, previous } = getComponentDocNeighbors(current);

  return (
    <nav
      aria-label="Component pagination"
      className="mt-12 grid grid-cols-2 gap-6 border-t border-border pt-6"
    >
      <NeighborLink direction="Previous" neighbor={previous} />
      <div className="text-right">
        <NeighborLink direction="Next" neighbor={next} />
      </div>
    </nav>
  );
}
