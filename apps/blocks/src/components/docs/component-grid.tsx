import { CatalogCard } from '@/components/docs/catalog-card';
import { BASE_PRIMITIVES } from '@/lib/base-primitives';

type ComponentGridProps = {
  showPreview?: boolean;
  id?: string;
};

export function ComponentGrid({ showPreview = true, id = 'component-catalog' }: ComponentGridProps) {
  return (
    <section id={id} aria-label="Base primitives">
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5 xl:grid-cols-4">
        {BASE_PRIMITIVES.map((primitive) => (
          <li key={primitive.name}>
            <CatalogCard primitive={primitive} showPreview={showPreview} />
          </li>
        ))}
      </ul>
    </section>
  );
}
