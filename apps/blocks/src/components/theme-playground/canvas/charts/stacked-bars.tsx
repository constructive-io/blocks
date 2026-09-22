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
  const columns = Math.max(...series.map((s) => s.values.length), 0);
  const totals = Array.from({ length: columns }, (_, i) => series.reduce((sum, s) => sum + (s.values[i] ?? 0), 0));
  const max = Math.max(...totals, 1);
  const barWidth = (VIEW_W - barGap * (columns - 1)) / columns;
  return (
    <div className={cn('w-full', className)}>
      {label ? <span className="sr-only">{label}</span> : null}
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="none" aria-hidden className="block h-full w-full">
        {totals.map((_, column) => {
          let y = VIEW_H;
          return series.map((s, seriesIndex) => {
            const height = ((s.values[column] ?? 0) / max) * VIEW_H;
            y -= height;
            return (
              <rect
                key={seriesIndex}
                x={column * (barWidth + barGap)}
                y={y}
                width={barWidth}
                height={height}
                rx={rx}
                fill={s.color}
              />
            );
          });
        })}
      </svg>
      {labels ? (
        <div className="mt-1.5 flex justify-between text-[11px] text-subtle-foreground tabular-nums">
          {labels.map((text, index) => (
            <span key={index}>{text}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
