import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * `cn` — class-name merge helper used by every Constructive block.
 *
 * Installed to the consumer's `@/lib/utils` (the shadcn default `utils` alias)
 * so blocks can `import { cn } from '@/lib/utils'` exactly as authored. Shipped
 * as the `cn` registry item; blocks declare `cn` in their registryDependencies
 * and the build namespaces it to `@constructive/cn`.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
