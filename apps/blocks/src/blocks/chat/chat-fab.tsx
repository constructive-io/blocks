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
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 12, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
      type='button'
      onClick={onClick}
      aria-label={isOpen ? 'Close chat' : 'Open chat'}
      aria-expanded={isOpen}
      aria-controls='chat-panel'
      className={cn(
        'group bg-primary/85 hover:bg-primary fixed z-40 flex size-12 cursor-pointer items-center justify-center rounded-full shadow-md [right:calc(1rem+env(safe-area-inset-right))] [bottom:calc(1rem+env(safe-area-inset-bottom))]',
        className,
      )}
      whileTap={{ scale: 0.96 }}
    >
      <AnimatePresence mode='wait' initial={false}>
        {isOpen ? (
          <motion.span
            key='close'
            initial={{ opacity: 0, scale: 0.25, filter: 'blur(4px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.25, filter: 'blur(4px)' }}
            transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
            className='text-primary-foreground flex items-center justify-center'
          >
            <X className='h-5 w-5' strokeWidth={2.5} />
          </motion.span>
        ) : (
          <motion.span
            key='sparkle'
            initial={{ opacity: 0, scale: 0.25, filter: 'blur(4px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.25, filter: 'blur(4px)' }}
            transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
            className='text-primary-foreground flex items-center justify-center'
          >
            <Sparkles className='h-5 w-5' strokeWidth={2} />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
