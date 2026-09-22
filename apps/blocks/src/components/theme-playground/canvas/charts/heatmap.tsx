import { cn } from '@/lib/utils';

const LEVELS = [0, 0.2, 0.4, 0.6, 0.8, 1];

/**
 * Contributions-style grid: `weeks` columns × 7 rows, column-major `values`
 * in 0–1, quantized to five opacity steps of a single color. Level 0 falls
 * back to `bg-muted`.
 */
export function Heatmap({
  values,
  weeks,
  color = 'var(--chart-1)',
  label,
  className,
}: {
  values: number[];
  weeks: number;
  color?: string;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn('w-full', className)}>
      {label ? <span className="sr-only">{label}</span> : null}
      <div
        aria-hidden
        className="grid grid-flow-col grid-rows-7 gap-[3px]"
        style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: weeks * 7 }, (_, index) => {
          const value = Math.min(Math.max(values[index] ?? 0, 0), 1);
          if (value <= 0) {
            return <div key={index} className="aspect-square rounded-[2px] bg-muted" />;
          }
          const step = Math.min(Math.ceil(value * (LEVELS.length - 1)), LEVELS.length - 1);
          return (
            <div
              key={index}
              className="aspect-square rounded-[2px]"
              style={{ backgroundColor: color, opacity: LEVELS[step] }}
            />
          );
        })}
      </div>
    </div>
  );
}
