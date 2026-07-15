"use client";

import * as React from "react";
import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible";

import { cn } from "../lib/utils";

/**
 * Collapsible Root
 * Container for collapsible content with open/close state management.
 */
function Collapsible({
  className,
  ...props
}: CollapsiblePrimitive.Root.Props) {
  return (
    <CollapsiblePrimitive.Root
      data-slot="collapsible"
      className={cn("group/collapsible", className)}
      {...props}
    />
  );
}

/**
 * CollapsibleTrigger Props
 */
type CollapsibleTriggerProps = Omit<
  CollapsiblePrimitive.Trigger.Props,
  "render" | "nativeButton"
> & {
  /** When true, merges props onto the child element instead of rendering a button */
  asChild?: boolean;
  /** Whether the child renders a native button. Defaults to true when asChild is used. */
  nativeButton?: boolean;
};

/**
 * CollapsibleTrigger
 * Button that toggles the collapsible open/closed state.
 * Supports asChild pattern for custom trigger elements.
 */
const CollapsibleTrigger = React.forwardRef<
  HTMLButtonElement,
  CollapsibleTriggerProps
>(({ className, asChild, nativeButton, children, ...props }, ref) => {
  const triggerClassName = cn(
    "group/trigger flex w-full cursor-pointer items-center justify-between text-sm font-medium outline-none transition-colors",
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_[data-slot=collapsible-icon]]:transition-transform [&_[data-slot=collapsible-icon]]:duration-200",
    "[&[data-panel-open]_[data-slot=collapsible-icon]]:rotate-180",
    className
  );

  if (asChild && React.isValidElement(children)) {
    return (
      <CollapsiblePrimitive.Trigger
        ref={ref}
        data-slot="collapsible-trigger"
        nativeButton={nativeButton ?? true}
        {...props}
        render={(triggerProps) => {
          const { nativeButton: _, ...rest } = triggerProps as Record<string, unknown>;
          const childProps = children.props as Record<string, unknown>;
          return React.cloneElement(
            children as React.ReactElement<Record<string, unknown>>,
            {
              ...rest,
              className: cn(triggerClassName, childProps.className as string),
            }
          );
        }}
      />
    );
  }

  return (
    <CollapsiblePrimitive.Trigger
      ref={ref}
      data-slot="collapsible-trigger"
      nativeButton={nativeButton}
      className={triggerClassName}
      {...props}
    >
      {children}
    </CollapsiblePrimitive.Trigger>
  );
});
CollapsibleTrigger.displayName = "CollapsibleTrigger";

/**
 * CollapsiblePanel Props
 */
type CollapsiblePanelProps = CollapsiblePrimitive.Panel.Props & {
  /** Additional className for the inner content wrapper */
  innerClassName?: string;
};

/**
 * CollapsiblePanel
 * Animated container for collapsible content.
 * Uses CSS height transitions with Base UI's data attributes.
 */
const CollapsiblePanel = React.forwardRef<HTMLDivElement, CollapsiblePanelProps>(
  ({ className, innerClassName, children, ...props }, ref) => {
    return (
      <CollapsiblePrimitive.Panel
        ref={ref}
        data-slot="collapsible-panel"
        className={cn(
          "h-[var(--collapsible-panel-height)] overflow-hidden text-sm",
          "transition-[height] duration-200 ease-out",
          "data-[ending-style]:h-0 data-[starting-style]:h-0",
          className
        )}
        {...props}
      >
        <div
          data-slot="collapsible-panel-content"
          className={cn("py-4", innerClassName)}
        >
          {children}
        </div>
      </CollapsiblePrimitive.Panel>
    );
  }
);
CollapsiblePanel.displayName = "CollapsiblePanel";

/**
 * CollapsibleIcon
 * Animated chevron icon that rotates when the collapsible opens/closes.
 * Use this within CollapsibleTrigger for automatic rotation animation.
 */
function CollapsibleIcon({
  className,
  ...props
}: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      data-slot="collapsible-icon"
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-4 w-4 shrink-0 text-muted-foreground", className)}
      {...props}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export {
  Collapsible,
  CollapsibleTrigger,
  CollapsiblePanel,
  CollapsiblePanel as CollapsibleContent,
  CollapsibleIcon,
  type CollapsibleTriggerProps,
  type CollapsiblePanelProps,
};
