'use client';

import { useEffect, useState } from 'react';

import {
  CARD_SHADOW_UTILITIES,
  COLOR_TOKEN_GROUPS,
  FONT_TOKENS,
  RADIUS_TOKENS,
  SHADOW_TOKENS,
  Z_INDEX_TOKENS,
  type ColorToken,
  type TokenGroup,
} from '@/lib/theme-tokens';
import { cn } from '@/lib/utils';

function useResolvedCssVar(cssVar: string) {
  const [value, setValue] = useState<string>('');

  useEffect(() => {
    const read = () => {
      const raw = getComputedStyle(document.documentElement).getPropertyValue(`--${cssVar}`).trim();
      setValue(raw);
    };
    read();

    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-theme'],
    });

    return () => observer.disconnect();
  }, [cssVar]);

  return value;
}

function ColorSwatch({ token }: { token: ColorToken }) {
  const resolved = useResolvedCssVar(token.cssVar);

  return (
    <li className="group flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-background/50">
      <div
        className={cn(
          'relative h-16 w-full border-b border-border',
          token.bgClass ?? '',
        )}
        style={token.bgClass ? undefined : { background: `var(--${token.cssVar})` }}
        aria-hidden
      >
        {/* Checker for near-transparent / light tokens on dark pages */}
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
          style={{
            backgroundImage:
              'linear-gradient(45deg, color-mix(in oklch, var(--muted-foreground) 12%, transparent) 25%, transparent 25%), linear-gradient(-45deg, color-mix(in oklch, var(--muted-foreground) 12%, transparent) 25%, transparent 25%)',
            backgroundSize: '10px 10px',
            backgroundPosition: '0 0, 5px 0',
          }}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1 p-2.5">
        <div className="flex min-w-0 items-baseline justify-between gap-2">
          <code className="truncate font-mono text-[12px] font-medium text-foreground">--{token.cssVar}</code>
          {token.bgClass ? (
            <code className="shrink-0 font-mono text-[10.5px] text-muted-foreground">{token.bgClass}</code>
          ) : null}
        </div>
        <p className="text-pretty text-[11.5px] leading-4 text-muted-foreground">{token.description}</p>
        {resolved ? (
          <p className="mt-0.5 truncate font-mono text-[10px] tabular-nums text-muted-foreground/90" title={resolved}>
            {resolved}
          </p>
        ) : (
          <p className="mt-0.5 h-3.5 font-mono text-[10px] text-transparent">…</p>
        )}
      </div>
    </li>
  );
}

function ColorGroup({ group }: { group: TokenGroup }) {
  return (
    <section aria-labelledby={`color-${group.id}`} className="min-w-0">
      <div className="mb-3">
        <h3 id={`color-${group.id}`} className="text-sm font-semibold tracking-tight">
          {group.title}
        </h3>
        <p className="mt-0.5 text-pretty text-xs leading-5 text-muted-foreground">{group.description}</p>
      </div>
      <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {group.tokens.map((token) => (
          <ColorSwatch key={token.cssVar} token={token} />
        ))}
      </ul>
    </section>
  );
}

export function ColorTokenGallery() {
  return (
    <div className="flex flex-col gap-8">
      {COLOR_TOKEN_GROUPS.map((group) => (
        <ColorGroup key={group.id} group={group} />
      ))}
    </div>
  );
}

export function RadiusScale() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {RADIUS_TOKENS.map((token) => (
        <li
          key={token.name}
          className="flex items-center gap-3 rounded-lg border border-border bg-background/50 p-3"
        >
          <div
            className={cn(
              'size-12 shrink-0 border border-border bg-primary/80',
              token.className,
            )}
            aria-hidden
          />
          <div className="min-w-0">
            <code className="block font-mono text-[12px] font-medium">--{token.cssVar}</code>
            <code className="mt-0.5 block font-mono text-[10.5px] text-muted-foreground">{token.className}</code>
            <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground/90">{token.note}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ShadowScale() {
  return (
    <div className="flex flex-col gap-5">
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SHADOW_TOKENS.map((token) => (
          <li
            key={token.name}
            className="flex flex-col items-center gap-2.5 rounded-lg border border-border bg-muted/20 p-4"
          >
            <div
              className={cn('size-14 rounded-lg border border-border bg-card', token.className)}
              aria-hidden
            />
            <code className="font-mono text-[11.5px] font-medium">{token.name}</code>
          </li>
        ))}
      </ul>

      <div>
        <p className="mb-2.5 text-xs text-muted-foreground">
          Card elevation utilities (package-specific, not Tailwind defaults):
        </p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {CARD_SHADOW_UTILITIES.map((token) => (
            <li
              key={token.name}
              className="flex items-center gap-3 rounded-lg border border-border bg-background p-4"
            >
              <div className={cn('size-14 shrink-0 rounded-xl bg-card', token.className)} aria-hidden />
              <div className="min-w-0">
                <code className="font-mono text-[12px] font-medium">.{token.name}</code>
                <p className="mt-1 text-pretty text-[11.5px] leading-4 text-muted-foreground">
                  {token.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function FontScale() {
  return (
    <ul className="flex flex-col gap-2.5">
      {FONT_TOKENS.map((token) => (
        <li key={token.name} className="rounded-lg border border-border bg-background/50 p-3.5">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <code className="font-mono text-[12px] font-medium">--{token.cssVar}</code>
            <code className="font-mono text-[10.5px] text-muted-foreground">{token.className}</code>
          </div>
          <p
            className={cn('text-[15px] leading-7 text-foreground', token.name !== 'font-serif' && token.className)}
            style={token.name === 'font-serif' ? { fontFamily: 'var(--font-serif)' } : undefined}
          >
            {token.sample}
          </p>
          <p className="mt-1.5 text-[11.5px] text-muted-foreground">{token.description}</p>
        </li>
      ))}
    </ul>
  );
}

export function ZIndexScale() {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[28rem] text-left text-sm">
        <thead className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-2.5 font-medium">Token</th>
            <th className="px-3 py-2.5 font-medium">Value</th>
            <th className="px-3 py-2.5 font-medium">Use</th>
          </tr>
        </thead>
        <tbody>
          {Z_INDEX_TOKENS.map((token) => (
            <tr key={token.name} className="border-b border-border last:border-0">
              <td className="px-3 py-2.5">
                <code className="font-mono text-[12px]">--{token.name}</code>
              </td>
              <td className="px-3 py-2.5 font-mono text-[12px] tabular-nums text-muted-foreground">
                {token.value}
              </td>
              <td className="px-3 py-2.5 text-[13px] text-muted-foreground">{token.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Pair samples: surface + foreground for quick contrast checks */
export function ContrastPairs() {
  const pairs = [
    { bg: 'bg-background', fg: 'text-foreground', label: 'background / foreground' },
    { bg: 'bg-primary', fg: 'text-primary-foreground', label: 'primary / primary-foreground' },
    { bg: 'bg-secondary', fg: 'text-secondary-foreground', label: 'secondary / secondary-foreground' },
    { bg: 'bg-muted', fg: 'text-muted-foreground', label: 'muted / muted-foreground' },
    { bg: 'bg-accent', fg: 'text-accent-foreground', label: 'accent / accent-foreground' },
    { bg: 'bg-destructive', fg: 'text-destructive-foreground', label: 'destructive / destructive-foreground' },
    { bg: 'bg-card', fg: 'text-card-foreground', label: 'card / card-foreground' },
    { bg: 'bg-popover', fg: 'text-popover-foreground', label: 'popover / popover-foreground' },
  ] as const;

  return (
    <ul className="grid gap-2.5 sm:grid-cols-2">
      {pairs.map((pair) => (
        <li
          key={pair.label}
          className={cn(
            'flex min-h-16 flex-col justify-center rounded-lg border border-border px-3.5 py-3',
            pair.bg,
            pair.fg,
          )}
        >
          <span className="text-sm font-medium">Aa Bb Cc 123</span>
          <code className="mt-1 font-mono text-[10.5px] opacity-80">{pair.label}</code>
        </li>
      ))}
    </ul>
  );
}
