import { cn } from '@/lib/utils';

/**
 * Concentric progress arcs (sleep-report archetype). Rings render outermost
 * first; `value / max` sets each arc's sweep.
 */
export function RadialBars({
  rings,
  thickness = 9,
  gap = 5,
  size = 140,
  label,
  className,
}: {
  rings: { value: number; max: number; color: string }[];
  thickness?: number;
  gap?: number;
  size?: number;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn('relative inline-block', className)} style={{ width: size, height: size }}>
      {label ? <span className="sr-only">{label}</span> : null}
      <svg viewBox="0 0 100 100" aria-hidden className="block h-full w-full">
        <g transform="rotate(-90 50 50)">
          {rings.map((ring, index) => {
            const radius = 50 - thickness / 2 - index * (thickness + gap);
            if (radius <= 0) return null;
            const fraction = Math.min(ring.value / ring.max, 1);
            return (
              <g key={index}>
                <circle
                  cx={50}
                  cy={50}
                  r={radius}
                  pathLength={100}
                  fill="none"
                  stroke={ring.color}
                  strokeWidth={thickness}
                  strokeOpacity={0.16}
                />
                <circle
                  cx={50}
                  cy={50}
                  r={radius}
                  pathLength={100}
                  fill="none"
                  stroke={ring.color}
                  strokeWidth={thickness}
                  strokeLinecap="round"
                  strokeDasharray={`${fraction * 100} ${100 - fraction * 100}`}
                />
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
