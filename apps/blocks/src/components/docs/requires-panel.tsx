/**
 * RequiresPanel — auto-rendered from a block's `<block>.requires.json`.
 *
 * Surfaces the SDK contract a host must satisfy: the namespace plus the exact
 * operations (mutations / queries / models) the block's generated hooks call.
 * The block imports those hooks from `@/generated/<namespace>`; `blocks-runtime`
 * wires the adapter that fulfils them.
 *
 * Two on-disk shapes are supported: the common single-namespace object, and the
 * multi-namespace `{ requires: [...] }` wrapper used by blocks whose hooks span
 * several generated SDKs (e.g. user-context-switcher).
 *
 * Calm surface (DESIGN.md §4.3): one hairline card, quiet 11px group labels, and
 * mono operation chips on `bg-muted` — no accent borders.
 *
 * Docs harness only — never imported by block source.
 */

export type RequiresJson = {
  namespace: string;
  mutations: string[];
  queries: string[];
  models: string[];
};

/** Multi-namespace variant — one entry per generated SDK the block depends on. */
export type RequiresJsonMulti = { requires: RequiresJson[] };

export type RequiresInput = RequiresJson | RequiresJsonMulti;

/** Shared chip recipe — mono 12px on `bg-muted`, no border (DESIGN.md §4.3 item 6). */
const chipClass = 'rounded-lg bg-muted px-1.5 py-0.5 font-mono text-[12px] text-foreground';

function OpGroup({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="text-pretty text-[11px] font-medium text-muted-foreground">{label}</p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {items.map((it) => (
          <li key={it}>
            <code className={chipClass}>{it}</code>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RequiresCard({ requires }: { requires: RequiresJson }) {
  const groups = [
    { label: 'Mutations', items: requires.mutations ?? [] },
    { label: 'Queries', items: requires.queries ?? [] },
    { label: 'Models', items: requires.models ?? [] },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 shadow-surface-1">
      <div className="flex items-center gap-2 text-[13px]">
        <span className="text-muted-foreground">Namespace</span>
        <code className={chipClass}>{requires.namespace}</code>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {groups.map((g) => (
          <OpGroup key={g.label} label={g.label} items={g.items} />
        ))}
      </div>

      <p className="mt-4 text-[12px] text-pretty text-muted-foreground">
        These operations must exist in your generated{' '}
        <code className="font-mono text-foreground">@/generated/{requires.namespace}</code> SDK — the block imports the
        hooks; <code className="font-mono text-foreground">blocks-runtime</code> wires the adapter.
      </p>
    </div>
  );
}

export function RequiresPanel({ requires }: { requires: RequiresInput }) {
  const cards = 'requires' in requires ? requires.requires : [requires];
  return (
    <div className="flex flex-col gap-3">
      {cards.map((r, i) => (
        <RequiresCard key={r.namespace || i} requires={r} />
      ))}
    </div>
  );
}
