'use client';

import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from 'react';
import {
  Maximize2Icon,
  Minimize2Icon,
  MonitorIcon,
  SmartphoneIcon,
  TabletIcon,
  type LucideIcon,
} from 'lucide-react';

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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@constructive-io/ui/tooltip';

import type { ApplicationBlockDoc } from '@/lib/application-blocks';
import { cn } from '@/lib/utils';

type PreviewViewport = 'desktop' | 'tablet' | 'mobile';

type PreviewViewportOption = Readonly<{
  icon: LucideIcon;
  label: string;
  value: PreviewViewport;
  width: number;
}>;

const PREVIEW_VIEWPORTS: readonly PreviewViewportOption[] = [
  { icon: MonitorIcon, label: 'Desktop', value: 'desktop', width: 1280 },
  { icon: TabletIcon, label: 'Tablet', value: 'tablet', width: 768 },
  { icon: SmartphoneIcon, label: 'Mobile', value: 'mobile', width: 390 },
];

function viewportOption(value: PreviewViewport) {
  return PREVIEW_VIEWPORTS.find((option) => option.value === value)!;
}

function contentBoxWidth(element: HTMLElement) {
  const styles = window.getComputedStyle(element);
  const inlinePadding =
    (Number.parseFloat(styles.paddingLeft) || 0) +
    (Number.parseFloat(styles.paddingRight) || 0);
  return Math.max(0, element.clientWidth - inlinePadding);
}

function previewViewportForWidth(width: number): PreviewViewport {
  if (width < 560) return 'mobile';
  if (width < 960) return 'tablet';
  return 'desktop';
}

function usePreviewScale(
  measureRef: { current: HTMLElement | null },
  viewportWidth: number,
) {
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const element = measureRef.current;
    if (!element) return;

    const update = () => {
      const availableWidth = contentBoxWidth(element);
      setScale(
        availableWidth > 0
          ? Math.min(1, availableWidth / viewportWidth)
          : 1,
      );
    };

    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [measureRef, viewportWidth]);

  return scale;
}

function ViewportControls({
  label,
  onChange,
  selectedButtonRef,
  value,
}: {
  label: string;
  onChange: (value: PreviewViewport) => void;
  selectedButtonRef?: Ref<HTMLButtonElement>;
  value: PreviewViewport;
}) {
  return (
    <div
      aria-label={label}
      className="inline-flex shrink-0 items-center gap-0.5 rounded-xl bg-muted p-1"
      role="group"
    >
      {PREVIEW_VIEWPORTS.map((option) => {
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

function PreviewFrame({
  block,
  mode,
  scale,
  source,
  viewport,
}: {
  block: ApplicationBlockDoc;
  mode: 'full-screen' | 'inline';
  scale: number;
  source: string;
  viewport: PreviewViewport;
}) {
  const option = viewportOption(viewport);
  const layoutWidth = option.width * scale;
  const layoutHeight = block.previewHeight * scale;
  const frameStyle: CSSProperties = {
    width: option.width,
    height: block.previewHeight,
    transform: scale === 1 ? undefined : `scale(${scale})`,
    transformOrigin: 'top left',
  };

  return (
    <div
      className="relative mx-auto shrink-0 overflow-hidden rounded-lg shadow-sm ring-1 ring-border/60"
      data-preview-scale={scale.toFixed(3)}
      data-slot="application-block-preview-frame"
      style={{ width: layoutWidth, height: layoutHeight }}
    >
      <iframe
        className="block border-0 bg-background"
        data-preview-viewport={viewport}
        height={block.previewHeight}
        loading="eager"
        src={source}
        style={frameStyle}
        title={`${block.title} ${mode} live preview`}
        width={option.width}
      />
    </div>
  );
}

function PreviewStage({
  children,
  className,
  measureRef,
  style,
}: {
  children: ReactNode;
  className?: string;
  measureRef: Ref<HTMLDivElement>;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn(
        'flex w-full min-w-0 justify-center overflow-x-hidden overflow-y-auto p-3 sm:p-5',
        className,
      )}
      data-slot="application-block-preview-stage"
      ref={measureRef}
      style={style}
    >
      {children}
    </div>
  );
}

export function ApplicationBlockShowcasePreview({
  block,
  previewPath,
}: {
  block: ApplicationBlockDoc;
  previewPath: string;
}) {
  const inlineStageRef = useRef<HTMLDivElement | null>(null);
  const fullscreenStageRef = useRef<HTMLDivElement | null>(null);
  const fullscreenViewportRef = useRef<HTMLButtonElement | null>(null);
  const viewportSelectionRef = useRef<'responsive' | 'manual'>('responsive');
  const [fullscreen, setFullscreen] = useState(false);
  const [viewport, setViewport] = useState<PreviewViewport>('desktop');
  const selectedViewport = viewportOption(viewport);
  const inlineScale = usePreviewScale(
    inlineStageRef,
    selectedViewport.width,
  );
  const fullscreenScale = usePreviewScale(
    fullscreenStageRef,
    selectedViewport.width,
  );

  useLayoutEffect(() => {
    const stage = inlineStageRef.current;
    if (!stage) return;

    const update = () => {
      if (viewportSelectionRef.current === 'manual') return;
      setViewport(previewViewportForWidth(contentBoxWidth(stage)));
    };

    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  function handleViewportChange(value: PreviewViewport) {
    viewportSelectionRef.current = 'manual';
    setViewport(value);
  }

  return (
    <TooltipProvider delay={300}>
      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <div
          className="registry-block min-w-0"
          data-slot="application-block-showcase-preview"
        >
          <div className="registry-block-bar flex-wrap justify-between">
            <span>Live source preview</span>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Badge variant="secondary">Host-controlled</Badge>
              <ViewportControls
                label="Inline preview breakpoint"
                onChange={handleViewportChange}
                value={viewport}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <DialogTrigger asChild>
                    <Button
                      aria-label="Open full-screen preview"
                      size="icon"
                      variant="outline"
                    >
                      <Maximize2Icon data-icon="only" />
                    </Button>
                  </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent>Open full screen</TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div className="registry-block-stage !block !overflow-hidden !p-0">
            <PreviewStage measureRef={inlineStageRef}>
              <PreviewFrame
                block={block}
                mode="inline"
                scale={inlineScale}
                source={previewPath}
                viewport={viewport}
              />
            </PreviewStage>
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
                {block.title} preview
              </DialogTitle>
              <DialogDescription className="text-pretty text-xs">
                {selectedViewport.label} · {selectedViewport.width} px
              </DialogDescription>
            </div>
            <ViewportControls
              label="Full-screen preview breakpoint"
              onChange={handleViewportChange}
              selectedButtonRef={fullscreenViewportRef}
              value={viewport}
            />
            <DialogClose asChild>
              <Button
                aria-label="Exit full screen"
                size="icon"
                title="Exit full screen"
                variant="outline"
              >
                <Minimize2Icon data-icon="only" />
              </Button>
            </DialogClose>
          </DialogHeader>

          <PreviewStage
            className="min-h-0 flex-1 bg-background"
            measureRef={fullscreenStageRef}
            style={{
              paddingBlockEnd: 'max(0.75rem, env(safe-area-inset-bottom))',
              paddingInlineEnd: 'max(0.75rem, env(safe-area-inset-right))',
              paddingInlineStart: 'max(0.75rem, env(safe-area-inset-left))',
            }}
          >
            <PreviewFrame
              block={block}
              mode="full-screen"
              scale={fullscreenScale}
              source={previewPath}
              viewport={viewport}
            />
          </PreviewStage>
        </DialogPopup>
      </Dialog>
    </TooltipProvider>
  );
}
