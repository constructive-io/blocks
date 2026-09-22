import { cn } from '@/lib/utils';

const VIEW_W = 300;
const VIEW_H = 80;

/**
 * Dependency-free vertical bar chart. Stretches to its container via
 * `preserveAspectRatio="none"`; labels render in HTML so font and tabular
 * numbers stay on the design system.
 */
export function Bars({
  data,
  labels,
  color = 'var(--chart-1)',
  highlightLast = false,
  rx = 3,
  barGap = 6,
  label,
  className,
}: {
  data: number[];
  labels?: string[];
  color?: string;
  highlightLast?: boolean;
  rx?: number;
  barGap?: number;
  label?: string;
  className?: string;
}) {
  const max = Math.max(...data, 1);
  const barWidth = (VIEW_W - barGap * (data.length - 1)) / data.length;
  return (
    <div className={cn('w-full', className)}>
      {label ? <span className="sr-only">{label}</span> : null}
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="none" aria-hidden className="block h-full w-full">
        {data.map((value, index) => {
          const height = Math.max((value / max) * VIEW_H, 1);
          return (
            <rect
              key={index}
              x={index * (barWidth + barGap)}
              y={VIEW_H - height}
              width={barWidth}
              height={height}
              rx={rx}
              fill={color}
              fillOpacity={highlightLast && index < data.length - 1 ? 0.65 : 1}
            />
          );
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
