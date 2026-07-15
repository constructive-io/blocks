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
  fitViewOptions?: FitViewOptions;
}

const BUTTON_CLASS =
  'text-muted-foreground/80 hover:text-muted-foreground bg-card size-10 rounded-none shadow-none first:rounded-s-lg last:rounded-e-lg focus-visible:z-10';

export function FlowZoomPanel({
  className,
  position = 'bottom-right',
  fitViewIcon = <RiFocus3Line className='size-5' aria-hidden='true' />,
  fitViewOptions,
}: FlowZoomPanelProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  const onFitView = useCallback(() => {
    fitView(fitViewOptions);
  }, [fitView, fitViewOptions]);

  return (
    <Panel
      data-slot='flow-zoom-panel'
      position={position}
      className={cn('inline-flex -space-x-px rounded-md shadow-xs rtl:space-x-reverse', className)}
    >
      <Button variant='outline' size='icon' className={BUTTON_CLASS} onClick={() => zoomIn()} aria-label='Zoom in'>
        <RiAddLine className='size-5' aria-hidden='true' />
      </Button>
      <Button variant='outline' size='icon' className={BUTTON_CLASS} onClick={() => zoomOut()} aria-label='Zoom out'>
        <RiSubtractLine className='size-5' aria-hidden='true' />
      </Button>
      <Button variant='outline' size='icon' className={BUTTON_CLASS} onClick={onFitView} aria-label='Fit view'>
        {fitViewIcon}
      </Button>
    </Panel>
  );
}
