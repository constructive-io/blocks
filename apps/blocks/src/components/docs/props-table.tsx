/**
 * PropsTable — a lean key-props reference for a block (DESIGN.md §7.2).
 *
 * Intentionally NOT a generated dump of the full TS type: each page lists only
 * the props a host actually reaches for, with the override/notification seams
 * called out in prose elsewhere. Required props get a `*`.
 *
 * FF plain table: 13px, a semibold header underlined with `border-border`, body
 * rows on `border-border/40` hairlines, mono 12px identifiers/types. The Default
 * column drops out entirely when no row declares one. Scrolls horizontally on
 * narrow viewports.
 *
 * Docs harness only — never imported by block source.
 */

import { fontWeights } from '@/lib/motion/font-weight';

export type PropRow = {
  name: string;
  type: string;
  default?: string;
  required?: boolean;
  description: string;
};

export function PropsTable({ rows }: { rows: PropRow[] }) {
  // Drop the Default column when nothing has a default — an all-"—" column is noise.
  const showDefault = rows.some((r) => r.default !== undefined);

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-border">
            <th className="px-3 py-2 text-left text-foreground" style={{ fontVariationSettings: fontWeights.semibold }}>
              Prop
            </th>
            <th className="px-3 py-2 text-left text-foreground" style={{ fontVariationSettings: fontWeights.semibold }}>
              Type
            </th>
            {showDefault ? (
              <th
                className="px-3 py-2 text-left text-foreground"
                style={{ fontVariationSettings: fontWeights.semibold }}
              >
                Default
              </th>
            ) : null}
            <th className="px-3 py-2 text-left text-foreground" style={{ fontVariationSettings: fontWeights.semibold }}>
              Description
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-b border-border/40">
              <td className="px-3 py-2 align-top font-mono text-[12px] text-foreground">
                {r.name}
                {r.required ? <span className="text-destructive"> *</span> : null}
              </td>
              <td className="max-w-[22rem] px-3 py-2 align-top font-mono text-[12px] break-words whitespace-normal text-muted-foreground">
                {r.type}
              </td>
              {showDefault ? (
                <td className="px-3 py-2 align-top font-mono text-[12px] whitespace-nowrap text-muted-foreground">
                  {r.default ?? '—'}
                </td>
              ) : null}
              <td className="px-3 py-2 align-top text-pretty text-muted-foreground">{r.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
