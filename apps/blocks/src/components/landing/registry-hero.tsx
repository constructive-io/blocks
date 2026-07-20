'use client';

import Link from 'next/link';
import { useState } from 'react';
import Image from 'next/image';
import { Check, CircleCheck, Copy, Download, Package } from 'lucide-react';

import { Badge } from '@constructive-io/ui/badge';
import { Button } from '@constructive-io/ui/button';
import { Switch } from '@constructive-io/ui/switch';

import { BASE_PRIMITIVES } from '@/lib/base-primitives';

const REGISTRY_SNIPPET = `{
  "registries": {
    "@constructive": "https://constructive-io.github.io/blocks/r/{name}.json"
  }
}`;

export function RegistryHero() {
  const [copied, setCopied] = useState(false);

  async function copyConfig() {
    try {
      await navigator.clipboard.writeText(REGISTRY_SNIPPET);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="registry-hero">
      <div className="registry-hero-grid">
        <div className="max-w-[600px]">
          <p className="registry-eyebrow">Component registry · dark-first</p>
          <h1 className="registry-display mt-4">
            Blocks that work <em>across</em>
            <br />
            your whole product.
          </h1>
          <p className="mt-4 max-w-[56ch] text-[15px] leading-7 text-muted-foreground sm:text-base">
            A shadcn-compatible registry tuned to a near-black canvas — hairline borders, a single confident accent, and
            tight, deliberate radii. Drop the tokens in, install a block, ship.
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <Button asChild size="lg">
              <Link href="/blocks">
                <Download className="size-4" />
                Install registry
              </Link>
            </Button>
            <Button type="button" size="lg" variant="outline" onClick={copyConfig}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? 'Copied' : 'Copy config'}
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-4 sm:gap-x-8">
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-xl font-semibold tracking-tight">{BASE_PRIMITIVES.length}</span>
              <span className="text-xs text-muted-foreground">components</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-xl font-semibold tracking-tight">2</span>
              <span className="text-xs text-muted-foreground">themes</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-xl font-semibold tracking-tight">OKLCH</span>
              <span className="text-xs text-muted-foreground">color space</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-xl font-semibold tracking-tight">A11y</span>
              <span className="text-xs text-muted-foreground">focus rings</span>
            </div>
          </div>
        </div>

        <div className="hero-visual hidden sm:block" aria-hidden>
          <Image
            src="/constructive.svg"
            alt=""
            width={230}
            height={360}
            className="mark-glow h-auto w-[min(230px,45%)]"
            unoptimized
            priority
          />
          <div className="hero-float-pill hero-float-pill-1">
            <CircleCheck className="size-3.5" />
            Block added
          </div>
          <div className="hero-float-pill hero-float-pill-2">
            <Package className="size-3.5 text-primary" />
            0 extra deps
          </div>
          <div className="hero-iso">
            <div className="hero-blk hero-blk-code">
              <div className="hero-blk-head">
                <span className="hero-blk-dot" />
                <span className="hero-blk-dot" />
                <span className="hero-blk-dot hero-blk-dot-on" />
                <span className="ml-auto font-mono">terminal</span>
              </div>
              <div className="hero-blk-body font-mono text-xs leading-7">
                <div>
                  <span className="text-muted-foreground">$</span>{' '}
                  <span className="text-primary">pnpm</span> dlx shadcn add{' '}
                  <span className="text-emerald-500">@constructive/button</span>
                </div>
                <div className="text-muted-foreground">resolving dependencies</div>
                <div>
                  <span className="text-emerald-500">✓</span>{' '}
                  <span className="text-muted-foreground">added to</span> components/ui
                </div>
              </div>
            </div>
            <div className="hero-blk hero-blk-ui">
              <div className="hero-blk-head">
                <span className="hero-blk-dot hero-blk-dot-on" />
                <span className="ml-auto font-mono">button.tsx</span>
              </div>
              <div className="hero-blk-body flex flex-wrap items-center gap-2">
                <Button size="sm">Primary</Button>
                <Button size="sm" variant="outline">
                  Outline
                </Button>
                <Badge variant="success">
                  <span className="size-1.5 rounded-full bg-current" />
                  Stable
                </Badge>
              </div>
            </div>
            <div className="hero-blk hero-blk-chip">
              <div className="hero-blk-body flex items-center gap-3 py-1">
                <Switch defaultChecked aria-label="Auto-sync" />
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-medium">Auto-sync</div>
                  <div className="text-[11px] text-muted-foreground">tokens · live</div>
                </div>
                <div className="flex">
                  <span className="inline-flex size-[26px] items-center justify-center rounded-full border border-border bg-secondary text-[10px] font-semibold">
                    JL
                  </span>
                  <span className="-ml-2 inline-flex size-[26px] items-center justify-center rounded-full border-2 border-card bg-primary text-[10px] font-semibold text-primary-foreground">
                    CB
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
