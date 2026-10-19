'use client';

import { Alert, AlertDescription } from '../alert';
import type { SaveFailure } from './form-values';

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
