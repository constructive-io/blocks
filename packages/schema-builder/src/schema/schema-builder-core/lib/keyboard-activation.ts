import type { KeyboardEvent } from 'react';

export function handleActivationKeyDown(
	event: KeyboardEvent<HTMLElement>,
	activate: () => void,
	disabled = false,
) {
	if (event.target !== event.currentTarget || disabled) return;
	if (event.key === 'Enter' || event.key === ' ') {
		event.preventDefault();
		activate();
	}
}
