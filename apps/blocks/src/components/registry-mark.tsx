/**
 * RegistryMark — the Constructive Blocks small-size brand mark.
 *
 * A size-specific reduction of the Constructive logo (an isometric lattice
 * that turns to mush below ~48px): three isometric cubes in the brand primary
 * form the structure, and a fourth cube in `var(--foreground)` hovers above
 * the right corner — the block being added. Same projection and two-tone
 * story as the full Constructive logo used on large surfaces, but with four
 * chunky shapes that stay legible at 14-28px.
 *
 * Every cube sits on a `var(--background)`-colored halo (sticker-keyline
 * technique), so neighbouring cubes separate crisply at any render size
 * instead of merging — which also means the mark expects to sit on the page
 * background; on a tinted surface the keylines would show. Faces are shaded
 * via opacity so the cubes read dimensional in both themes.
 *
 * Shared by the docs sidebar banner, the Hero top-nav, and the footer.
 * Default size ~26px; pass `size` (number → px, or any CSS length string)
 * and/or `className`.
 */

// Isometric cube metrics: top-face half-width/half-height, vertical edge,
// and the bg keyline width (straddles the edge: half outward).
const W = 26;
const H = 15;
const V = 26;
const HALO = 10;

function Cube({ x, y, fill, className }: { x: number; y: number; fill: string; className?: string }) {
  const hexOutline = `M${x} ${y} L${x + W} ${y + H} L${x + W} ${y + H + V} L${x} ${y + 2 * H + V} L${x - W} ${y + H + V} L${x - W} ${y + H} Z`;
  return (
    <g className={className}>
      <path
        d={hexOutline}
        fill="var(--background)"
        stroke="var(--background)"
        strokeWidth={HALO}
        strokeLinejoin="round"
      />
      <g fill={fill}>
        <path d={`M${x} ${y} L${x + W} ${y + H} L${x} ${y + 2 * H} L${x - W} ${y + H} Z`} />
        <path d={`M${x - W} ${y + H} L${x} ${y + 2 * H} L${x} ${y + 2 * H + V} L${x - W} ${y + H + V} Z`} opacity=".62" />
        <path d={`M${x + W} ${y + H} L${x} ${y + 2 * H} L${x} ${y + 2 * H + V} L${x + W} ${y + H + V} Z`} opacity=".38" />
      </g>
    </g>
  );
}

export function RegistryMark({
  size = 26,
  className,
  ...props
}: { size?: number | string; className?: string } & React.SVGProps<SVGSVGElement>) {
  const dimension = typeof size === 'number' ? `${size}px` : size;
  return (
    <svg
      viewBox="-59 -49.5 118 127"
      fill="none"
      width={dimension}
      height={dimension}
      // `registry-mark` opts into the hover hop (globals.css): hovering the
      // mark — or any link it sits in — makes the floater jump and settle.
      // It also sets overflow visible so the hop's apex isn't clipped.
      className={className ? `registry-mark ${className}` : 'registry-mark'}
      aria-hidden="true"
      {...props}
    >
      {/* the incoming block, hovering clear above the right corner */}
      <Cube x={28} y={-44.5} fill="var(--foreground)" className="registry-mark-floater" />
      {/* the structure: back cube + two front cubes */}
      <Cube x={0} y={0} fill="var(--primary)" />
      <Cube x={-28} y={16.5} fill="var(--primary)" />
      <Cube x={28} y={16.5} fill="var(--primary)" />
    </svg>
  );
}

export default RegistryMark;
