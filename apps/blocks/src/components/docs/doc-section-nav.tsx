import Link from 'next/link';

import { DOC_SECTIONS, type DocSectionId } from '@/lib/doc-sections';
import { cn } from '@/lib/utils';

/** Moves between the pages of one docs section, such as Billing or Storage. */
export function DocSectionNav({ section, current }: { section: DocSectionId; current: string }) {
  const { title, links } = DOC_SECTIONS[section];
  return (
    <nav aria-label={`${title} docs`} className="mb-6 overflow-x-auto border-b border-border [scrollbar-width:none]">
      <ul className="flex min-w-max gap-1">
        {links.map((link) => {
          const active = link.href === current;
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  '-mb-px flex min-h-10 items-center border-b-2 px-2.5 text-[13px] outline-none transition-[color,box-shadow] duration-(--duration-moderate) ease-out',
                  'focus-visible:rounded-md focus-visible:ring-[3px] focus-visible:ring-ring/50',
                  active ? 'border-foreground font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
