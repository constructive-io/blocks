'use client';

import * as React from 'react';
import { Slot } from '../lib/slot';

import { cn } from '../lib/utils';
import { Label } from './label';

type FormControlLayout = 'stacked' | 'floating';

interface FormControlProps {
  children: React.ReactElement;
  label: string;
  id?: string;
  layout?: FormControlLayout;
  error?: string;
  className?: string;
}

function FormControl({ children, label, id, layout = 'stacked', error, className }: FormControlProps) {
  const generatedId = React.useId();
  const inputId = id || generatedId;
  const errorId = error ? `${inputId}-error` : undefined;

  const childProps: Record<string, unknown> = {
    id: inputId,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': errorId,
  };

  if (layout === 'floating') {
    childProps.placeholder = ' ';
  }

  const childWithProps = React.cloneElement(children, childProps);

  if (layout === 'floating') {
    return (
      <div className={cn('min-w-0 space-y-1', className)}>
        <div
          className={cn(
            'relative',
            // Float label when focused
            'has-[input:focus-visible]:[&_[data-slot=form-control-label]]:translate-y-0',
            'has-[input:focus-visible]:[&_[data-slot=form-control-label]]:scale-[0.7]',
            'has-[input:focus-visible]:[&_[data-slot=form-control-label]]:max-w-[calc((100%-1.5rem)/0.7)]',
            'has-[input:focus-visible]:[&_[data-slot=form-control-label]]:text-link',
            'has-[textarea:focus-visible]:[&_[data-slot=form-control-label]]:translate-y-0',
            'has-[textarea:focus-visible]:[&_[data-slot=form-control-label]]:scale-[0.7]',
            'has-[textarea:focus-visible]:[&_[data-slot=form-control-label]]:max-w-[calc((100%-1.5rem)/0.7)]',
            'has-[textarea:focus-visible]:[&_[data-slot=form-control-label]]:text-link',
            // Float label when there's a value
            'has-[input:not(:placeholder-shown)]:[&_[data-slot=form-control-label]]:translate-y-0',
            'has-[input:not(:placeholder-shown)]:[&_[data-slot=form-control-label]]:scale-[0.7]',
            'has-[input:not(:placeholder-shown)]:[&_[data-slot=form-control-label]]:max-w-[calc((100%-1.5rem)/0.7)]',
            'has-[textarea:not(:placeholder-shown)]:[&_[data-slot=form-control-label]]:translate-y-0',
            'has-[textarea:not(:placeholder-shown)]:[&_[data-slot=form-control-label]]:scale-[0.7]',
            'has-[textarea:not(:placeholder-shown)]:[&_[data-slot=form-control-label]]:max-w-[calc((100%-1.5rem)/0.7)]',
            // Error
            error && 'has-[input:focus-visible]:[&_[data-slot=form-control-label]]:text-destructive',
            error && 'has-[textarea:focus-visible]:[&_[data-slot=form-control-label]]:text-destructive',
          )}
        >
          <Slot
            className={cn(
              error && 'border-destructive focus-visible:ring-destructive/20',
            )}
          >
            {childWithProps}
          </Slot>
          <Label
            htmlFor={inputId}
            data-slot="form-control-label"
            className={cn(
              // Base: centered when empty; one line, so a long label ends in an ellipsis instead of wrapping over the value
              'pointer-events-none absolute start-3 top-2 max-w-[calc(100%-1.5rem)] translate-y-[0.45rem]',
              // Small, subtle typography; the origin follows the text direction so the floated label stays at the start edge
              'origin-left rtl:origin-right text-[0.8125rem] leading-none font-normal text-muted-foreground/60 select-none',
              // Snappy transition
              'transition-[transform,color] duration-(--duration-slow) ease-out motion-reduce:transition-none',
              // Error state
              error && 'text-destructive',
            )}
          >
            {/* `block truncate` keeps the label to one line; `dir="auto"` makes the ellipsis fall at the end of the text. */}
            <span dir='auto' className='block truncate'>
              {label}
            </span>
          </Label>
        </div>
        {error && (
          <p id={errorId} className='text-destructive text-xs [overflow-wrap:anywhere]' role='alert'>
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    // `grid-cols-1` is minmax(0, 1fr): an unbreakable error or label wraps instead of widening the whole control.
    <div className={cn('grid min-w-0 grid-cols-1 gap-2', className)}>
      <Label htmlFor={inputId} className={cn('[overflow-wrap:anywhere]', error && 'text-destructive')}>
        {label}
      </Label>
      {childWithProps}
      {error && (
        <p id={errorId} className='text-destructive text-sm [overflow-wrap:anywhere]' role='alert'>
          {error}
        </p>
      )}
    </div>
  );
}

export { FormControl, type FormControlLayout };
