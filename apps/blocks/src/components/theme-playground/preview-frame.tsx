'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';

import { Button } from '@constructive-io/ui/button';
import { ButtonGroup, ButtonGroupSeparator } from '@constructive-io/ui/button-group';

import { isPreviewReadyMessage, postPreviewDraft } from '@/lib/theme-playground/channel';
import { encodeDraft } from '@/lib/theme-playground/draft';
import { DEFAULT_WALL, WALLS, type WallId } from '@/lib/theme-playground/walls';
import { withBase } from '@/lib/site';

import { useThemeDraft } from './use-theme-draft';

function previewHref(draft: string, wall: WallId) {
  const wallParam = wall === DEFAULT_WALL ? '' : `&wall=${wall}`;
  return `${withBase('/blocks/create/preview/')}?d=${draft}${wallParam}`;
}

/**
 * The kitchen-sink iframe + live-draft channel + the floating wall switcher.
 *
 * The iframe `src` is computed once at mount — re-rendering it on every draft
 * change would reload the whole document. Subsequent drafts and wall changes
 * ride over postMessage once the frame announces PREVIEW_READY_MESSAGE.
 */
export function PreviewFrame() {
  const { draft, wall, setWall } = useThemeDraft();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [ready, setReady] = useState(false);
  const [src] = useState(() => previewHref(encodeDraft(draft), wall));

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (isPreviewReadyMessage(event, iframeRef.current?.contentWindow)) {
        setReady(true);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    const target = iframeRef.current?.contentWindow;
    if (!ready || !target) return;
    postPreviewDraft(target, draft, wall);
  }, [draft, wall, ready]);

  const openHref = previewHref(encodeDraft(draft), wall);

  return (
    <div className="relative min-h-[60dvh] overflow-hidden rounded-xl border border-border bg-muted/40 min-[861px]:min-h-0">
      <iframe ref={iframeRef} title="Theme preview" src={src} className="size-full" />
      {/* Floating wall switcher: one attached group, so every cell shares the
          frame's edges and the pressed cell can't outgrow a rounded container. */}
      <ButtonGroup aria-label="Preview wall" className="absolute bottom-3 right-3 rounded-md bg-popover shadow-lg">
        {WALLS.map((w) => {
          const active = wall === w.id;
          return (
            <Button
              key={w.id}
              type="button"
              variant="outline"
              size="sm"
              title={w.title}
              aria-label={w.title}
              aria-pressed={active}
              data-pressed={active ? '' : undefined}
              onClick={() => setWall(w.id)}
              className="min-w-10 px-2.5 text-xs font-medium text-muted-foreground tabular-nums aria-pressed:bg-accent aria-pressed:text-foreground dark:aria-pressed:bg-accent"
            >
              {w.label}
            </Button>
          );
        })}
        <ButtonGroupSeparator />
        <Button variant="outline" size="icon-sm" asChild aria-label="Open preview in new tab">
          <a href={openHref} target="_blank" rel="noreferrer">
            <ExternalLink aria-hidden />
          </a>
        </Button>
      </ButtonGroup>
    </div>
  );
}
