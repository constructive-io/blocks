'use client';

import { useEffect } from 'react';
import { AnimatePresence } from 'motion/react';

import { useChatContext } from './chat-context';
import { ChatFab } from './chat-fab';
import { ChatPanel } from './chat-panel';

interface ChatWidgetProps {
  /** CSS class for the FAB button */
  fabClassName?: string;
  /** CSS class for the panel */
  panelClassName?: string;
}

export function ChatWidget({ fabClassName, panelClassName }: ChatWidgetProps) {
  const { isOpen, setIsOpen, toggle } = useChatContext();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === '>' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        toggle();
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, toggle, setIsOpen]);

  return (
    <>
      <AnimatePresence initial={false}>
        <ChatFab key='fab' isOpen={isOpen} onClick={toggle} className={fabClassName} />
      </AnimatePresence>
      <AnimatePresence initial={false}>
        {isOpen && <ChatPanel key='panel' variant='floating' className={panelClassName} />}
      </AnimatePresence>
    </>
  );
}
