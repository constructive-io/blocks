'use client';

import { CircleAlertIcon } from 'lucide-react';

import { Alert, AlertDescription } from '../alert';
import { Button } from '../button';
import { EmptyState } from '../workspace-kit/surface';
import { errorMessage, type SaveFailure } from './form-values';

/** A rejected write: a sentence for people first, the source's own wording folded away beneath it. */
export function SaveFailureAlert({ failure }: { failure: SaveFailure }) {
	return (
		<Alert role="alert" variant="destructive">
			<AlertDescription className="flex flex-col gap-1 [overflow-wrap:anywhere]">
				<span>{failure.message}</span>
				{failure.detail ? (
					<details className="text-xs opacity-80">
						<summary className="cursor-pointer select-none">Details</summary>
						<span className="mt-1 block font-mono">{failure.detail}</span>
					</details>
				) : null}
			</AlertDescription>
		</Alert>
	);
}

/** A read that failed in place of a screen's content: what could not load, the reason, and a retry. */
export function LoadFailure({ what, error, onRetry }: { what: string; error: unknown; onRetry: () => void }) {
	return (
		<EmptyState
			className="rounded-xl bg-card shadow-card"
			icon={CircleAlertIcon}
			title={`Couldn’t load ${what}`}
			description={<span className="[overflow-wrap:anywhere]">{errorMessage(error)}</span>}
			action={
				<Button size="sm" variant="outline" onClick={onRetry}>
					Try again
				</Button>
			}
		/>
	);
}
