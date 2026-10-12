"use client";

import * as React from "react";
import { Select as SelectPrimitive } from "@base-ui/react/select";
import {
  ChevronDownIcon,
  ChevronsUpDownIcon,
  ChevronUpIcon,
} from "lucide-react";

import { useFloatingOverlayPortalProps } from "@constructive-io/ui/portal";
import { FluidHighlight } from "../lib/motion/fluid-highlight";
import { cn } from "../lib/utils";

type SelectProps = Omit<SelectPrimitive.Root.Props<string>, "onValueChange"> & {
  /** Callback when value changes */
  onValueChange?: (value: string) => void;
};

type SelectLabels = Record<string, string>;

/** The text a node renders, so an item's label can stand in for its value in the trigger. */
function textOf(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) return textOf(node.props.children);
  return "";
}

/** Reads `value -> label` from the <SelectItem>s declared in `children` (groups and fragments included). */
function collectItemLabels(children: React.ReactNode, labels: SelectLabels = {}): SelectLabels {
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement<{ value?: unknown; children?: React.ReactNode; label?: React.ReactNode; name?: string }>(child)) {
      return;
    }
    const { value, children: inner, label, name } = child.props;
    if (child.type === SelectItem || child.type === SelectRichItem || child.type === SelectFieldItem) {
      const text = child.type === SelectFieldItem ? (name ?? "") : textOf(child.type === SelectRichItem ? (label ?? inner) : inner).trim();
      if (typeof value === "string" && text) labels[value] = text;
    } else if (inner) {
      collectItemLabels(inner, labels);
    }
  });
  return labels;
}

/** Keeps the same object while the labels are unchanged, so Base UI is not handed a new `items` on every render. */
function useStableLabels(next: SelectLabels): SelectLabels {
  const ref = React.useRef(next);
  const previous = ref.current;
  const keys = Object.keys(next);
  if (keys.length !== Object.keys(previous).length || keys.some((key) => previous[key] !== next[key])) {
    ref.current = next;
  }
  return ref.current;
}

/** Lets an item that mounts later (rendered by a wrapper component, so not visible in `children`) report its label. */
const SelectLabelRegistry = React.createContext<((value: string, label: string) => void) | null>(null);

function useRegisterSelectLabel(value: unknown, label: string) {
  const register = React.useContext(SelectLabelRegistry);
  React.useEffect(() => {
    if (register && typeof value === "string" && label) register(value, label);
  }, [register, value, label]);
}

/**
 * Base UI shows the raw `value` in the trigger unless it is given `items`. Pass `items` for full control; without it the
 * labels are read from the declared <SelectItem>s, so `defaultValue="editor"` shows "Editor", not `editor`. Items rendered
 * by a wrapper component are picked up once the list has opened; pass `items` if the label must show before that.
 */
function Select({ onValueChange, items, children, ...props }: SelectProps) {
  const declared = collectItemLabels(children);
  const declaredRef = React.useRef(declared);
  React.useEffect(() => {
    declaredRef.current = declared;
  });
  const mountedRef = React.useRef<SelectLabels>({});
  const [, refresh] = React.useReducer((count: number) => count + 1, 0);
  const register = React.useCallback((value: string, label: string) => {
    if (declaredRef.current[value] === label || mountedRef.current[value] === label) return;
    mountedRef.current[value] = label;
    refresh();
  }, []);
  const labels = useStableLabels({ ...mountedRef.current, ...declared });

  return (
    <SelectLabelRegistry.Provider value={register}>
      <SelectPrimitive.Root<string>
        items={items ?? (Object.keys(labels).length > 0 ? labels : undefined)}
        onValueChange={
          onValueChange
            ? (value, _eventDetails) => {
                // Only call callback when there's an actual value (not null/undefined)
                if (value != null) {
                  onValueChange(value);
                }
              }
            : undefined
        }
        {...props}
      >
        {children}
      </SelectPrimitive.Root>
    </SelectLabelRegistry.Provider>
  );
}

type SelectTriggerProps = SelectPrimitive.Trigger.Props & {
  size?: "sm" | "default" | "lg";
};

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, size = "default", children, ...props }, ref) => {
    return (
      <SelectPrimitive.Trigger
        ref={ref}
        className={cn(
          "relative inline-flex min-h-9 w-full min-w-[min(9rem,100%)] select-none items-center justify-between gap-2 rounded-md border border-input bg-background bg-clip-padding px-[calc(--spacing(3)-1px)] text-left text-base outline-none ring-ring/35 transition-shadow before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-md)-1px)] not-data-disabled:not-focus-visible:not-aria-invalid:not-data-pressed:before:shadow-[0_1px_--theme(--color-black/4%)] pointer-coarse:min-h-11 sm:pointer-coarse:min-h-11 focus-visible:border-ring/60 focus-visible:ring-[3px] aria-invalid:border-destructive/36 focus-visible:aria-invalid:border-destructive/64 focus-visible:aria-invalid:ring-destructive/16 data-disabled:pointer-events-none data-disabled:opacity-64 sm:min-h-8 sm:text-sm dark:bg-input/32 dark:not-in-data-[slot=group]:bg-clip-border dark:aria-invalid:ring-destructive/24 dark:not-data-disabled:not-focus-visible:not-aria-invalid:not-data-pressed:before:shadow-[0_-1px_--theme(--color-white/8%)] [&_svg:not([class*='opacity-'])]:opacity-80 [&_svg:not([class*='size-'])]:size-4.5 sm:[&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0 [[data-disabled],:focus-visible,[aria-invalid],[data-pressed]]:shadow-none",
          size === "sm" &&
            "min-h-8 gap-1.5 px-[calc(--spacing(2.5)-1px)] sm:min-h-7",
          size === "lg" && "min-h-10 sm:min-h-9",
          className,
        )}
        data-slot="select-trigger"
        {...props}
      >
        {children}
        <SelectPrimitive.Icon data-slot="select-icon">
          <ChevronsUpDownIcon className="-me-1 size-4.5 opacity-80 sm:size-4" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
    );
  }
);
SelectTrigger.displayName = "SelectTrigger";

type SelectValueProps = React.ComponentProps<typeof SelectPrimitive.Value>;

function SelectValue({ className, placeholder, children, onMouseEnter, ...props }: SelectValueProps) {
  return (
    <SelectPrimitive.Value
      className={cn(
        "flex-1 truncate data-placeholder:text-subtle-foreground",
        className,
      )}
      data-slot="select-value"
      placeholder={placeholder}
      // A truncated value carries its full text as a tooltip; a value that fits carries none.
      onMouseEnter={(event) => {
        const element = event.currentTarget;
        element.title = element.scrollWidth > element.clientWidth ? (element.textContent ?? "") : "";
        onMouseEnter?.(event);
      }}
      {...props}
    >
      {children}
    </SelectPrimitive.Value>
  );
}

type SelectPopupProps = SelectPrimitive.Popup.Props & {
  sideOffset?: SelectPrimitive.Positioner.Props["sideOffset"];
  alignItemWithTrigger?: SelectPrimitive.Positioner.Props["alignItemWithTrigger"];
  /** @deprecated Not used in Base UI. Kept for backward compatibility. */
  position?: "item-aligned" | "popper";
  /** Shown when the list has no items. */
  emptyMessage?: React.ReactNode;
};

function SelectPopup({
  className,
  children,
  sideOffset = 4,
  alignItemWithTrigger = false,
  position: _position,
  emptyMessage = "No options",
  ...props
}: SelectPopupProps) {
  const { container, zIndexClass } = useFloatingOverlayPortalProps();

  return (
    <SelectPrimitive.Portal container={container}>
      <SelectPrimitive.Positioner
        alignItemWithTrigger={alignItemWithTrigger}
        className={cn("select-none", zIndexClass)}
        data-slot="select-positioner"
        sideOffset={sideOffset}
      >
        <SelectPrimitive.Popup
          className="origin-(--transform-origin) scale-100 opacity-100 transition-[scale,opacity] duration-(--duration-moderate) data-[side=none]:transition-none data-starting-style:scale-98 data-ending-style:scale-98 data-starting-style:opacity-0 data-ending-style:opacity-0 motion-reduce:transition-none"
          data-slot="select-popup"
          {...props}
        >
          <SelectPrimitive.ScrollUpArrow
            className="top-0 flex h-6 w-full cursor-default items-center justify-center before:pointer-events-none before:absolute before:inset-x-px before:top-px before:h-[200%] before:rounded-t-[calc(var(--radius-lg)-1px)] before:bg-linear-to-b before:from-50% before:from-popover"
            data-slot="select-scroll-up-arrow"
          >
            <ChevronUpIcon className="relative size-4.5 sm:size-4" />
          </SelectPrimitive.ScrollUpArrow>
          <span className="relative block h-full rounded-lg border bg-popover bg-clip-padding before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] before:shadow-lg dark:not-in-data-[slot=group]:bg-clip-border">
            <SelectPrimitive.List
              className={cn(
                // `scroll-py-6` keeps a scrolled-to item clear of the scroll arrows; the empty message only shows
                // while the list holds no option.
                "relative max-h-(--available-height) min-w-(--anchor-width) scroll-py-6 overflow-y-auto p-1 [&:not(:has([role=option]))>[data-slot=select-empty]]:block",
                className,
              )}
              data-slot="select-list"
            >
              <FluidHighlight />
              {children}
              <div
                className="hidden px-2 py-1.5 text-center text-muted-foreground text-sm"
                data-slot="select-empty"
                role="presentation"
              >
                {emptyMessage}
              </div>
            </SelectPrimitive.List>
          </span>
          <SelectPrimitive.ScrollDownArrow
            className="bottom-0 flex h-6 w-full cursor-default items-center justify-center before:pointer-events-none before:absolute before:inset-x-px before:bottom-px before:h-[200%] before:rounded-b-[calc(var(--radius-lg)-1px)] before:bg-linear-to-t before:from-50% before:from-popover"
            data-slot="select-scroll-down-arrow"
          >
            <ChevronDownIcon className="relative size-4.5 sm:size-4" />
          </SelectPrimitive.ScrollDownArrow>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

function SelectItem({
  className,
  children,
  ...props
}: SelectPrimitive.Item.Props) {
  useRegisterSelectLabel(props.value, textOf(children).trim());
  return (
    <SelectPrimitive.Item
      className={cn(
        "relative grid min-h-8 in-data-[side=none]:min-w-[calc(var(--anchor-width)+1.25rem)] cursor-default grid-cols-[1rem_minmax(0,1fr)] items-center gap-2 rounded-sm py-1 ps-2 pe-4 text-base outline-none pointer-coarse:min-h-11 sm:pointer-coarse:min-h-11 data-disabled:pointer-events-none data-highlighted:text-accent-foreground data-disabled:opacity-64 sm:min-h-7 sm:text-sm [&_svg:not([class*='size-'])]:size-4.5 sm:[&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
      )}
      data-slot="select-item"
      {...props}
    >
		<SelectPrimitive.ItemIndicator
			keepMounted
			className={(state) =>
				cn(
					'col-start-1 transition-[opacity,scale,filter] duration-(--duration-slow) ease-out motion-reduce:transition-none',
					state.selected ? 'scale-100 opacity-100 blur-0' : 'scale-[0.25] opacity-0 blur-[4px]',
				)
			}
		>
        <svg
          fill="none"
          height="24"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="24"
          xmlns="http://www.w3.org/1500/svg"
        >
          <path d="M5.252 12.7 10.2 18.63 18.748 5.37" />
        </svg>
      </SelectPrimitive.ItemIndicator>
      <SelectPrimitive.ItemText className="col-start-2 min-w-0 [overflow-wrap:anywhere]">
        {children}
      </SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({
  className,
  ...props
}: SelectPrimitive.Separator.Props) {
  return (
    <SelectPrimitive.Separator
      className={cn("mx-2 my-1 h-px bg-border", className)}
      data-slot="select-separator"
      {...props}
    />
  );
}

function SelectGroup({ ...props }: SelectPrimitive.Group.Props) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}

function SelectGroupLabel({ ...props }: SelectPrimitive.GroupLabel.Props) {
  return (
    <SelectPrimitive.GroupLabel
      className="px-2 py-1.5 font-medium text-muted-foreground text-xs"
      data-slot="select-group-label"
      {...props}
    />
  );
}

type SelectRichItemProps = SelectPrimitive.Item.Props & {
  /** Main label text */
  label?: React.ReactNode;
  /** Optional description text below the label */
  description?: React.ReactNode;
  /** Optional icon element */
  icon?: React.ReactNode;
};

function SelectRichItem({
  className,
  children,
  label,
  description,
  icon,
  ...props
}: SelectRichItemProps) {
  useRegisterSelectLabel(props.value, textOf(label ?? children).trim());
  return (
    <SelectPrimitive.Item
      className={cn(
        "relative grid min-h-8 in-data-[side=none]:min-w-[calc(var(--anchor-width)+1.25rem)] cursor-default grid-cols-[1rem_minmax(0,1fr)] items-center gap-2 rounded-sm py-1.5 ps-2 pe-4 text-base outline-none pointer-coarse:min-h-11 sm:pointer-coarse:min-h-11 data-disabled:pointer-events-none data-highlighted:text-accent-foreground data-disabled:opacity-64 sm:min-h-7 sm:text-sm [&_svg:not([class*='size-'])]:size-4.5 sm:[&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
      )}
      data-slot="select-rich-item"
      {...props}
    >
		<SelectPrimitive.ItemIndicator
			keepMounted
			className={(state) =>
				cn(
					'col-start-1 mt-0.5 self-start transition-[opacity,scale,filter] duration-(--duration-slow) ease-out motion-reduce:transition-none',
					state.selected ? 'scale-100 opacity-100 blur-0' : 'scale-[0.25] opacity-0 blur-[4px]',
				)
			}
		>
        <svg
          fill="none"
          height="24"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M5.252 12.7 10.2 18.63 18.748 5.37" />
        </svg>
      </SelectPrimitive.ItemIndicator>
      <SelectPrimitive.ItemText className="col-start-2 min-w-0 flex flex-col gap-0.5 [overflow-wrap:anywhere]">
        <span className="flex items-center gap-2">
          {icon}
          {label ?? children}
        </span>
        {description && (
          <span className="text-muted-foreground text-xs">{description}</span>
        )}
      </SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

type SelectFieldItemProps = SelectPrimitive.Item.Props & {
  /** Field name to display */
  name: string;
  /** Field type to display as muted text */
  type?: string;
};

function SelectFieldItem({
  className,
  name,
  type,
  ...props
}: SelectFieldItemProps) {
  useRegisterSelectLabel(props.value, name);
  return (
    <SelectPrimitive.Item
      className={cn(
        "relative grid min-h-8 in-data-[side=none]:min-w-[calc(var(--anchor-width)+1.25rem)] cursor-default grid-cols-[1rem_minmax(0,1fr)] items-center gap-2 rounded-sm py-1 ps-2 pe-4 text-base outline-none pointer-coarse:min-h-11 sm:pointer-coarse:min-h-11 data-disabled:pointer-events-none data-highlighted:text-accent-foreground data-disabled:opacity-64 sm:min-h-7 sm:text-sm [&_svg:not([class*='size-'])]:size-4.5 sm:[&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
      )}
      data-slot="select-field-item"
      {...props}
    >
		<SelectPrimitive.ItemIndicator
			keepMounted
			className={(state) =>
				cn(
					'col-start-1 transition-[opacity,scale,filter] duration-(--duration-slow) ease-out motion-reduce:transition-none',
					state.selected ? 'scale-100 opacity-100 blur-0' : 'scale-[0.25] opacity-0 blur-[4px]',
				)
			}
		>
        <svg
          fill="none"
          height="24"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M5.252 12.7 10.2 18.63 18.748 5.37" />
        </svg>
      </SelectPrimitive.ItemIndicator>
      <SelectPrimitive.ItemText className="col-start-2 min-w-0 flex items-center justify-between gap-2">
        <span className="truncate">{name}</span>
        {type && (
          <span className="text-muted-foreground text-xs shrink-0">{type}</span>
        )}
      </SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

export {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPopup,
  SelectPopup as SelectContent,
  SelectItem,
  SelectRichItem,
  SelectFieldItem,
  SelectSeparator,
  SelectGroup,
  SelectGroupLabel,
  SelectGroupLabel as SelectLabel,
};
