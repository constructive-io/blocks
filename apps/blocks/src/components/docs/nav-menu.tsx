'use client';

import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { spring } from '@/lib/motion/springs';
import { fontWeights } from '@/lib/motion/font-weight';
import { useProximityHover } from '@/lib/use-proximity-hover';

/**
 * NavMenu (DESIGN.md §3.4) — FF's magnetic hover-glide menu, adapted for the
 * sidebar top menu (Showcase / Introduction). One shared `motion.div` glides
 * between item rects (`useProximityHover`, axis y) for hover; a second layer
 * marks the active route with `bg-active`; a third draws the keyboard focus
 * ring. Shape-context and icon-context are stripped: rows are `rounded-lg`, the
 * focus ring `rounded-[10px]`, and each item takes a lucide icon component prop.
 * Roving tabindex + arrow/Home/End keyboard nav are preserved.
 */

interface NavMenuContextValue {
  registerItem: (index: number, element: HTMLElement | null) => void;
  registerSlug: (index: number, slug: string | null) => void;
  activeIndex: number | null;
  activeSlug: string | null;
  /** Index of the item matching activeSlug, or null when no item matches. */
  activeRouteIndex: number | null;
}

const NavMenuContext = createContext<NavMenuContextValue | null>(null);

function useNavMenu() {
  const ctx = useContext(NavMenuContext);
  if (!ctx) throw new Error('useNavMenu must be used within a NavMenu');
  return ctx;
}

interface NavMenuProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  activeSlug: string | null;
}

const NavMenu = forwardRef<HTMLElement, NavMenuProps>(({ children, activeSlug, className, ...props }, ref) => {
  const containerRef = useRef<HTMLElement | null>(null);
  const [slugToIndex, setSlugToIndex] = useState<Map<string, number>>(() => new Map());
  const { activeIndex, setActiveIndex, itemRects, session, handlers, registerItem, measureItems } =
    useProximityHover(containerRef);

  useEffect(() => {
    measureItems();
  }, [measureItems, children]);

  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const registerSlug = useCallback((index: number, slug: string | null) => {
    setSlugToIndex((current) => {
      let registeredSlug: string | null = null;
      let hasDuplicateIndex = false;

      for (const [currentSlug, currentIndex] of current) {
        if (currentIndex !== index) continue;
        if (registeredSlug === null) registeredSlug = currentSlug;
        else hasDuplicateIndex = true;
      }

      if (slug === null && registeredSlug === null) return current;
      if (slug !== null && registeredSlug === slug && !hasDuplicateIndex) return current;

      const next = new Map(current);
      for (const [currentSlug, currentIndex] of current) {
        if (currentIndex === index) next.delete(currentSlug);
      }
      if (slug !== null) next.set(slug, index);
      return next;
    });
  }, []);

  // Derive the active route index from activeSlug.
  const activeRouteIndex = activeSlug !== null ? slugToIndex.get(activeSlug) ?? null : null;

  const activeRect = activeIndex !== null ? itemRects[activeIndex] : null;
  const activeRouteRect = activeRouteIndex !== null ? itemRects[activeRouteIndex] : null;
  const focusRect = focusedIndex !== null ? itemRects[focusedIndex] : null;
  const isHoveringOther = activeIndex !== null && activeIndex !== activeRouteIndex;
  const contextValue = useMemo<NavMenuContextValue>(
    () => ({ registerItem, registerSlug, activeIndex, activeSlug, activeRouteIndex }),
    [registerItem, registerSlug, activeIndex, activeSlug, activeRouteIndex]
  );

  return (
    <NavMenuContext.Provider value={contextValue}>
      <nav
        ref={(node) => {
          containerRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        onMouseEnter={handlers.onMouseEnter}
        onMouseMove={handlers.onMouseMove}
        onMouseLeave={handlers.onMouseLeave}
        onFocus={(e) => {
          const indexAttr = (e.target as HTMLElement).closest('[data-nav-index]')?.getAttribute('data-nav-index');
          if (indexAttr != null) {
            const idx = Number(indexAttr);
            setActiveIndex(idx);
            setFocusedIndex((e.target as HTMLElement).matches(':focus-visible') ? idx : null);
          }
        }}
        onBlur={(e) => {
          if (containerRef.current?.contains(e.relatedTarget as Node)) return;
          setFocusedIndex(null);
          setActiveIndex(null);
        }}
        onKeyDown={(e) => {
          const items = Array.from(
            containerRef.current?.querySelectorAll('a[data-nav-index]') ?? []
          ) as HTMLElement[];
          const currentIdx = items.indexOf(e.target as HTMLElement);
          if (currentIdx === -1) return;

          if (['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft'].includes(e.key)) {
            e.preventDefault();
            const next = ['ArrowDown', 'ArrowRight'].includes(e.key)
              ? (currentIdx + 1) % items.length
              : (currentIdx - 1 + items.length) % items.length;
            items[next].focus();
          } else if (e.key === 'Home') {
            e.preventDefault();
            items[0]?.focus();
          } else if (e.key === 'End') {
            e.preventDefault();
            items[items.length - 1]?.focus();
          }
        }}
        className={cn('relative flex w-full select-none flex-col gap-0.5', className)}
        {...props}
      >
        {/* Active route background */}
        <AnimatePresence>
          {activeRouteRect && (
            <motion.div
              className="pointer-events-none absolute left-0 top-0 rounded-lg bg-active"
              style={{ width: activeRouteRect.width, height: activeRouteRect.height }}
              initial={false}
              animate={{
                x: activeRouteRect.left,
                y: activeRouteRect.top,
                opacity: isHoveringOther ? 0.8 : 1,
              }}
              exit={{ opacity: 0, transition: spring.moderate.exit }}
              transition={{ ...spring.moderate, opacity: { duration: 0.08 } }}
            />
          )}
        </AnimatePresence>

        {/* Hover background */}
        <AnimatePresence>
          {activeRect && (
            <motion.div
              key={session}
              className="pointer-events-none absolute left-0 top-0 rounded-lg bg-hover"
              style={{ width: activeRect.width, height: activeRect.height }}
              initial={{
                opacity: 0,
                x: activeRouteRect?.left ?? activeRect.left,
                y: activeRouteRect?.top ?? activeRect.top,
              }}
              animate={{
                opacity: 1,
                x: activeRect.left,
                y: activeRect.top,
              }}
              exit={{ opacity: 0, transition: spring.fast.exit }}
              transition={{ ...spring.fast, opacity: { duration: 0.08 } }}
            />
          )}
        </AnimatePresence>

        {/* Focus ring */}
        <AnimatePresence>
          {focusRect && (
            <motion.div
              className="pointer-events-none absolute left-0 top-0 z-20 rounded-[10px] border border-[color:var(--ring)]"
              style={{ width: focusRect.width + 4, height: focusRect.height + 4 }}
              initial={false}
              animate={{
                x: focusRect.left - 2,
                y: focusRect.top - 2,
              }}
              exit={{ opacity: 0, transition: spring.fast.exit }}
              transition={{ ...spring.fast, opacity: { duration: 0.08 } }}
            />
          )}
        </AnimatePresence>

        {children}
      </nav>
    </NavMenuContext.Provider>
  );
});

NavMenu.displayName = 'NavMenu';

interface NavMenuItemProps extends Omit<HTMLAttributes<HTMLAnchorElement>, 'href'> {
  label: string;
  href: string;
  index: number;
  icon?: LucideIcon;
  isNew?: boolean;
  isUpdated?: boolean;
  /** Tailwind background class for the status dot. Defaults to the accent. */
  dotColorClass?: string;
}

const NavMenuItem = forwardRef<HTMLAnchorElement, NavMenuItemProps>(
  ({ label, href, index, icon: Icon, isNew, isUpdated, dotColorClass, className, ...props }, ref) => {
    const internalRef = useRef<HTMLAnchorElement | null>(null);
    const { registerItem, registerSlug, activeIndex, activeSlug, activeRouteIndex } = useNavMenu();

    useEffect(() => {
      registerItem(index, internalRef.current);
      registerSlug(index, href);
      return () => {
        registerItem(index, null);
        registerSlug(index, null);
      };
    }, [index, href, registerItem, registerSlug]);

    const isActive = activeIndex === index;
    const isActiveRoute = activeSlug === href;
    const isEmphasized = isActive || isActiveRoute;

    // Roving tabindex: the active-route item gets 0, others -1. When no item in
    // this menu matches activeSlug, fall back to making the first item tabbable
    // so the menu stays keyboard-reachable.
    const activeRouteExists = activeRouteIndex !== null;
    const tabIdx = isActiveRoute ? 0 : activeRouteExists ? -1 : index === 0 ? 0 : -1;

    return (
      <Link
        ref={(node) => {
          internalRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        href={href}
        data-nav-index={index}
        tabIndex={tabIdx}
        aria-current={isActiveRoute ? 'page' : undefined}
        className={cn('relative z-10 flex h-8 cursor-pointer items-center rounded-lg px-3 outline-none', className)}
        {...props}
      >
        {Icon && (
          <Icon
            size={16}
            strokeWidth={isEmphasized ? 2 : 1.5}
            className={cn(
              'mr-2 shrink-0 transition-[color,stroke-width] duration-[var(--dur-fast)]',
              isEmphasized ? 'text-foreground' : 'text-muted-foreground'
            )}
          />
        )}
        {/* Ghost-span: an invisible semibold sizer holds the row width so the
            visible label can shift weight (400→550) without reflowing. */}
        <span className="inline-grid flex-1 text-[13px]">
          <span
            className="invisible col-start-1 row-start-1"
            style={{ fontVariationSettings: fontWeights.semibold }}
            aria-hidden="true"
          >
            {label}
          </span>
          <span
            className={cn(
              'col-start-1 row-start-1 transition-[color,font-variation-settings] duration-[var(--dur-fast)]',
              isEmphasized ? 'text-foreground' : 'text-muted-foreground'
            )}
            style={{ fontVariationSettings: isActiveRoute ? fontWeights.semibold : fontWeights.normal }}
          >
            {label}
            {isUpdated || isNew ? (
              <span className={cn('ml-2 inline-block size-1.5 rounded-full align-middle', dotColorClass ?? 'bg-primary')} />
            ) : null}
          </span>
        </span>
      </Link>
    );
  }
);

NavMenuItem.displayName = 'NavMenuItem';

export { NavMenu, NavMenuItem, useNavMenu };
export type { NavMenuProps, NavMenuItemProps };
export default NavMenu;
