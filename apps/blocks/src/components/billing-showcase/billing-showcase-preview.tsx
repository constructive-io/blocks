'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  type Ref
} from 'react';
import {
  Maximize2Icon,
  Minimize2Icon,
  MonitorIcon,
  SmartphoneIcon,
  TabletIcon,
  type LucideIcon
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
  DialogTrigger
} from '@constructive-io/ui/dialog';
import { Field } from '@constructive-io/ui/field';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@constructive-io/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@constructive-io/ui/tooltip';

import { getBillingBlock, type BillingBlockName } from '@/lib/billing-blocks';

import {
  BILLING_SHOWCASE_ACCOUNT_OPTIONS,
  BILLING_SHOWCASE_RESOURCE_STATE_OPTIONS,
  BILLING_SHOWCASE_SETTINGS_STATE_OPTIONS,
  getBillingShowcaseAccount,
  isBillingShowcaseAccountKind,
  isBillingShowcaseResourceState,
  isBillingShowcaseSettingsState,
  type BillingShowcaseAccountKind,
  type BillingShowcaseSettingsState
} from './billing-showcase-resources';

type BillingPreviewViewport = 'desktop' | 'tablet' | 'mobile';

type BillingPreviewViewportOption = {
  icon: LucideIcon;
  label: string;
  value: BillingPreviewViewport;
  width: number;
};

const BILLING_PREVIEW_VIEWPORTS: readonly BillingPreviewViewportOption[] = [
  { icon: MonitorIcon, label: 'Desktop', value: 'desktop', width: 1280 },
  { icon: TabletIcon, label: 'Tablet', value: 'tablet', width: 768 },
  { icon: SmartphoneIcon, label: 'Mobile', value: 'mobile', width: 390 }
];

const DEFAULT_PREVIEW_HEIGHT = 720;
const MINIMUM_PREVIEW_HEIGHT = 480;
const MAXIMUM_PREVIEW_HEIGHT = 960;

function stateBadgeVariant(state: BillingShowcaseSettingsState) {
  if (state === 'ready') return 'success' as const;
  if (state === 'stale' || state === 'estimated') return 'warning' as const;
  if (state === 'error' || state === 'partial') return 'error' as const;
  return 'outline' as const;
}

function viewportOption(value: BillingPreviewViewport) {
  return BILLING_PREVIEW_VIEWPORTS.find((option) => option.value === value)!;
}

function BillingPreviewViewportControls({
  label,
  onChange,
  selectedButtonRef,
  value
}: {
  label: string;
  onChange: (value: BillingPreviewViewport) => void;
  selectedButtonRef?: Ref<HTMLButtonElement>;
  value: BillingPreviewViewport;
}) {
  return (
    <div
      aria-label={label}
      className="inline-flex shrink-0 items-center gap-0.5 rounded-xl bg-muted p-1"
      role="group"
    >
      {BILLING_PREVIEW_VIEWPORTS.map((option) => {
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

function BillingPreviewIframe({
  frameRef,
  height,
  mode,
  name,
  source,
  viewport
}: {
  frameRef?: Ref<HTMLIFrameElement>;
  height: number | string;
  mode: 'full-screen' | 'inline';
  name: BillingBlockName;
  source: string;
  viewport: BillingPreviewViewport;
}) {
  const option = viewportOption(viewport);
  const title = getBillingBlock(name)?.title ?? name;

  return (
    <iframe
      className="mx-auto block shrink-0 rounded-lg border-0 bg-background shadow-sm ring-1 ring-border/60"
      data-preview-viewport={viewport}
      height={height}
      loading="eager"
      ref={frameRef}
      src={source}
      style={{ height, width: option.width }}
      title={`${title} ${mode} live preview`}
      width={option.width}
    />
  );
}

export function BillingShowcasePreview({
  name,
  previewPath = `/blocks/billing/${name}/preview/`
}: {
  name: BillingBlockName;
  previewPath?: string;
}) {
  const accountControlId = useId();
  const stateControlId = useId();
  const inlineFrameRef = useRef<HTMLIFrameElement | null>(null);
  const fullscreenViewportRef = useRef<HTMLButtonElement | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [accountKind, setAccountKind] =
    useState<BillingShowcaseAccountKind>('organization');
  const [resourceState, setResourceState] =
    useState<BillingShowcaseSettingsState>('ready');
  const [viewport, setViewport] =
    useState<BillingPreviewViewport>('desktop');
  const [fullscreen, setFullscreen] = useState(false);
  const [inlineHeight, setInlineHeight] = useState(DEFAULT_PREVIEW_HEIGHT);

  const account = getBillingShowcaseAccount(accountKind);
  const isSettings = name === 'billing-settings-page';
  const stateOptions = isSettings
    ? BILLING_SHOWCASE_SETTINGS_STATE_OPTIONS
    : BILLING_SHOWCASE_RESOURCE_STATE_OPTIONS;
  const selectedStateLabel = stateOptions.find(
    (option) => option.value === resourceState
  )?.label;
  const selectedViewport = viewportOption(viewport);
  const previewSource = `${previewPath}?account=${accountKind}&state=${resourceState}`;

  function disconnectFrameObserver() {
    resizeObserverRef.current?.disconnect();
    resizeObserverRef.current = null;
  }

  useEffect(() => {
    const currentFrame = inlineFrameRef.current;
    if (!currentFrame) return;

    let animationFrame = 0;
    let cancelled = false;

    function connectFrameObserver() {
      if (cancelled || !currentFrame) return;
      const canvas = currentFrame.contentDocument?.querySelector<HTMLElement>(
        '[data-slot="billing-showcase-canvas"]'
      );
      if (!canvas) {
        animationFrame = window.requestAnimationFrame(connectFrameObserver);
        return;
      }

      const measure = () => {
        setInlineHeight(
          Math.min(
            MAXIMUM_PREVIEW_HEIGHT,
            Math.max(
              MINIMUM_PREVIEW_HEIGHT,
              Math.ceil(canvas.getBoundingClientRect().height)
            )
          )
        );
      };

      disconnectFrameObserver();
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
      disconnectFrameObserver();
    };
  }, [previewSource, viewport]);

  function handleAccountChange(value: string) {
    if (!isBillingShowcaseAccountKind(value)) return;
    setAccountKind(value);
  }

  function handleResourceStateChange(value: string) {
    if (isSettings) {
      if (!isBillingShowcaseSettingsState(value)) return;
      setResourceState(value);
      return;
    }

    if (!isBillingShowcaseResourceState(value)) return;
    setResourceState(value);
  }

  return (
    <TooltipProvider delay={300}>
      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <div
          className="registry-block min-w-0"
          data-slot="billing-showcase-preview"
        >
          <div className="registry-block-bar flex-wrap justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span>Live source preview</span>
            </div>

            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <BillingPreviewViewportControls
                label="Inline preview breakpoint"
                onChange={setViewport}
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

          <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:flex-wrap sm:items-end">
            <Field
              className="w-full sm:w-56"
              htmlFor={accountControlId}
              label="Account"
            >
              <Select value={accountKind} onValueChange={handleAccountChange}>
                <SelectTrigger id={accountControlId} size="lg">
                  <SelectValue>
                    {(value: string | null) =>
                      BILLING_SHOWCASE_ACCOUNT_OPTIONS.find(
                        (option) => option.value === value
                      )?.label ?? 'Choose an account'
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {BILLING_SHOWCASE_ACCOUNT_OPTIONS.map((option) => (
                      <SelectItem
                        className="min-h-11 sm:min-h-11"
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <Field
              className="w-full sm:w-56"
              htmlFor={stateControlId}
              label="Resource state"
            >
              <Select
                value={resourceState}
                onValueChange={handleResourceStateChange}
              >
                <SelectTrigger id={stateControlId} size="lg">
                  <SelectValue>
                    {() => selectedStateLabel ?? 'Choose a resource state'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {stateOptions.map((option) => (
                      <SelectItem
                        className="min-h-11 sm:min-h-11"
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <div className="flex flex-wrap gap-2 sm:ms-auto sm:pb-1">
              <Badge variant="secondary">{account.kind}</Badge>
              <Badge variant={stateBadgeVariant(resourceState)}>
                {selectedStateLabel}
              </Badge>
            </div>
          </div>

          <div className="registry-block-stage !block !overflow-auto !p-0">
            <div className="w-max min-w-full p-3 sm:p-5">
              <BillingPreviewIframe
                frameRef={inlineFrameRef}
                height={inlineHeight}
                mode="inline"
                name={name}
                source={previewSource}
                viewport={viewport}
              />
            </div>
          </div>
        </div>

        <DialogPopup
          bottomStickOnMobile={false}
          className="fixed inset-0 h-dvh max-h-dvh w-screen max-w-none translate-y-0 overflow-hidden rounded-none border-0"
          initialFocus={fullscreenViewportRef}
          showCloseButton={false}
        >
          <DialogHeader
            className="flex-row flex-wrap items-center gap-3 border-b p-3"
            style={{
              paddingBlockEnd: 'max(0.75rem, env(safe-area-inset-bottom))',
              paddingBlockStart: 'max(0.75rem, env(safe-area-inset-top))',
              paddingInlineEnd: 'max(0.75rem, env(safe-area-inset-right))',
              paddingInlineStart: 'max(0.75rem, env(safe-area-inset-left))'
            }}
          >
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-balance text-base">
                Live source preview
              </DialogTitle>
              <DialogDescription className="text-pretty text-xs">
                {selectedViewport.label} · {selectedViewport.width} px
              </DialogDescription>
            </div>
            <BillingPreviewViewportControls
              label="Full-screen preview breakpoint"
              onChange={setViewport}
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

          <div
            className="min-h-0 flex-1 overflow-auto bg-background p-3 sm:p-5"
            style={{
              paddingBlockEnd: 'max(0.75rem, env(safe-area-inset-bottom))',
              paddingInlineEnd: 'max(0.75rem, env(safe-area-inset-right))',
              paddingInlineStart: 'max(0.75rem, env(safe-area-inset-left))'
            }}
          >
            <div className="h-full min-h-0 w-max min-w-full">
              <BillingPreviewIframe
                height="100%"
                mode="full-screen"
                name={name}
                source={previewSource}
                viewport={viewport}
              />
            </div>
          </div>
        </DialogPopup>
      </Dialog>
    </TooltipProvider>
  );
}
