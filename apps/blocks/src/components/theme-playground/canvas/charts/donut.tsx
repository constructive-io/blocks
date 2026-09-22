import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Segmented donut drawn with `pathLength`-normalized circle strokes. Children
 * render in an HTML center slot so the big value keeps the design-system font.
 */
export function Donut({
  segments,
  thickness = 12,
  startAngle = -90,
  size = 120,
  label,
  className,
  children,
}: {
  segments: { value: number; color: string }[];
  thickness?: number;
  startAngle?: number;
  size?: number;
  label?: string;
  className?: string;
  children?: ReactNode;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  const radius = 50 - thickness / 2;
  let offset = 0;
  return (
    <div className={cn('relative inline-block', className)} style={{ width: size, height: size }}>
      {label ? <span className="sr-only">{label}</span> : null}
      <svg viewBox="0 0 100 100" aria-hidden className="block h-full w-full">
        <g transform={`rotate(${startAngle} 50 50)`}>
          {segments.map((segment, index) => {
            const fraction = segment.value / total;
            const dash = fraction * 100;
            const current = offset;
            offset += dash;
            return (
              <circle
                key={index}
                cx={50}
                cy={50}
                r={radius}
                pathLength={100}
                fill="none"
                stroke={segment.color}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${100 - dash}`}
                strokeDashoffset={-current}
              />
            );
          })}
        </g>
      </svg>
      {children ? <div className="absolute inset-0 grid place-items-center">{children}</div> : null}
    </div>
  );
}
