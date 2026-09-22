import { useId } from 'react';

import { cn } from '@/lib/utils';

const VIEW_W = 300;
const VIEW_H = 80;

/**
 * Stacked vertical bars. `series` stacks bottom-up in array order; each column
 * is scaled against the largest column total.
 */
export function StackedBars({
  series,
  labels,
  rx = 2,
  barGap = 6,
  label,
  className,
}: {
  series: { color: string; values: number[] }[];
  labels?: string[];
  rx?: number;
  barGap?: number;
  label?: string;
  className?: string;
}) {
  const clipId = useId();
  const columns = Math.max(...series.map((s) => s.values.length), 0);
  const totals = Array.from({ length: columns }, (_, i) => series.reduce((sum, s) => sum + (s.values[i] ?? 0), 0));
  const max = Math.max(...totals, 1);
  const barWidth = (VIEW_W - barGap * (columns - 1)) / columns;
  return (
    <div className={cn('flex w-full flex-col', className)}>
      {label ? <span className="sr-only">{label}</span> : null}
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
        aria-hidden
        className="block min-h-0 w-full flex-1"
      >
        {totals.map((_, column) => {
          let y = VIEW_H;
          // Only the topmost segment rounds its top corners — rounding every
          // segment notches the stack where two colours meet. Drawn bottom-up
          // with a clipPath so the lower segments stay square.
          const topIndex = series.reduce((top, s, i) => ((s.values[column] ?? 0) > 0 ? i : top), -1);
          return series.map((s, seriesIndex) => {
            const height = ((s.values[column] ?? 0) / max) * VIEW_H;
            y -= height;
            const isTop = seriesIndex === topIndex;
            const x = column * (barWidth + barGap);
            return (
              <g key={seriesIndex}>
                {isTop ? (
                  // Rounded rect that extends below the segment; the clip keeps only the segment's own band.
                  <>
                    <clipPath id={`${clipId}-${column}-${seriesIndex}`}>
                      <rect x={x} y={y} width={barWidth} height={height} />
                    </clipPath>
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={height + rx}
                      rx={rx}
                      fill={s.color}
                      clipPath={`url(#${clipId}-${column}-${seriesIndex})`}
                    />
                  </>
                ) : (
                  <rect x={x} y={y} width={barWidth} height={height} fill={s.color} />
                )}
              </g>
            );
          });
        })}
      </svg>
      {labels ? (
        <div className="mt-1.5 flex shrink-0 justify-between text-[11px] text-subtle-foreground tabular-nums">
          {labels.map((text, index) => (
            <span key={index}>{text}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
