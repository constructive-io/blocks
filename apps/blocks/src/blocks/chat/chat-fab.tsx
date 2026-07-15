'use client';

import { Sparkles, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import { cn } from '@/lib/utils';

interface ChatFabProps {
  isOpen: boolean;
  onClick: () => void;
  className?: string;
}

export function ChatFab({ isOpen, onClick, className }: ChatFabProps) {
  return (
    <motion.button
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
      type='button'
      onClick={onClick}
      aria-label={isOpen ? 'Close chat' : 'Open chat'}
      aria-expanded={isOpen}
      aria-controls='chat-panel'
      className={cn(
        'group bg-primary/85 hover:bg-primary fixed bottom-4 right-4 z-[500] flex h-12 w-12 cursor-pointer items-center justify-center rounded-full shadow-md',
        className,
      )}
      whileTap={{ scale: 0.95 }}
    >
      <AnimatePresence mode='wait' initial={false}>
        {isOpen ? (
          <motion.span
            key='close'
            initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
            transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
            className='text-primary-foreground flex items-center justify-center'
          >
            <X className='h-5 w-5' strokeWidth={2.5} />
          </motion.span>
        ) : (
          <motion.span
            key='sparkle'
            initial={{ opacity: 0, rotate: 90, scale: 0.6 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: -90, scale: 0.6 }}
            transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
            className='text-primary-foreground flex items-center justify-center'
          >
            <Sparkles className='h-5 w-5' strokeWidth={2} />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
