'use client';

import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
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
	/** The control that opened the dialog. Focus goes back to it on close while it is still on the page. */
	trigger?: HTMLElement | null;
}

type RegionRef = React.RefObject<HTMLElement | null>;

const COPIED_FEEDBACK_MS = 1500;
const ROOT_SLOT = 'toast-details-root';

// ---------------------------------------------------------------------------------------------------------------------
// The request to show a toast's details, shared between whoever asks (a toast) and whoever shows it (a host).
//
// It lives on `globalThis` so that two copies of this module, such as the package and a copy from the registry, still
// find each other: a toast from one copy is shown by the `Toaster` of the other.
// ---------------------------------------------------------------------------------------------------------------------

interface Snapshot {
	readonly details: ToastDetails | null;
	readonly hosts: readonly string[];
}

interface Store {
	snapshot: Snapshot;
	listeners: Set<() => void>;
}

const STORE_KEY = Symbol.for('constructive.toast-details');
const EMPTY: Snapshot = { details: null, hosts: [] };

function getStore(): Store {
	const scope = globalThis as unknown as Record<symbol, Store | undefined>;
	return (scope[STORE_KEY] ??= { snapshot: EMPTY, listeners: new Set() });
}

function update(next: Snapshot) {
	const store = getStore();
	store.snapshot = next;
	for (const listener of store.listeners) listener();
}

function subscribe(listener: () => void) {
	const { listeners } = getStore();
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

const getSnapshot = () => getStore().snapshot;
const getServerSnapshot = () => EMPTY;

function registerHost(id: string) {
	update({ ...getSnapshot(), hosts: [...getSnapshot().hosts, id] });
	return () => {
		const current = getSnapshot();
		const hosts = current.hosts.filter((host) => host !== id);
		// With no host left nothing would show the request, and a request nobody shows must not block the next one.
		update({ details: hosts.length > 0 ? current.details : null, hosts });
	};
}

const closeDetails = () => update({ ...getSnapshot(), details: null });

function currentFocus() {
	const active = document.activeElement;
	return active instanceof HTMLElement && active !== document.body ? active : null;
}

/** Sonner's own region, for a dialog opened without our `Toaster`; found by Sonner's default label. */
function findToasterRegion() {
	return document.querySelector<HTMLElement>('section[aria-live="polite"][aria-label^="Notifications"]');
}

// ---------------------------------------------------------------------------------------------------------------------
// The dialog
// ---------------------------------------------------------------------------------------------------------------------

function ToastDetailsDialog({
	details,
	regionRef,
	onClosed,
}: {
	details: ToastDetails;
	regionRef?: RegionRef;
	onClosed: () => void;
}) {
	const { title, description, trigger } = details;
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

	// Focus goes back to the control that opened the dialog while it is still on the page. A toast that timed out while
	// the dialog was open took that control with it, and the toaster's region is the nearest place left; failing that,
	// the browser's default.
	const finalFocus = () => (trigger?.isConnected ? trigger : (regionRef?.current ?? findToasterRegion() ?? true));

	return (
		<Dialog open={open} onOpenChange={setOpen} onOpenChangeComplete={(isOpen) => !isOpen && onClosed()}>
			<DialogPopup className='max-w-2xl' finalFocus={finalFocus}>
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

// ---------------------------------------------------------------------------------------------------------------------
// Where it is shown
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Shows the dialog opened by `openToastDetails`. `Toaster` renders it next to Sonner, and that placement is the point:
 *
 * - It is not below Sonner in the React tree, so Sonner never sees its events. Sonner reads pointer and hover events
 *   from everything beneath it, portals included: a dialog inside the toast would vanish when the toast's timer ran out
 *   (a keyboard or screen-reader user has no pointer holding it open), a drag inside it would read as a swipe that
 *   dismisses the toast, and it would keep the toaster in its hover state long after it closed.
 * - It is inside whatever the app wrapped `Toaster` in, so it gets the app's providers: Base UI's `DirectionProvider`,
 *   motion settings, the portal context, a theme or an i18n provider.
 *
 * With several toasters mounted, the first one shows the dialog.
 */
export function ToastDetailsHost({ regionRef }: { regionRef?: RegionRef }) {
	const id = useId();
	const { details, hosts } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

	useEffect(() => registerHost(id), [id]);

	if (!details || hosts[0] !== id) return null;
	return <ToastDetailsDialog details={details} regionRef={regionRef} onClosed={closeDetails} />;
}

/**
 * Without a host, in a React root of its own on `document.body`: for an app that mounts Sonner's `Toaster` directly
 * instead of ours. It works the same, but a root of its own does not inherit the app's providers, and when the toast
 * is gone focus can only fall back to the region of Sonner's default label.
 */
function openInOwnRoot(details: ToastDetails) {
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

	root.render(<ToastDetailsDialog details={details} onClosed={dispose} />);
}

/**
 * Opens the full text of a toast in a dialog.
 *
 * The toaster shows it when one of ours is mounted, and `trigger` (default: the focused element) gets focus back on
 * close. See `ToastDetailsHost` for why the toast itself must not render the dialog, and `openInOwnRoot` for the
 * fallback when no toaster of ours is mounted.
 */
export function openToastDetails(details: ToastDetails) {
	if (typeof document === 'undefined') return;

	const request = { ...details, trigger: details.trigger ?? currentFocus() };
	const { details: open, hosts } = getSnapshot();
	if (hosts.length === 0) {
		openInOwnRoot(request);
		return;
	}
	// One at a time here too.
	if (!open) update({ hosts, details: request });
}
