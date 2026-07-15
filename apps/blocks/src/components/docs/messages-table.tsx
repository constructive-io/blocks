/**
 * MessagesTable — auto-rendered from a block's `default<Block>Messages` object.
 *
 * The canonical message shape is: top-level camelCase keys are UI copy, plus a
 * nested map (e.g. `errors`) keyed by backend error CODE. This splits the two
 * generically — string values become a Copy table, each nested object becomes
 * its own labeled table — so the page never restates strings the block owns.
 *
 * FF plain table (DESIGN.md §7.2): a quiet mono caption over a 13px table with a
 * semibold underlined header, hairline body rows, mono 12px keys.
 *
 * Docs harness only — never imported by block source.
 */

import { fontWeights } from '@/lib/motion/font-weight';

type MessagesObject = Record<string, unknown>;

function KeyValueTable({ caption, keyHeader, rows }: { caption: string; keyHeader: string; rows: [string, string][] }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-pretty font-mono text-[11px] text-muted-foreground">{caption}</p>
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-border">
              <th
                className="px-3 py-2 text-left text-foreground"
                style={{ fontVariationSettings: fontWeights.semibold }}
              >
                {keyHeader}
              </th>
              <th
                className="px-3 py-2 text-left text-foreground"
                style={{ fontVariationSettings: fontWeights.semibold }}
              >
                Default copy
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k} className="border-b border-border/40">
                <td className="px-3 py-2 align-top font-mono text-[12px] whitespace-nowrap text-foreground">{k}</td>
                <td className="px-3 py-2 align-top text-pretty text-muted-foreground">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function MessagesTable({ messages }: { messages: MessagesObject }) {
  const copy: [string, string][] = [];
  const groups: { name: string; rows: [string, string][] }[] = [];

  for (const [key, value] of Object.entries(messages)) {
    if (typeof value === 'string') {
      copy.push([key, value]);
    } else if (value && typeof value === 'object') {
      groups.push({ name: key, rows: Object.entries(value as Record<string, string>) });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {copy.length ? <KeyValueTable caption="copy" keyHeader="Key" rows={copy} /> : null}
      {groups.map((g) => (
        <KeyValueTable key={g.name} caption={g.name} keyHeader="Code" rows={g.rows} />
      ))}
    </div>
  );
}
