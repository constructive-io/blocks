'use client';

import { useState } from 'react';
import { Bot, Check, Copy } from 'lucide-react';

import { getThemePreset, themePresetRegistryName } from '@constructive-io/ui/theme-presets';
import { Button } from '@constructive-io/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogTitle,
} from '@constructive-io/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@constructive-io/ui/tabs';

import { CodeBlock } from '@/components/docs/code-block';
import { InstallToggle } from '@/components/docs/install-toggle';
import { packageCommands, REGISTRY_COMPONENTS_JSON, registryCommands } from '@/lib/install-mode';
import { buildRegistryItem, buildThemeCss, DEFAULT_DRAFT } from '@/lib/theme-playground/draft';

import { useThemeDraft } from './use-theme-draft';

const EMPTY_NOTE = 'You’re on the default Constructive theme — nothing to override.';

function EmptyNote() {
  return (
    <p className="rounded-xl border border-border bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
      {EMPTY_NOTE}
    </p>
  );
}

export function GetCodeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { draft } = useThemeDraft();
  const [tab, setTab] = useState('css');
  const [copied, setCopied] = useState(false);
  const css = buildThemeCss(draft);
  const item = buildRegistryItem(draft);
  const fontChanged = draft.font !== DEFAULT_DRAFT.font;

  // A preset is installable by name only when the draft is the preset exactly —
  // no released pins and every shared knob still at the default.
  const presetExact =
    draft.theme !== null &&
    draft.released.light.length === 0 &&
    draft.released.dark.length === 0 &&
    draft.radius === DEFAULT_DRAFT.radius &&
    draft.hairline === DEFAULT_DRAFT.hairline &&
    draft.elevation === DEFAULT_DRAFT.elevation &&
    draft.fontSans === DEFAULT_DRAFT.fontSans &&
    JSON.stringify(draft.tiers) === JSON.stringify(DEFAULT_DRAFT.tiers);

  const presetAdd = presetExact
    ? `pnpm dlx shadcn@latest add @constructive/${themePresetRegistryName(draft.theme!)}`
    : null;
  const presetSnippet = presetAdd ? `${REGISTRY_COMPONENTS_JSON}\n\n${presetAdd}` : null;
  const customScript = item
    ? `cat > constructive-theme.json <<'JSON'\n${JSON.stringify(item, null, 2)}\nJSON\npnpm dlx shadcn@latest add ./constructive-theme.json && rm constructive-theme.json`
    : null;
  const installCode = presetSnippet ?? customScript;

  const agentPrompt = presetExact
    ? `Install the ${getThemePreset(draft.theme!).label} theme into my shadcn/Tailwind v4 project.
1. Add the @constructive registry to components.json:
   "registries": { "@constructive": "https://constructive-io.github.io/blocks/r/{name}.json" }
2. Run: ${presetAdd} -y
3. Confirm the CSS file referenced by components.json declares --primary, --background and --chart-1 in both :root and .dark.`
    : item
      ? `Install this theme into my shadcn/Tailwind v4 project.
1. Save the JSON below as constructive-theme.json next to components.json.
2. Run: pnpm dlx shadcn@latest add ./constructive-theme.json -y
3. Delete constructive-theme.json.
4. Confirm the CSS file referenced by components.json declares --primary, --background and --chart-1 in both :root and .dark.

${JSON.stringify(item, null, 2)}`
      : null;

  const copyText = tab === 'css' ? css : installCode;

  async function copy(value: string | null) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Get code</DialogTitle>
          <DialogDescription>Copy the CSS, or install it straight into a shadcn project.</DialogDescription>
        </DialogHeader>

        <DialogPanel>
          <Tabs value={tab} onValueChange={setTab} className="min-h-0">
            <TabsList>
              <TabsTrigger value="css">CSS</TabsTrigger>
              <TabsTrigger value="install">Install</TabsTrigger>
            </TabsList>

            <TabsContent value="css" className="pt-2">
              {css ? <CodeBlock>{css}</CodeBlock> : <EmptyNote />}
            </TabsContent>

            <TabsContent value="install" className="flex flex-col gap-3 pt-2">
              {installCode ? (
                <>
                  <CodeBlock>{installCode}</CodeBlock>
                  <p className="text-pretty text-[13px] leading-5 text-muted-foreground">
                    shadcn merges the theme&rsquo;s variables into your globals.css (
                    <code className="rounded bg-muted px-1 font-mono text-[12px]">:root</code> and{' '}
                    <code className="rounded bg-muted px-1 font-mono text-[12px]">.dark</code>) and overwrites existing
                    values — confirm the prompt or pass{' '}
                    <code className="rounded bg-muted px-1 font-mono text-[12px]">-y</code>.
                  </p>
                </>
              ) : (
                <EmptyNote />
              )}
              {agentPrompt ? (
                <Button type="button" variant="outline" className="self-start" onClick={() => copy(agentPrompt)}>
                  <Bot data-icon="inline-start" aria-hidden />
                  Copy prompt for your agent
                </Button>
              ) : null}
              <div className="flex flex-col gap-3 border-t border-border pt-3">
                <p className="text-[11px] font-medium tracking-wide text-subtle-foreground uppercase">
                  Don&rsquo;t have the base theme yet?
                </p>
                <InstallToggle
                  npm={packageCommands({ globals: true })}
                  registry={registryCommands({ item: 'constructive-theme', includeConfig: true })}
                  descriptions={{
                    npm: 'Install the package theme, then apply this theme on top.',
                    registry: 'Install the theme into your source tree, then apply this theme on top.',
                  }}
                />
                {fontChanged ? (
                  <p className="text-pretty text-[13px] leading-5 text-muted-foreground">
                    Heads up: in registry mode{' '}
                    <code className="rounded bg-muted px-1 font-mono text-[12px]">--font-sans</code> lives in the{' '}
                    <code className="rounded bg-muted px-1 font-mono text-[12px]">@theme inline</code> block shadcn
                    generated — move your font override there, or load the font and point the variable at it.
                  </p>
                ) : null}
              </div>
            </TabsContent>
          </Tabs>
        </DialogPanel>

        <DialogFooter>
          <Button type="button" onClick={() => copy(copyText)} disabled={!copyText}>
            {copied ? <Check data-icon="inline-start" aria-hidden /> : <Copy data-icon="inline-start" aria-hidden />}
            {copied ? 'Copied' : tab === 'css' ? 'Copy CSS' : 'Copy install command'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
