'use client';

import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CheckIcon, CopyIcon } from 'lucide-react';

import { Button } from '../button';
import {
	Dialog,
	DialogClose,
	DialogFooter,
	DialogHeader,
	DialogPanel,
	DialogPopup,
	DialogTitle,
} from '../dialog';

export interface ToastDetails {
	title: string;
	description: string;
}

const COPIED_FEEDBACK_MS = 1500;
const ROOT_SLOT = 'toast-details-root';

function ToastDetailsDialog({ title, description, onClosed }: ToastDetails & { onClosed: () => void }) {
	const [open, setOpen] = useState(true);
	const [copied, setCopied] = useState(false);
	const feedbackTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const mounted = useRef(true);

	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
			clearTimeout(feedbackTimer.current);
		};
	}, []);

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(description);
		} catch {
			// Clipboard may be unavailable (e.g., insecure context) — silently ignore.
			return;
		}
		if (!mounted.current) return;
		setCopied(true);
		// One feedback window: a second copy extends it instead of the first one cutting it short.
		clearTimeout(feedbackTimer.current);
		feedbackTimer.current = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
	};

	return (
		<Dialog open={open} onOpenChange={setOpen} onOpenChangeComplete={(isOpen) => !isOpen && onClosed()}>
			<DialogPopup className='max-w-2xl'>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
				</DialogHeader>
				<DialogPanel>
					<pre className='bg-muted text-foreground rounded-md p-3 text-xs break-words whitespace-pre-wrap'>
						{description}
					</pre>
				</DialogPanel>
				<DialogFooter>
					<Button variant='outline' size='sm' onClick={handleCopy}>
						{copied ? <CheckIcon size={14} aria-hidden='true' /> : <CopyIcon size={14} aria-hidden='true' />}
						{copied ? 'Copied' : 'Copy'}
					</Button>
					<DialogClose asChild>
						<Button size='sm'>Close</Button>
					</DialogClose>
				</DialogFooter>
			</DialogPopup>
		</Dialog>
	);
}

/**
 * Opens the full text of a toast in a dialog of its own.
 *
 * The dialog is not rendered by the toast, and that is the point. A toast is Sonner's to mount, time out and
 * unmount, and Sonner reads pointer and hover events from everything below it in the React tree, portals included.
 * A dialog inside the toast would vanish when the toast's timer ran out (a keyboard or screen-reader user has no
 * pointer holding it open), a drag inside it would read as a swipe that dismisses the toast, and it would hold the
 * toaster in its hover state long after it closed. In a root of its own it lives until it is closed.
 */
export function openToastDetails(details: ToastDetails) {
	if (typeof document === 'undefined') return;
	// One at a time: a second click before the first dialog has painted its backdrop must not stack another.
	if (document.querySelector(`[data-slot="${ROOT_SLOT}"]`)) return;

	const container = document.createElement('div');
	container.setAttribute('data-slot', ROOT_SLOT);
	document.body.appendChild(container);
	const root = createRoot(container);

	// After the exit animation, and never while React is rendering the dialog that asked for it.
	let disposed = false;
	const dispose = () => {
		if (disposed) return;
		disposed = true;
		setTimeout(() => {
			root.unmount();
			container.remove();
		});
	};

	root.render(<ToastDetailsDialog {...details} onClosed={dispose} />);
}
