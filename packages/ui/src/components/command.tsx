"use client";

import { Command as CommandPrimitive } from "cmdk";
import { SearchIcon } from "lucide-react";
import * as React from "react";
import { ModalPortalScope, useRootPortalContainer } from "@constructive-io/ui/portal";
import { cn } from "../lib/utils";

function CommandDialog({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Dialog>) {
  const container = useRootPortalContainer();

  return (
    <CommandPrimitive.Dialog
      container={container ?? undefined}
      overlayClassName={cn(
		"fixed inset-0 z-[var(--z-layer-toast)] bg-black/32 backdrop-blur-sm data-[state=open]:animate-[fade-in_200ms_ease-out] data-[state=closed]:animate-[fade-out_150ms_ease-in] motion-reduce:animate-none",
      )}
      contentClassName={cn(
        "fixed left-1/2 top-[max(--spacing(4),4vh)] sm:top-[10vh] z-[var(--z-layer-toast)] -translate-x-1/2 flex max-h-100 min-h-0 w-full min-w-0 max-w-xl flex-col rounded-2xl border bg-popover bg-clip-padding text-popover-foreground shadow-lg data-[state=open]:animate-[command-in_200ms_ease-out] data-[state=closed]:animate-[command-out_150ms_ease-in] motion-reduce:animate-none before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-2xl)-1px)] before:bg-muted/50 before:shadow-[0_1px_--theme(--color-black/4%)] **:data-[slot=scroll-area-viewport]:data-has-overflow-y:pe-1 dark:bg-clip-border dark:before:shadow-[0_-1px_--theme(--color-white/8%)]",
        className,
      )}
      loop
      {...props}
    >
      <ModalPortalScope>{children}</ModalPortalScope>
    </CommandPrimitive.Dialog>
  );
}

function CommandDialogPopup({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div data-slot="command-dialog-popup" className={className} {...props}>
      {children}
    </div>
  );
}

function Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-2xl",
        className,
      )}
      data-slot="command"
      {...props}
    />
  );
}

function CommandInput({
  className,
  placeholder,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div className="px-2.5 py-1.5" data-slot="command-input-wrapper">
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 text-base",
          className,
        )}
      >
        <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
        <CommandPrimitive.Input
          className="flex h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          placeholder={placeholder}
          data-slot="command-input"
          {...props}
        />
      </div>
    </div>
  );
}

function CommandList({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      className={cn("not-empty:scroll-py-2 not-empty:p-2 max-h-[300px] overflow-y-auto overflow-x-hidden", className)}
      data-slot="command-list"
      {...props}
    />
  );
}

function CommandEmpty({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      className={cn("not-empty:py-6", className)}
      data-slot="command-empty"
      {...props}
    />
  );
}

function CommandPanel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "-mx-px relative min-h-0 rounded-t-xl border bg-popover bg-clip-padding shadow-xs [clip-path:inset(0_1px)] before:pointer-events-none before:absolute before:inset-0 before:rounded-t-[calc(var(--radius-xl)-1px)] **:data-[slot=scroll-area-scrollbar]:mt-2 dark:bg-clip-border dark:before:shadow-[0_-1px_--theme(--color-white/8%)]",
        className,
      )}
      data-slot="command-panel"
      {...props}
    />
  );
}

function CommandGroup({
  className,
  heading,
  children,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group> & {
  heading?: React.ReactNode;
}) {
  return (
    <CommandPrimitive.Group
      className={cn(
        "overflow-hidden text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground",
        className,
      )}
      heading={heading}
      data-slot="command-group"
      {...props}
    >
      {children}
    </CommandPrimitive.Group>
  );
}

function CommandGroupLabel({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "px-2 py-1.5 text-xs font-medium text-muted-foreground",
        className,
      )}
      data-slot="command-group-label"
      {...props}
    />
  );
}

function CommandCollection({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function CommandItem({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      className={cn(
        "relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none data-[disabled=true]:pointer-events-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:opacity-50",
        className,
      )}
      data-slot="command-item"
      {...props}
    />
  );
}

function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      className={cn("-mx-1 my-2 h-px bg-border", className)}
      data-slot="command-separator"
      {...props}
    />
  );
}

function CommandShortcut({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <span
      className={cn(
        "ms-auto font-medium text-muted-foreground/72 text-xs tracking-widest",
        className,
      )}
      data-slot="command-shortcut"
      {...props}
    />
  );
}

function CommandFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-b-[calc(var(--radius-2xl)-1px)] px-5 py-3 text-muted-foreground text-xs",
        className,
      )}
      data-slot="command-footer"
      {...props}
    />
  );
}

export {
  Command,
  CommandCollection,
  CommandDialog,
  CommandDialogPopup,
  CommandEmpty,
  CommandFooter,
  CommandGroup,
  CommandGroupLabel,
  CommandInput,
  CommandItem,
  CommandList,
  CommandPanel,
  CommandSeparator,
  CommandShortcut,
};
