'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type Ref } from 'react';
import { Maximize2Icon, Minimize2Icon, MonitorIcon, SmartphoneIcon, TabletIcon, type LucideIcon } from 'lucide-react';

import { Badge } from '@constructive-io/ui/badge';
import { Button } from '@constructive-io/ui/button';
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogHeader,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from '@constructive-io/ui/dialog';
import { Field } from '@constructive-io/ui/field';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@constructive-io/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@constructive-io/ui/tooltip';

import { getFeaturePackDoc, type FeaturePackDocId } from '@/lib/feature-packs';
import { cn } from '@/lib/utils';

import {
  FEATURE_PACK_SHOWCASE_STATE_OPTIONS,
  getDefaultFeaturePackShowcaseVariant,
  getFeaturePackShowcaseVariants,
  isFeaturePackShowcaseState,
  isFeaturePackShowcaseVariant,
  type FeaturePackShowcaseState,
} from './feature-pack-showcase-resources';

type FeaturePackPreviewViewport = 'desktop' | 'tablet' | 'mobile';

type FeaturePackPreviewViewportOption = Readonly<{
  icon: LucideIcon;
  label: string;
  value: FeaturePackPreviewViewport;
  width: number;
}>;

const FEATURE_PACK_PREVIEW_VIEWPORTS: readonly FeaturePackPreviewViewportOption[] = [
  { icon: MonitorIcon, label: 'Desktop', value: 'desktop', width: 1280 },
  { icon: TabletIcon, label: 'Tablet', value: 'tablet', width: 768 },
  { icon: SmartphoneIcon, label: 'Mobile', value: 'mobile', width: 390 },
];

const MINIMUM_INLINE_PREVIEW_HEIGHT = 320;
const MINIMUM_PREVIEW_HEIGHT = 480;

function previewHeight(pack: FeaturePackDocId) {
  if (pack === 'data') return 840;
  if (pack === 'billing') return 920;
  if (pack === 'users' || pack === 'organizations' || pack === 'storage') {
    return 800;
  }
  if (pack === 'auth') return 760;
  return 720;
}

function stateBadgeVariant(state: FeaturePackShowcaseState) {
  if (state === 'ready') return 'success' as const;
  if (state === 'error') return 'error' as const;
  return 'outline' as const;
}

function viewportOption(value: FeaturePackPreviewViewport) {
  return FEATURE_PACK_PREVIEW_VIEWPORTS.find((option) => option.value === value)!;
}

function fitScale(availableWidth: number, viewportWidth: number) {
  if (availableWidth <= 0 || viewportWidth <= 0) return 1;
  return Math.min(1, availableWidth / viewportWidth);
}

function contentBoxWidth(element: HTMLElement) {
  const styles = window.getComputedStyle(element);
  const paddingInline = (Number.parseFloat(styles.paddingLeft) || 0) + (Number.parseFloat(styles.paddingRight) || 0);
  return Math.max(0, element.clientWidth - paddingInline);
}

function usePreviewFitScale(measureRef: { current: HTMLElement | null }, viewportWidth: number) {
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const element = measureRef.current;
    if (!element) return;

    const update = () => {
      setScale(fitScale(contentBoxWidth(element), viewportWidth));
    };

    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [measureRef, viewportWidth]);

  return scale;
}

function FeaturePackPreviewViewportControls({
  label,
  onChange,
  selectedButtonRef,
  value,
}: {
  label: string;
  onChange: (value: FeaturePackPreviewViewport) => void;
  selectedButtonRef?: Ref<HTMLButtonElement>;
  value: FeaturePackPreviewViewport;
}) {
  return (
    <div aria-label={label} className="inline-flex shrink-0 items-center gap-0.5 rounded-xl bg-muted p-1" role="group">
      {FEATURE_PACK_PREVIEW_VIEWPORTS.map((option) => {
        const Icon = option.icon;
        const selected = option.value === value;

        return (
          <Tooltip key={option.value}>
            <TooltipTrigger asChild>
              <Button
                aria-label={`${option.label} preview, ${option.width} pixels`}
                aria-pressed={selected}
                onClick={() => onChange(option.value)}
                ref={selected ? selectedButtonRef : undefined}
                size="icon"
                variant={selected ? 'secondary' : 'ghost'}
              >
                <Icon data-icon="only" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {option.label} · {option.width} px
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

function FeaturePackPreviewIframe({
  frameRef,
  height,
  mode,
  pack,
  scale,
  source,
  viewport,
}: {
  frameRef?: Ref<HTMLIFrameElement>;
  height: number;
  mode: 'full-screen' | 'inline';
  pack: FeaturePackDocId;
  scale: number;
  source: string;
  viewport: FeaturePackPreviewViewport;
}) {
  const option = viewportOption(viewport);
  const title = getFeaturePackDoc(pack)?.title ?? pack;
  const layoutWidth = option.width * scale;
  const layoutHeight = height * scale;
  const frameStyle: CSSProperties = {
    width: option.width,
    height,
    transform: scale === 1 ? undefined : `scale(${scale})`,
    transformOrigin: 'top left',
  };

  return (
    <div
      className="relative mx-auto shrink-0 overflow-hidden rounded-lg shadow-sm ring-1 ring-border/60"
      data-preview-scale={scale.toFixed(3)}
      data-slot="feature-pack-preview-frame"
      style={{ width: layoutWidth, height: layoutHeight }}
    >
      <iframe
        className="block border-0 bg-background"
        data-preview-viewport={viewport}
        height={height}
        loading="eager"
        ref={frameRef}
        src={source}
        style={frameStyle}
        title={`${title} feature pack ${mode} live preview`}
        width={option.width}
      />
    </div>
  );
}

function FeaturePackPreviewStage({
  children,
  className,
  measureRef,
  style,
}: {
  children: ReactNode;
  className?: string;
  measureRef?: Ref<HTMLDivElement>;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn('flex w-full min-w-0 justify-center overflow-x-hidden overflow-y-auto p-3 sm:p-5', className)}
      data-slot="feature-pack-preview-stage"
      ref={measureRef}
      style={style}
    >
      {children}
    </div>
  );
}

export function FeaturePackShowcasePreview({
  pack,
  previewPath = `/blocks/features/${pack}/preview/`,
}: {
  pack: FeaturePackDocId;
  previewPath?: string;
}) {
  const variantControlId = useId();
  const stateControlId = useId();
  const inlineFrameRef = useRef<HTMLIFrameElement | null>(null);
  const inlineStageRef = useRef<HTMLDivElement | null>(null);
  const fullscreenStageRef = useRef<HTMLDivElement | null>(null);
  const fullscreenViewportRef = useRef<HTMLButtonElement | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const variants = getFeaturePackShowcaseVariants(pack);
  const [variant, setVariant] = useState(getDefaultFeaturePackShowcaseVariant(pack));
  const [resourceState, setResourceState] = useState<FeaturePackShowcaseState>('ready');
  const [viewport, setViewport] = useState<FeaturePackPreviewViewport>('desktop');
  const [fullscreen, setFullscreen] = useState(false);
  const [inlineHeight, setInlineHeight] = useState(() => previewHeight(pack));
  const [fullscreenHeight, setFullscreenHeight] = useState(previewHeight(pack));
  const selectedViewport = viewportOption(viewport);
  const selectedVariant = variants.find((option) => option.value === variant);
  const selectedState = FEATURE_PACK_SHOWCASE_STATE_OPTIONS.find((option) => option.value === resourceState);
  const entryView = pack === 'auth' && variant !== 'account';
  const previewSource = `${previewPath}?variant=${encodeURIComponent(variant)}&state=${resourceState}`;
  const inlineScale = usePreviewFitScale(inlineStageRef, selectedViewport.width);
  const fullscreenScale = usePreviewFitScale(fullscreenStageRef, selectedViewport.width);

  useEffect(() => {
    const currentFrame = inlineFrameRef.current;
    if (!currentFrame) return;

    let animationFrame = 0;
    let cancelled = false;

    function connectFrameObserver() {
      if (cancelled || !currentFrame) return;
      const canvas = currentFrame.contentDocument?.querySelector<HTMLElement>(
        '[data-slot="feature-pack-showcase-canvas"]',
      );
      if (!canvas) {
        animationFrame = window.requestAnimationFrame(connectFrameObserver);
        return;
      }

      const measure = () => {
        setInlineHeight(
          Math.max(
            MINIMUM_INLINE_PREVIEW_HEIGHT,
            Math.ceil(Math.max(canvas.scrollHeight, canvas.offsetHeight)),
          ),
        );
      };

      resizeObserverRef.current?.disconnect();
      measure();
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(measure);
      observer.observe(canvas);
      resizeObserverRef.current = observer;
    }

    currentFrame.addEventListener('load', connectFrameObserver);
    connectFrameObserver();

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(animationFrame);
      currentFrame.removeEventListener('load', connectFrameObserver);
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
    };
  }, [previewSource]);

  useLayoutEffect(() => {
    if (!fullscreen) return;
    const stage = fullscreenStageRef.current;
    if (!stage) return;

    const update = () => {
      const styles = window.getComputedStyle(stage);
      const paddingBlock = (Number.parseFloat(styles.paddingTop) || 0) + (Number.parseFloat(styles.paddingBottom) || 0);
      setFullscreenHeight(Math.max(MINIMUM_PREVIEW_HEIGHT, stage.clientHeight - paddingBlock));
    };

    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [fullscreen, viewport]);

  function handleVariantChange(value: string) {
    if (!isFeaturePackShowcaseVariant(pack, value)) return;
    setVariant(value);
    if (pack === 'auth' && value !== 'account') setResourceState('ready');
  }

  function handleResourceStateChange(value: string) {
    if (!isFeaturePackShowcaseState(value)) return;
    setResourceState(value);
  }

  return (
    <TooltipProvider delay={300}>
      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <div className="registry-block min-w-0" data-slot="feature-pack-showcase-preview">
          <div className="registry-block-bar flex-wrap justify-between">
            <span>Live source preview</span>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <FeaturePackPreviewViewportControls
                label="Inline preview breakpoint"
                onChange={setViewport}
                value={viewport}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <DialogTrigger asChild>
                    <Button aria-label="Open full-screen preview" size="icon" variant="outline">
                      <Maximize2Icon data-icon="only" />
                    </Button>
                  </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent>Open full screen</TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:flex-wrap sm:items-end">
            {variants.length > 1 ? (
              <Field className="w-full sm:w-56" htmlFor={variantControlId} label={pack === 'auth' ? 'View' : 'Account'}>
                <Select value={variant} onValueChange={handleVariantChange}>
                  <SelectTrigger id={variantControlId} size="lg">
                    <SelectValue>{() => selectedVariant?.label ?? 'Choose an example'}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {variants.map((option) => (
                        <SelectItem className="min-h-11 sm:min-h-11" key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            ) : null}

            {!entryView ? (
              <Field className="w-full sm:w-56" htmlFor={stateControlId} label="Resource state">
                <Select value={resourceState} onValueChange={handleResourceStateChange}>
                  <SelectTrigger id={stateControlId} size="lg">
                    <SelectValue>{() => selectedState?.label ?? 'Choose a resource state'}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {FEATURE_PACK_SHOWCASE_STATE_OPTIONS.map((option) => (
                        <SelectItem className="min-h-11 sm:min-h-11" key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            ) : null}

            <div className="flex flex-wrap gap-2 sm:ms-auto sm:pb-1">
              <Badge variant="secondary">{selectedVariant?.label}</Badge>
              {!entryView ? <Badge variant={stateBadgeVariant(resourceState)}>{selectedState?.label}</Badge> : null}
            </div>
          </div>

          <div className="registry-block-stage !block !overflow-hidden !p-0">
            <FeaturePackPreviewStage measureRef={inlineStageRef}>
              <FeaturePackPreviewIframe
                frameRef={inlineFrameRef}
                height={inlineHeight}
                mode="inline"
                pack={pack}
                scale={inlineScale}
                source={previewSource}
                viewport={viewport}
              />
            </FeaturePackPreviewStage>
          </div>
        </div>

        <DialogPopup
          bottomStickOnMobile={false}
          className="fixed inset-0 flex h-dvh max-h-dvh w-screen max-w-none translate-y-0 flex-col overflow-hidden rounded-none border-0"
          initialFocus={fullscreenViewportRef}
          showCloseButton={false}
        >
          <DialogHeader
            className="flex-row flex-wrap items-center gap-3 border-b p-3"
            style={{
              paddingBlockEnd: 'max(0.75rem, env(safe-area-inset-bottom))',
              paddingBlockStart: 'max(0.75rem, env(safe-area-inset-top))',
              paddingInlineEnd: 'max(0.75rem, env(safe-area-inset-right))',
              paddingInlineStart: 'max(0.75rem, env(safe-area-inset-left))',
            }}
          >
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-balance text-base">
                {getFeaturePackDoc(pack)?.title} feature pack preview
              </DialogTitle>
              <DialogDescription className="text-pretty text-xs">
                {selectedViewport.label} · {selectedViewport.width} px
              </DialogDescription>
            </div>
            <FeaturePackPreviewViewportControls
              label="Full-screen preview breakpoint"
              onChange={setViewport}
              selectedButtonRef={fullscreenViewportRef}
              value={viewport}
            />
            <DialogClose asChild>
              <Button aria-label="Exit full screen" size="icon" title="Exit full screen" variant="outline">
                <Minimize2Icon data-icon="only" />
              </Button>
            </DialogClose>
          </DialogHeader>

          <FeaturePackPreviewStage
            className="min-h-0 flex-1 bg-background"
            measureRef={fullscreenStageRef}
            style={{
              paddingBlockEnd: 'max(0.75rem, env(safe-area-inset-bottom))',
              paddingInlineEnd: 'max(0.75rem, env(safe-area-inset-right))',
              paddingInlineStart: 'max(0.75rem, env(safe-area-inset-left))',
            }}
          >
            <FeaturePackPreviewIframe
              height={fullscreenHeight}
              mode="full-screen"
              pack={pack}
              scale={fullscreenScale}
              source={previewSource}
              viewport={viewport}
            />
          </FeaturePackPreviewStage>
        </DialogPopup>
      </Dialog>
    </TooltipProvider>
  );
}
