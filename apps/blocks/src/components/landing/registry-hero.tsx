'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Check, CircleCheck, Copy, Download, Package } from 'lucide-react';

import { Badge } from '@constructive-io/ui/badge';
import { Button } from '@constructive-io/ui/button';
import { Switch } from '@constructive-io/ui/switch';

import { ConstructiveMark } from '@/components/brand/constructive-mark';

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
          <p className="registry-eyebrow">Constructive Blocks</p>
          <h1 className="registry-display mt-4 text-balance">
            Build the product
            <br />
            <em>on Constructive.</em>
          </h1>
          <p className="mt-4 max-w-[58ch] text-pretty text-[15px] leading-7 text-muted-foreground sm:text-base">
            Editable UI primitives and workflows for auth, organizations, app shells, and schema management.
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <Button asChild size="lg">
              <Link href="/blocks">
                <Download className="size-4" />
                Browse components
              </Link>
            </Button>
            <Button type="button" size="lg" variant="outline" onClick={copyConfig}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? 'Copied' : 'Copy registry config'}
            </Button>
          </div>
          <div className="hero-source-note mt-8">
            <svg
              aria-hidden="true"
              className="hero-source-mark"
              viewBox="0 0 48 48"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              focusable="false"
            >
              <path d="M43 15 24 5 5 15v18l19 10 19-10V15Z" />
              <path className="hero-source-fold" d="m5 15 19 10 19-10M24 25v18" />
              <circle className="hero-source-node" cx="24" cy="25" r="2.25" fill="currentColor" stroke="none" />
            </svg>
            <p className="min-w-0 text-pretty">
              <span className="hero-source-title">Every block becomes your code.</span>
              <span className="hero-source-copy">Copy only what you need, then shape it into your product.</span>
            </p>
          </div>
        </div>

        <div className="hero-visual hidden sm:block" aria-hidden="true" inert>
          <ConstructiveMark className="mark-glow h-auto w-[min(230px,45%)] text-primary" />
          <div className="hero-float-pill hero-float-pill-1">
            <CircleCheck className="size-3.5" />
            Block added
          </div>
          <div className="hero-float-pill hero-float-pill-2">
            <Package className="size-3.5 text-primary" />
            Source copied
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
                <Switch defaultChecked aria-label="Theme included" />
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-medium">Theme</div>
                  <div className="text-[11px] text-muted-foreground">tokens · keyframes</div>
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
