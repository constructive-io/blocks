'use client';

import { useCallback } from 'react';
import { Panel, useReactFlow, type PanelPosition, type FitViewOptions } from '@xyflow/react';
import { RiAddLine, RiFocus3Line, RiSubtractLine } from '@remixicon/react';

import { cn } from '../lib/utils';
import { Button } from './button';

interface FlowZoomPanelProps {
  className?: string;
  position?: PanelPosition;
  fitViewIcon?: React.ReactNode;
  /** Options for the fit-view button. `minZoom` defaults to 0.05 so a wide graph fits instead of stopping at the flow's own minimum. */
  fitViewOptions?: FitViewOptions;
  /** Accessible names for the three buttons, for translated UIs. Default: English. */
  labels?: { zoomIn?: string; zoomOut?: string; fitView?: string };
}

/** React Flow's own `minZoom` (0.5) would leave a wide graph clipped after "fit", so fitting may zoom further out. */
const DEFAULT_FIT_VIEW_OPTIONS: FitViewOptions = { minZoom: 0.05 };

const BUTTON_CLASS =
  'text-muted-foreground/80 hover:text-muted-foreground bg-card size-10 rounded-none shadow-none first:rounded-s-lg last:rounded-e-lg focus-visible:z-10';

export function FlowZoomPanel({
  className,
  position = 'bottom-right',
  fitViewIcon = <RiFocus3Line className='size-5' aria-hidden='true' />,
  fitViewOptions,
  labels,
}: FlowZoomPanelProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  const onFitView = useCallback(() => {
    fitView({ ...DEFAULT_FIT_VIEW_OPTIONS, ...fitViewOptions });
  }, [fitView, fitViewOptions]);

  return (
    <Panel
      data-slot='flow-zoom-panel'
      position={position}
      className={cn('inline-flex -space-x-px rounded-md shadow-xs rtl:space-x-reverse', className)}
    >
      <Button variant='outline' size='icon' className={BUTTON_CLASS} onClick={() => zoomIn()} aria-label={labels?.zoomIn ?? 'Zoom in'}>
        <RiAddLine className='size-5' aria-hidden='true' />
      </Button>
      <Button variant='outline' size='icon' className={BUTTON_CLASS} onClick={() => zoomOut()} aria-label={labels?.zoomOut ?? 'Zoom out'}>
        <RiSubtractLine className='size-5' aria-hidden='true' />
      </Button>
      <Button variant='outline' size='icon' className={BUTTON_CLASS} onClick={onFitView} aria-label={labels?.fitView ?? 'Fit view'}>
        {fitViewIcon}
      </Button>
    </Panel>
  );
}
