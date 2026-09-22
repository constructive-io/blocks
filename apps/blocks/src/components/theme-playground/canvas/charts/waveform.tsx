'use client';

import { useEffect, useRef } from 'react';

import { cn } from '@/lib/utils';

/** Deterministic per-bar jitter so the stream looks organic but stable. */
function seed(index: number): number {
  const x = Math.sin(index * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const clamp = (v: number) => Math.min(1, Math.max(0.05, v));

/**
 * Synthetic "statements per second" sample — layered sines plus a slowly
 * drifting seeded component. Deterministic per absolute tick.
 */
function sample(tick: number): number {
  const t = tick / 30;
  const w =
    0.45 + 0.28 * Math.sin(t * 0.9) + 0.16 * Math.sin(t * 2.3 + 1.7) + 0.12 * (seed(Math.floor(tick / 4)) - 0.5);
  return clamp(w);
}

/**
 * Animated canvas waveform (live-stream archetype, synthetic data only).
 * - `active` animates bars: `static` mirrors bars around the centre,
 *   `scrolling` pushes history right-to-left.
 * - `processing` (while inactive) renders a gentle centred sine pulse.
 * - Neither fades the last data to a dotted idle baseline over ~0.5 s.
 * The rAF loop pauses while `document.hidden`; `prefers-reduced-motion`
 * renders a single static frame. Bar color = computed `color`.
 */
export function Waveform({
  active = false,
  processing = false,
  mode = 'scrolling',
  barWidth = 3,
  barGap = 2,
  historySize = 120,
  label,
  className,
}: {
  active?: boolean;
  processing?: boolean;
  mode?: 'static' | 'scrolling';
  barWidth?: number;
  barGap?: number;
  historySize?: number;
  label?: string;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<number[]>([]);
  const staticBarsRef = useRef<number[]>([]);
  const lastActiveRef = useRef<number[]>([]);
  const blendRef = useRef(0);
  const fadeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;
    let tick = 0;
    let time = 0;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width === 0 || height === 0) return;
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      context.fillStyle = getComputedStyle(canvas).color;

      const step = barWidth + barGap;
      const centerY = height / 2;
      const data = mode === 'static' ? staticBarsRef.current : historyRef.current;
      for (let i = 0; i < data.length; i++) {
        const value = data[i] ?? 0.05;
        const x = mode === 'static' ? i * step : width - (data.length - i) * step;
        const barHeight = Math.max(3, value * height * 0.8);
        context.globalAlpha = 0.4 + value * 0.6;
        context.beginPath();
        context.roundRect(x, centerY - barHeight / 2, barWidth, barHeight, barWidth / 2);
        context.fill();
      }
      context.globalAlpha = 1;
    };

    /** Advance the synthetic data one frame. */
    const stepData = () => {
      tick += 1;
      const width = canvas.clientWidth || 200;
      const count = Math.floor((width + barGap) / (barWidth + barGap));

      if (active) {
        fadeRef.current = 0;
        blendRef.current = Math.min(1, blendRef.current + 0.05);
        if (mode === 'static') {
          // Symmetric bars around the centre, animated by tick.
          const bars: number[] = [];
          for (let i = 0; i < count; i++) {
            const m = Math.min(i, count - 1 - i);
            const w =
              0.45 +
              0.3 * Math.sin(m * 0.55 + tick * 0.045) +
              0.18 * Math.sin(m * 1.7 - tick * 0.07) +
              0.12 * (seed(m) - 0.5);
            bars.push(clamp(w));
          }
          staticBarsRef.current = bars;
          lastActiveRef.current = bars;
        } else {
          // History pushed right-to-left.
          const history = historyRef.current;
          history.push(sample(tick));
          if (history.length > historySize) history.shift();
          lastActiveRef.current = [...history];
        }
        return;
      }

      if (processing) {
        fadeRef.current = 0;
        blendRef.current = Math.min(1, blendRef.current + 0.02);
        time += 0.03;
        // Gentle centred sine pulse for the processing state.
        const bars: number[] = [];
        const half = count / 2;
        for (let i = 0; i < count; i++) {
          const pos = mode === 'static' ? (i - half) / half : i;
          const weight = 1 - Math.abs(mode === 'static' ? pos : (i - half) / half) * 0.4;
          const wave =
            Math.sin(time * 1.5 + pos * (mode === 'static' ? 3 : 0.15)) * 0.25 +
            Math.sin(time * 0.8 - pos * (mode === 'static' ? 2 : 0.1)) * 0.2 +
            Math.cos(time * 2 + pos * (mode === 'static' ? 1 : 0.05)) * 0.15;
          let value = (0.2 + wave) * weight;
          const last = lastActiveRef.current;
          if (last.length > 0 && blendRef.current < 1) {
            const li = mode === 'static' ? Math.min(i, last.length - 1) : Math.floor((i / count) * last.length);
            value = (last[li] || 0) * (1 - blendRef.current) + value * blendRef.current;
          }
          bars.push(clamp(value));
        }
        if (mode === 'static') staticBarsRef.current = bars;
        else historyRef.current = bars.slice(-historySize);
        return;
      }

      // Idle: fade the last data to the baseline over ~0.5 s.
      const data = mode === 'static' ? staticBarsRef.current : historyRef.current;
      if (data.length === 0) return;
      blendRef.current = 0;
      fadeRef.current += 0.03;
      if (fadeRef.current < 1) {
        const faded = data.map((v) => v * (1 - fadeRef.current));
        if (mode === 'static') staticBarsRef.current = faded;
        else historyRef.current = faded;
      } else {
        staticBarsRef.current = [];
        historyRef.current = [];
      }
    };

    const loop = () => {
      stepData();
      draw();
      frame = requestAnimationFrame(loop);
    };
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
      } else {
        loop();
      }
    };

    if (reduced) {
      stepData();
      draw();
      return;
    }
    loop();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [active, processing, mode, barWidth, barGap, historySize]);

  return (
    <div className={cn('relative w-full', className)}>
      {label ? <span className="sr-only">{label}</span> : null}
      {!active && !processing ? (
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-dotted border-muted-foreground/20" />
      ) : null}
      <canvas ref={canvasRef} aria-hidden className="block h-full w-full" />
    </div>
  );
}
