'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useTheme } from 'next-themes';

import { cn } from '@/lib/utils';

type ConstructiveLogoProps = {
  className?: string;
  priority?: boolean;
};

/**
 * Full Constructive wordmark. Uses the dark-UI mark on dark surfaces and the
 * black wordmark on light surfaces (dashboard brand pair).
 */
export function ConstructiveLogo({ className, priority = false }: ConstructiveLogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <span className={cn('inline-block h-5 w-28', className)} aria-hidden />;
  }

  const isDark = resolvedTheme === 'dark';
  const src = isDark ? '/constructive-full.svg' : '/constructive-full-black.svg';

  return (
    <Image
      src={src}
      alt="Constructive"
      width={140}
      height={39}
      className={cn('h-5 w-auto', className)}
      unoptimized
      priority={priority}
    />
  );
}
