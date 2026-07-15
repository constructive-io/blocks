'use client';

import { useMemo } from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

interface ChatMessageContentProps {
  content: string;
}

export function ChatMessageContent({ content }: ChatMessageContentProps) {
  const html = useMemo(() => {
    if (!content) return '';
    try {
      return DOMPurify.sanitize(marked.parse(content) as string);
    } catch {
      return DOMPurify.sanitize(content);
    }
  }, [content]);

  return (
    <div
      className='prose prose-sm prose-neutral dark:prose-invert [&_pre]:text-foreground max-w-none [&_code]:text-xs
        [&_h1]:text-[1.1rem] [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:text-[0.9375rem]
        [&_h3]:font-semibold [&_h4]:text-sm [&_h4]:font-medium [&_pre]:rounded-md [&_pre]:bg-black/[0.04] [&_pre]:p-3
        dark:[&_pre]:bg-white/5 [&_table]:block [&_table]:overflow-x-auto'
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
