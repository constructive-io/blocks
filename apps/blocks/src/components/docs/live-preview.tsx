'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type Ref,
} from 'react';
import {
  ExternalLinkIcon,
  Maximize2Icon,
  Minimize2Icon,
  MonitorIcon,
  RotateCwIcon,
  SmartphoneIcon,
  TabletIcon,
  type LucideIcon,
} from 'lucide-react';

import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from '@constructive-io/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@constructive-io/ui/tooltip';

import { cn } from '@/lib/utils';

export type LivePreviewViewport = 'desktop' | 'tablet' | 'mobile';

type ViewportOption = Readonly<{ icon: LucideIcon; label: string; value: LivePreviewViewport; width: number }>;

const VIEWPORTS: readonly ViewportOption[] = [
  { icon: MonitorIcon, label: 'Desktop', value: 'desktop', width: 1280 },
  { icon: TabletIcon, label: 'Tablet', value: 'tablet', width: 768 },
  { icon: SmartphoneIcon, label: 'Mobile', value: 'mobile', width: 390 },
];

/** Narrowest width the resize handle allows. */
const MIN_CUSTOM_WIDTH = 320;
const MIN_FULLSCREEN_HEIGHT = 480;
/** Hides the loading veil even if the frame's load event was missed (e.g. it loaded before hydration). */
const LOAD_FALLBACK_MS = 4000;

/** Measures the rendered height of an element inside the (same-origin) frame. */
export type LivePreviewAutoHeight = Readonly<{ selector: string; min: number; max?: number; initial: number }>;

function viewportOption(value: LivePreviewViewport) {
  return VIEWPORTS.find((option) => option.value === value)!;
}

function viewportForWidth(width: number): LivePreviewViewport {
  if (width < 560) return 'mobile';
  if (width < 960) return 'tablet';
  return 'desktop';
}

function contentBox(element: HTMLElement) {
  const styles = window.getComputedStyle(element);
  const inline = (Number.parseFloat(styles.paddingLeft) || 0) + (Number.parseFloat(styles.paddingRight) || 0);
  const block = (Number.parseFloat(styles.paddingTop) || 0) + (Number.parseFloat(styles.paddingBottom) || 0);
  return { width: Math.max(0, element.clientWidth - inline), height: Math.max(0, element.clientHeight - block) };
}

/** Content-box size of an element, kept current with a ResizeObserver. */
function useContentBox(element: HTMLElement | null) {
  const [box, setBox] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    if (!element) return;
    const update = () => setBox(contentBox(element));
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);
  return box;
}

/** Follows the height of `selector` inside the frame so auto-height previews never scroll twice. */
function useFrameContentHeight(frame: HTMLIFrameElement | null, autoHeight: LivePreviewAutoHeight | undefined) {
  const [height, setHeight] = useState(autoHeight?.initial ?? 0);
  const selector = autoHeight?.selector;
  const min = autoHeight?.min ?? 0;
  const max = autoHeight?.max ?? Number.POSITIVE_INFINITY;

  useEffect(() => {
    if (!frame || !selector) return;
    let animationFrame = 0;
    let observer: ResizeObserver | undefined;
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      const target = frame.contentDocument?.querySelector<HTMLElement>(selector);
      if (!target) {
        animationFrame = window.requestAnimationFrame(connect);
        return;
      }
      // Layout sizes (not getBoundingClientRect), so the frame's own scale never feeds back into the height.
      const measure = () =>
        setHeight(Math.min(max, Math.max(min, Math.ceil(Math.max(target.scrollHeight, target.offsetHeight)))));
      observer?.disconnect();
      measure();
      if (typeof ResizeObserver === 'undefined') return;
      observer = new ResizeObserver(measure);
      observer.observe(target);
    };

    frame.addEventListener('load', connect);
    connect();
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(animationFrame);
      frame.removeEventListener('load', connect);
      observer?.disconnect();
    };
  }, [frame, max, min, selector]);

  return height;
}

const iconButtonClass = cn(
  'relative grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-muted-foreground outline-none',
  'hover:bg-overlay-hover hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50',
  'transition-transform duration-(--duration-fast) ease-out motion-safe:active:scale-[0.96]',
  "before:absolute before:-inset-1 before:content-[''] pointer-coarse:size-10 [&_svg]:size-4",
);

function ToolbarTip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function ViewportSwitch({
  label,
  value,
  custom,
  onChange,
  selectedButtonRef,
}: {
  label: string;
  value: LivePreviewViewport;
  custom: boolean;
  onChange: (value: LivePreviewViewport) => void;
  selectedButtonRef?: Ref<HTMLButtonElement>;
}) {
  return (
    <div
      aria-label={label}
      className="inline-flex shrink-0 items-center gap-0.5 rounded-[10px] bg-muted p-0.5"
      data-slot="live-preview-viewports"
      role="group"
    >
      {VIEWPORTS.map((option) => {
        const Icon = option.icon;
        const selected = !custom && option.value === value;
        return (
          <ToolbarTip key={option.value} label={`${option.label} · ${option.width} px`}>
            <button
              aria-label={`${option.label} preview, ${option.width} pixels`}
              aria-pressed={selected}
              className={cn(
                'grid h-7 w-8 cursor-pointer place-items-center rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                'transition-transform duration-(--duration-fast) ease-out motion-safe:active:scale-[0.96] pointer-coarse:h-9 pointer-coarse:w-10',
                selected ? 'bg-card text-foreground shadow-card' : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => onChange(option.value)}
              ref={selected ? selectedButtonRef : undefined}
              type="button"
            >
              <Icon aria-hidden="true" className="size-4" />
            </button>
          </ToolbarTip>
        );
      })}
    </div>
  );
}

function LoadingVeil({ visible }: { visible: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 z-10 flex flex-col gap-3 bg-background p-5 transition-opacity duration-(--duration-slow) ease-out motion-reduce:transition-none',
        visible ? 'opacity-100' : 'opacity-0',
      )}
    >
      <div className="flex items-center gap-2">
        <span className="size-6 rounded-md bg-muted motion-safe:animate-pulse" />
        <span className="h-3 w-28 rounded-full bg-muted motion-safe:animate-pulse" />
        <span className="ml-auto h-6 w-16 rounded-md bg-muted motion-safe:animate-pulse" />
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,10rem)_1fr] gap-3">
        <div className="flex flex-col gap-2">
          {[70, 55, 80, 50, 65].map((width) => (
            <span key={width} className="h-3 rounded-full bg-muted motion-safe:animate-pulse" style={{ width: `${width}%` }} />
          ))}
        </div>
        <div className="rounded-xl bg-muted/60 motion-safe:animate-pulse" />
      </div>
    </div>
  );
}

type FrameProps = {
  src: string;
  name: string;
  mode: 'inline' | 'full-screen';
  viewport: LivePreviewViewport;
  width: number;
  height: number;
  scale: number;
  resizing: boolean;
  frameRef?: Ref<HTMLIFrameElement>;
  slot: string;
};

/**
 * The device frame: a card on the canvas holding the iframe at its logical
 * width, scaled down (never up) to fit. Size changes glide unless the person
 * is dragging the resize handle.
 */
function PreviewFrame({ src, name, mode, viewport, width, height, scale, resizing, frameRef, slot }: FrameProps) {
  const [loaded, setLoaded] = useState(false);
  const innerRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    setLoaded(false);
    const frame = innerRef.current;
    if (frame?.contentDocument?.readyState === 'complete' && frame.contentDocument.URL !== 'about:blank') setLoaded(true);
    const timer = window.setTimeout(() => setLoaded(true), LOAD_FALLBACK_MS);
    return () => window.clearTimeout(timer);
  }, [src]);

  const setRefs = useCallback(
    (element: HTMLIFrameElement | null) => {
      innerRef.current = element;
      if (typeof frameRef === 'function') frameRef(element);
      else if (frameRef) (frameRef as { current: HTMLIFrameElement | null }).current = element;
    },
    [frameRef],
  );

  const glide = resizing ? 'none' : undefined;
  const frameStyle: CSSProperties = {
    width,
    height,
    transform: scale === 1 ? undefined : `scale(${scale})`,
    transformOrigin: 'top left',
    transition: glide,
  };

  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-xl bg-background shadow-card-lg',
        'transition-[width,height] duration-(--duration-slow) ease-(--ease-out) motion-reduce:transition-none',
        '[&>iframe]:transition-transform [&>iframe]:duration-(--duration-slow) [&>iframe]:ease-(--ease-out) motion-reduce:[&>iframe]:transition-none',
      )}
      data-preview-scale={scale.toFixed(3)}
      data-slot={slot}
      style={{ width: Math.round(width * scale), height: Math.round(height * scale), transition: glide }}
    >
      <iframe
        className="absolute left-0 top-0 block border-0 bg-background"
        data-preview-viewport={viewport}
        height={height}
        loading="eager"
        onLoad={() => setLoaded(true)}
        ref={setRefs}
        src={src}
        style={frameStyle}
        title={`${name} ${mode} live preview`}
        width={width}
      />
      <LoadingVeil visible={!loaded} />
    </div>
  );
}

/**
 * Drag handle on the frame's right edge for arbitrary widths. The frame is
 * centered, so the width grows by twice the pointer travel.
 */
function ResizeHandle({
  width,
  max,
  onResize,
  onReset,
  onResizingChange,
}: {
  width: number;
  max: number;
  onResize: (width: number) => void;
  onReset: () => void;
  onResizingChange: (resizing: boolean) => void;
}) {
  const start = useRef<{ x: number; width: number } | null>(null);
  const clamp = (value: number) => Math.round(Math.min(max, Math.max(MIN_CUSTOM_WIDTH, value)));

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    start.current = { x: event.clientX, width };
    onResizingChange(true);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!start.current) return;
    onResize(clamp(start.current.width + (event.clientX - start.current.x) * 2));
  };
  const onPointerUp = () => {
    start.current = null;
    onResizingChange(false);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 64 : 16;
    const next = { ArrowLeft: width - step, ArrowRight: width + step, Home: MIN_CUSTOM_WIDTH, End: max }[event.key];
    if (next !== undefined) {
      event.preventDefault();
      onResize(clamp(next));
    } else if (event.key === 'Enter' || event.key === 'Escape') {
      event.preventDefault();
      onReset();
    }
  };

  return (
    <div
      aria-label="Resize preview width"
      aria-orientation="vertical"
      aria-valuemax={max}
      aria-valuemin={MIN_CUSTOM_WIDTH}
      aria-valuenow={width}
      aria-valuetext={`${width} pixels`}
      className="group/handle hidden w-5 shrink-0 cursor-ew-resize touch-none select-none items-center justify-center self-stretch outline-none pointer-fine:flex"
      data-slot="live-preview-resize"
      onDoubleClick={onReset}
      onKeyDown={onKeyDown}
      onPointerCancel={onPointerUp}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      role="separator"
      tabIndex={0}
      title="Drag to resize · double-click to reset"
    >
      <span className="h-10 w-1 rounded-full bg-foreground/15 group-hover/handle:bg-primary group-focus-visible/handle:bg-primary group-focus-visible/handle:ring-[3px] group-focus-visible/handle:ring-ring/50 group-active/handle:bg-primary" />
    </div>
  );
}

/** Matches `.registry-block-stage`: the agent-canvas dot grid on a lightly muted ground. */
const CANVAS_STYLE: CSSProperties = {
  backgroundColor: 'color-mix(in oklch, var(--muted) 35%, var(--background))',
  backgroundImage: 'radial-gradient(circle, color-mix(in oklab, var(--foreground) 7%, transparent) 1px, transparent 1.2px)',
  backgroundSize: '16px 16px',
};

type StageProps = {
  src: string;
  name: string;
  mode: 'inline' | 'full-screen';
  viewport: LivePreviewViewport;
  customWidth: number | null;
  onCustomWidth: (width: number | null) => void;
  height: number | ((available: number) => number);
  frameRef?: Ref<HTMLIFrameElement>;
  stageRef?: (element: HTMLDivElement | null) => void;
  onScale?: (scale: number) => void;
  frameSlot: string;
  className?: string;
  style?: CSSProperties;
};

function PreviewStage({
  src,
  name,
  mode,
  viewport,
  customWidth,
  onCustomWidth,
  height,
  frameRef,
  stageRef,
  onScale,
  frameSlot,
  className,
  style,
}: StageProps) {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const [resizing, setResizing] = useState(false);
  const box = useContentBox(element);
  /** Room left for the frame once the resize handle takes its column. */
  const available = Math.max(0, box.width - 40);
  const width = customWidth ?? viewportOption(viewport).width;
  const scale = available > 0 ? Math.min(1, available / width) : 1;
  /** Full-screen frames fill the stage height at their scaled size. */
  const frameHeight = typeof height === 'function' ? height(box.height / scale) : height;

  useEffect(() => onScale?.(scale), [onScale, scale]);

  return (
    <div
      className={cn('relative flex w-full min-w-0 justify-center overflow-y-auto overflow-x-hidden p-3 sm:p-5', className)}
      data-slot="live-preview-stage"
      ref={(node) => {
        setElement(node);
        stageRef?.(node);
      }}
      style={{ ...CANVAS_STYLE, ...style }}
    >
      <div className="flex min-w-0 items-start">
        <span aria-hidden="true" className="hidden w-5 shrink-0 pointer-fine:block" />
        <PreviewFrame
          frameRef={frameRef}
          height={frameHeight}
          mode={mode}
          name={name}
          resizing={resizing}
          scale={scale}
          slot={frameSlot}
          src={src}
          viewport={viewport}
          width={width}
        />
        <ResizeHandle
          max={Math.max(MIN_CUSTOM_WIDTH, Math.floor(available))}
          onReset={() => onCustomWidth(null)}
          onResize={onCustomWidth}
          onResizingChange={setResizing}
          width={Math.round(width * scale)}
        />
      </div>
      {resizing ? <div aria-hidden="true" className="fixed inset-0 z-50 cursor-ew-resize" /> : null}
    </div>
  );
}

function Readout({ width, scale, custom }: { width: number; scale: number; custom: boolean }) {
  return (
    <span className="hidden items-center gap-1.5 text-xs text-muted-foreground tabular-nums sm:inline-flex" data-slot="live-preview-readout">
      {custom ? <span className="text-foreground">Custom</span> : null}
      <span>{width} px</span>
      {scale < 1 ? <span className="rounded-md bg-muted px-1.5 py-0.5">{Math.round(scale * 100)}%</span> : null}
    </span>
  );
}

export type LivePreviewProps = {
  /** Base for frame titles: "{name} inline live preview". */
  name: string;
  src: string;
  /** Toolbar label. */
  label?: string;
  /** Full-screen dialog title. Defaults to "{name} preview". */
  fullscreenTitle?: string;
  /** Fixed logical height, or follow an element inside the frame. */
  height: number | LivePreviewAutoHeight;
  defaultViewport?: LivePreviewViewport;
  /** Picks the viewport from the available width until the person chooses one. */
  responsive?: boolean;
  /** Chips beside the label, e.g. ownership or state badges. */
  meta?: ReactNode;
  /** Fixture controls rendered in a row under the toolbar. */
  controls?: ReactNode;
  slot: string;
  frameSlot: string;
};

/**
 * Shared shell for live iframe previews: toolbar with viewport switch,
 * size readout, reload, open in a new tab, and full screen; optional fixture
 * controls; and a dotted canvas stage with a resizable device frame that
 * scales to fit on any screen.
 */
export function LivePreview({
  name,
  src,
  label = 'Live source preview',
  fullscreenTitle,
  height,
  defaultViewport = 'desktop',
  responsive = false,
  meta,
  controls,
  slot,
  frameSlot,
}: LivePreviewProps) {
  const [viewport, setViewport] = useState<LivePreviewViewport>(defaultViewport);
  const [customWidth, setCustomWidth] = useState<number | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [inlineFrame, setInlineFrame] = useState<HTMLIFrameElement | null>(null);
  const [inlineScale, setInlineScale] = useState(1);
  const [fullscreenScale, setFullscreenScale] = useState(1);
  const manual = useRef(!responsive);
  const inlineStage = useRef<HTMLDivElement | null>(null);
  const fullscreenViewportRef = useRef<HTMLButtonElement | null>(null);

  const autoHeight = typeof height === 'number' ? undefined : height;
  const measuredHeight = useFrameContentHeight(inlineFrame, autoHeight);
  const inlineHeight = typeof height === 'number' ? height : measuredHeight;
  const option = viewportOption(viewport);
  const width = customWidth ?? option.width;
  const frameSrc = reloadKey ? `${src}${src.includes('?') ? '&' : '?'}reload=${reloadKey}` : src;

  useLayoutEffect(() => {
    const stage = inlineStage.current;
    if (!stage || !responsive) return;
    const update = () => {
      const available = contentBox(stage).width;
      if (!manual.current && available > 0) setViewport(viewportForWidth(available));
    };
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [responsive]);

  const chooseViewport = (value: LivePreviewViewport) => {
    manual.current = true;
    setCustomWidth(null);
    setViewport(value);
  };
  const resize = (value: number | null) => {
    manual.current = true;
    setCustomWidth(value);
  };

  const actions = (
    <>
      <ToolbarTip label="Reload preview">
        <button aria-label="Reload preview" className={iconButtonClass} onClick={() => setReloadKey((key) => key + 1)} type="button">
          <RotateCwIcon aria-hidden="true" />
        </button>
      </ToolbarTip>
      <ToolbarTip label="Open in a new tab">
        <a aria-label="Open preview in a new tab" className={iconButtonClass} href={src} rel="noopener" target="_blank">
          <ExternalLinkIcon aria-hidden="true" />
        </a>
      </ToolbarTip>
    </>
  );

  return (
    <TooltipProvider delay={400}>
      <Dialog onOpenChange={setFullscreen} open={fullscreen}>
        <section aria-label={`${name} live preview`} className="registry-block min-w-0 [overflow-anchor:none]" data-slot={slot}>
          <div className="registry-block-bar flex-wrap justify-between gap-y-2" data-slot="live-preview-toolbar">
            <div className="flex min-w-0 items-center gap-2">
              <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-success shadow-[0_0_0_3px_color-mix(in_oklab,var(--success)_18%,transparent)]" />
              <span className="truncate">{label}</span>
              {meta ? <span className="hidden min-w-0 items-center gap-1.5 sm:flex">{meta}</span> : null}
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <Readout custom={customWidth !== null} scale={inlineScale} width={width} />
              <ViewportSwitch
                custom={customWidth !== null}
                label="Inline preview breakpoint"
                onChange={chooseViewport}
                value={viewport}
              />
              <span aria-hidden="true" className="mx-0.5 hidden h-5 w-px bg-border sm:block" />
              <div className="flex items-center">
                <span className="hidden items-center sm:flex">{actions}</span>
                <ToolbarTip label="Open full screen">
                  <DialogTrigger asChild>
                    <button aria-label="Open full-screen preview" className={iconButtonClass} type="button">
                      <Maximize2Icon aria-hidden="true" />
                    </button>
                  </DialogTrigger>
                </ToolbarTip>
              </div>
            </div>
          </div>

          {controls ? (
            <div
              className="flex flex-col gap-3 border-b border-border bg-muted/20 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-end sm:px-5"
              data-slot="live-preview-controls"
            >
              {controls}
            </div>
          ) : null}

          <PreviewStage
            customWidth={customWidth}
            frameRef={setInlineFrame}
            frameSlot={frameSlot}
            height={inlineHeight}
            mode="inline"
            name={name}
            onCustomWidth={resize}
            onScale={setInlineScale}
            src={frameSrc}
            stageRef={(node) => {
              inlineStage.current = node;
            }}
            viewport={viewport}
          />
        </section>

        <DialogPopup
          bottomStickOnMobile={false}
          className="fixed inset-0 flex h-dvh max-h-dvh w-screen max-w-none translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 p-0"
          initialFocus={fullscreenViewportRef}
          showCloseButton={false}
        >
          <div
            className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-card"
            data-slot="live-preview-toolbar"
            style={{
              paddingBlock: '0.625rem',
              paddingBlockStart: 'max(0.625rem, env(safe-area-inset-top))',
              paddingInlineEnd: 'max(0.75rem, env(safe-area-inset-right))',
              paddingInlineStart: 'max(1rem, env(safe-area-inset-left))',
            }}
          >
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-sm font-medium">{fullscreenTitle ?? `${name} preview`}</DialogTitle>
              <DialogDescription className="text-xs tabular-nums">
                {customWidth !== null ? 'Custom' : option.label} · {width} px
                {fullscreenScale < 1 ? ` · ${Math.round(fullscreenScale * 100)}%` : ''}
              </DialogDescription>
            </div>
            <ViewportSwitch
              custom={customWidth !== null}
              label="Full-screen preview breakpoint"
              onChange={chooseViewport}
              selectedButtonRef={fullscreenViewportRef}
              value={viewport}
            />
            <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-border" />
            <div className="flex items-center">
              {actions}
              <ToolbarTip label="Exit full screen">
                <DialogClose asChild>
                  <button aria-label="Exit full screen" className={iconButtonClass} type="button">
                    <Minimize2Icon aria-hidden="true" />
                  </button>
                </DialogClose>
              </ToolbarTip>
            </div>
          </div>
          <PreviewStage
            className="min-h-0 flex-1"
            customWidth={customWidth}
            frameSlot={frameSlot}
            height={(available) => Math.max(MIN_FULLSCREEN_HEIGHT, available)}
            mode="full-screen"
            name={name}
            onCustomWidth={resize}
            onScale={setFullscreenScale}
            src={frameSrc}
            style={{
              paddingBlockEnd: 'max(1rem, env(safe-area-inset-bottom))',
              paddingInlineEnd: 'max(0.75rem, env(safe-area-inset-right))',
              paddingInlineStart: 'max(0.75rem, env(safe-area-inset-left))',
            }}
            viewport={viewport}
          />
        </DialogPopup>
      </Dialog>
    </TooltipProvider>
  );
}
