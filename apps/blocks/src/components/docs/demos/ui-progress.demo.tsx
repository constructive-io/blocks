'use client';

import { useEffect, useState } from 'react';

import { Progress } from '@constructive-io/ui/progress';

import { Demo } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  const [value, setValue] = useState(12);

  useEffect(() => {
    const id = setInterval(() => {
      setValue((prev) => (prev >= 100 ? 12 : prev + 11));
    }, 900);
    return () => clearInterval(id);
  }, []);

  return (
    <Demo>
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-sm">
            <span>Importing seed.csv</span>
            <span className="text-muted-foreground">{value}%</span>
          </div>
          <Progress value={value} className="transition-all duration-500" />
        </div>

        <div className="flex flex-col gap-3">
          {[
            { label: 'Storage used', pct: 64 },
            { label: 'Monthly quota', pct: 38 },
          ].map((row) => (
            <div key={row.label} className="flex flex-col gap-1.5">
              <div className="flex justify-between text-sm">
                <span>{row.label}</span>
                <span className="text-muted-foreground">{row.pct}%</span>
              </div>
              <Progress value={row.pct} />
            </div>
          ))}
        </div>
      </div>
    </Demo>
  );
}
