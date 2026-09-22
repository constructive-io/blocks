'use client';

import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';

import { Button } from '@constructive-io/ui/button';
import { Kbd } from '@constructive-io/ui/kbd';

import { SinkCard } from './sink-card';

const GRID = 21;

/** Deterministic pseudo-random fill for the QR-like tile. */
function seeded(row: number, col: number): boolean {
  const x = Math.sin(row * 127.1 + col * 311.7) * 43758.5453;
  return x - Math.floor(x) > 0.5;
}

/** Inside a 7×7 finder square (plus its 1-cell separator) at a corner? */
function finderFill(row: number, col: number): boolean | null {
  for (const [r0, c0] of [
    [0, 0],
    [0, GRID - 7],
    [GRID - 7, 0],
  ] as const) {
    const dr = row - r0;
    const dc = col - c0;
    if (dr >= -1 && dr <= 7 && dc >= -1 && dc <= 7) {
      if (dr === -1 || dr === 7 || dc === -1 || dc === 7) return false;
      return dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4);
    }
  }
  return null;
}

function QrTile() {
  return (
    <div
      className="grid size-[152px] shrink-0 grid-cols-[repeat(21,minmax(0,1fr))] rounded-md bg-muted/50 p-3"
      aria-hidden
    >
      {Array.from({ length: GRID * GRID }, (_, index) => {
        const row = Math.floor(index / GRID);
        const col = index % GRID;
        const filled = finderFill(row, col) ?? seeded(row, col);
        return <div key={index} className={filled ? 'bg-foreground' : undefined} />;
      })}
    </div>
  );
}

export function ConnectCliCard() {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  return (
    <SinkCard
      title="Connect the CLI"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={() => setCopied(true)}>
            {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
            {copied ? 'Copied' : 'Copy code'}
          </Button>
          <Button size="sm">Open docs</Button>
        </>
      }
    >
      <div className="flex items-center gap-4">
        <QrTile />
        <div className="min-w-0">
          <p className="font-mono text-lg tracking-[0.18em]">QK7-3M9P</p>
          <p className="mt-1 text-[12px] text-muted-foreground tabular-nums">Expires in 09:41</p>
          <Kbd className="mt-3 max-w-full truncate">npx constructive login --device</Kbd>
        </div>
      </div>
    </SinkCard>
  );
}
