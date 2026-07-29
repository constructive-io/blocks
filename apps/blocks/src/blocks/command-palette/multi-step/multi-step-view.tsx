'use client';

import * as React from 'react';
import { useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  isEditableTarget,
  type MultiStepConfig,
  type MultiStepState
} from '@constructive-io/command-palette';
import { ArrowLeftIcon, LoaderCircleIcon } from 'lucide-react';
import { Button } from '@constructive-io/ui/button';
import { Separator } from '@constructive-io/ui/separator';
import { StepIndicator } from './step-indicator';

interface MultiStepViewProps {
  config: MultiStepConfig<any>;
  state: MultiStepState<any>;
  onCompleteStep: (output: Partial<any>) => void;
  onBack: () => void;
  onSkip: () => void;
  onCancel: () => void;
  onError: (error: Error | string) => void;
}

const SLIDE_OFFSET = 80;
const TRANSITION = { duration: 0.2, ease: 'easeInOut' as const };

const slideVariants = {
  enter: (dir: string) => ({
    x: dir === 'backward' ? -SLIDE_OFFSET : SLIDE_OFFSET,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (dir: string) => ({
    x: dir === 'backward' ? SLIDE_OFFSET : -SLIDE_OFFSET,
    opacity: 0,
  }),
};

export function MultiStepView({
  config,
  state,
  onCompleteStep,
  onBack,
  onSkip,
  onCancel,
  onError,
}: MultiStepViewProps) {
  const { currentStepIndex, steps, direction, flowStatus } = state;
  const stepDef = config.steps[currentStepIndex];
  if (!stepDef) return null;

  const currentStep = steps[currentStepIndex];
  const totalSteps = config.steps.length;
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === totalSteps - 1;
  const isCompleting = flowStatus === 'completing';

  const StepComponent = stepDef.Component;

  // Prevent cmdk Command root from intercepting keys during multi-step.
  // Enter/ArrowUp/ArrowDown are stopped so they reach step form inputs instead
  // of being swallowed by cmdk's item-select / navigation handlers.
  // Escape is NOT stopped — Radix Dialog needs it for layered dismiss.
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.stopPropagation();
    }
  }, []);

  // Backspace keyboard navigation — go back when not in an editable target
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Backspace' && !isFirst && !isEditableTarget(e.target)) {
        e.preventDefault();
        onBack();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFirst, onBack]);

  return (
    <div className="flex flex-col" onKeyDown={handleKeyDown}>
      <div className="flex items-center gap-2 px-3 py-2">
        <Button
          onClick={isFirst ? onCancel : onBack}
          aria-label={isFirst ? 'Back to commands' : 'Go back'}
          size="icon-xs"
          variant="ghost"
        >
          <ArrowLeftIcon />
        </Button>
        <span className="text-sm font-medium">
          Step {currentStepIndex + 1} of {totalSteps}: {stepDef.title}
        </span>
      </div>
      <Separator />

      {/* Step indicator */}
      <StepIndicator steps={steps} currentIndex={currentStepIndex} />

      {/* Step content with AnimatePresence */}
      <div className="relative min-h-[120px] overflow-hidden px-3 py-2">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={stepDef.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={TRANSITION}
          >
            {isCompleting ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <LoaderCircleIcon aria-hidden="true" className="size-4 animate-spin" />
                Submitting…
              </div>
            ) : currentStep.status === 'loading' ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <LoaderCircleIcon aria-hidden="true" className="size-4 animate-spin" />
                Loading…
              </div>
            ) : (
              <StepComponent
                context={state.context as any}
                data={currentStep.data}
                onComplete={onCompleteStep}
                onBack={onBack}
                onSkip={onSkip}
                onError={onError}
                status={currentStep.status}
                error={currentStep.error}
                isFirst={isFirst}
                isLast={isLast}
                stepIndex={currentStepIndex}
                totalSteps={totalSteps}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <Separator />
      <div className="flex items-center justify-between px-3 py-2">
        <span className="flex items-center gap-1 text-xs">
          <kbd className="rounded-xs border bg-muted px-1">esc</kbd>
          Back to list
        </span>
        <div className="flex items-center gap-3">
          {!isFirst && (
            <span className="flex items-center gap-1 text-xs">
              <kbd className="rounded-xs border bg-muted px-1">⌫</kbd>
              Back
            </span>
          )}
          {stepDef.skippable && !isLast && (
            <Button onClick={onSkip} size="xs" variant="ghost">
              Skip
            </Button>
          )}
          <span className="flex items-center gap-1 text-xs">
            <kbd className="rounded-xs border bg-muted px-1">↵</kbd>
            {isLast ? 'Finish' : 'Continue'}
          </span>
        </div>
      </div>
    </div>
  );
}
