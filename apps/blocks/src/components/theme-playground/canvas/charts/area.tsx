import { useId } from 'react';

import { cn } from '@/lib/utils';

const VIEW_W = 300;
const VIEW_H = 80;
const PAD = 4;

function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    path += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return path;
}

/**
 * Smooth area chart: a stroked line over a soft vertical gradient fill.
 * `baseline` draws three hairline grid lines on the border token.
 */
export function Area({
  data,
  color = 'var(--chart-1)',
  strokeWidth = 1.75,
  dots = false,
  baseline = false,
  label,
  className,
}: {
  data: number[];
  color?: string;
  strokeWidth?: number;
  dots?: boolean;
  baseline?: boolean;
  label?: string;
  className?: string;
}) {
  const gradientId = useId();
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const points = data.map((value, index) => ({
    x: (index / Math.max(data.length - 1, 1)) * VIEW_W,
    y: PAD + (1 - (value - min) / span) * (VIEW_H - PAD * 2),
  }));
  const line = smoothPath(points);
  const fill = `${line} L ${VIEW_W} ${VIEW_H} L 0 ${VIEW_H} Z`;
  return (
    <div className={cn('w-full', className)}>
      {label ? <span className="sr-only">{label}</span> : null}
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="none" aria-hidden className="block h-full w-full">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {baseline
          ? [0.25, 0.5, 0.75].map((fraction) => (
              <line
                key={fraction}
                x1={0}
                x2={VIEW_W}
                y1={VIEW_H * fraction}
                y2={VIEW_H * fraction}
                stroke="var(--border)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ))
          : null}
        <path d={fill} fill={`url(#${gradientId})`} stroke="none" />
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {dots
          ? points.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r={2} fill={color} />)
          : null}
      </svg>
    </div>
  );
}
