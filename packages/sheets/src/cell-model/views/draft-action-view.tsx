// Native DOM view for the `draft-action` column — the REAL <Button> that replaces
// the canvas fake-button painter (grid/custom-cells/draft-action-cell.tsx, which
// snapshot-captured @constructive-io/ui button styles into a canvas paint via
// captureButtonStyle/BUTTON_STYLE_CACHE). Mirrors that painter's states 1:1:
//   - idle    -> outline button labelled "Save"
//   - saving  -> disabled, spinner + "Saving..." (canvas drew an animated arc)
//   - errored -> red dot indicator top-right; the button stays interactive
//                (the canvas painter never disabled on `errored`)
// The host special-cases this column and passes these explicit props instead of the
// generic CellProps, so the view stays a dumb presenter and onClick -> onSubmit().

import { LoaderIcon } from 'lucide-react';

import { Button } from '@constructive-io/ui/button';
import { cn } from '../../utils/cn';

export type DraftActionStatus = 'idle' | 'saving' | 'error';

export interface DraftActionCellViewProps {
	status?: DraftActionStatus;
	disabled?: boolean;
	errored?: boolean;
	onSubmit?: () => void;
}

const SAVE_LABEL = 'Save';
const SAVING_LABEL = 'Saving...';

export function DraftActionCellView(props: DraftActionCellViewProps) {
	const status = props.status ?? 'idle';
	const isSaving = status === 'saving';
	// Saving locks the button so a real DOM click can't double-submit mid-flight;
	// the canvas relied on the shell to guard, the DOM disables outright.
	const isDisabled = Boolean(props.disabled) || isSaving;

	return (
		<div className="flex h-full w-full items-center justify-center px-2">
			<Button
				type="button"
				variant="outline"
				size="sm"
				disabled={isDisabled}
				onClick={props.onSubmit}
				data-slot="draft-action-cell"
				className="relative"
			>
				{isSaving && <LoaderIcon className="animate-spin" aria-hidden="true" />}
				{isSaving ? SAVING_LABEL : SAVE_LABEL}
				{props.errored && (
					<span
						data-slot="draft-action-error"
						role="status"
						aria-label="Save failed"
						className={cn(
							'absolute -top-1 -right-1 size-2 rounded-full bg-destructive',
							'ring-2 ring-background',
						)}
					/>
				)}
			</Button>
		</div>
	);
}
