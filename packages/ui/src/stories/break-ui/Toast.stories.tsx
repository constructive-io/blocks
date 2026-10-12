import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { toast as sonnerToast } from 'sonner';

import { Button } from '../../components/button';
import { Toaster } from '../../components/sonner';
import { toast } from '../../components/toast';
import { getDataset, type Dataset } from './dataset';
import { emails, identifiers, labels, manyRows, names } from './worst-case';

const meta: Meta = {
	title: 'Break UI/Toast',
	parameters: {
		layout: 'fullscreen',
		breakUi: { states: ['demo', 'worst', 'empty', 'one', 'huge'] },
	},
};
export default meta;

const stackTrace = [
	`error: import stopped on row 14 of ${identifiers.snakeIdentifier}.csv`,
	`  reason: external_reference INV-2025-000184 is already used by record ${identifiers.uuid}.`,
	'  at importRows (import-invoices.ts:88)',
].join('\n');

/** Fire the toasts for a dataset. Each variant gets a different realistic failure. */
function fire(dataset: Dataset) {
	if (dataset === 'empty') return;

	if (dataset === 'demo') {
		toast.info({ message: 'Sync started', description: 'Results may lag briefly.' });
		return;
	}

	if (dataset === 'one') {
		toast.error({ message: 'Import failed', description: stackTrace, action: { label: 'Retry', onClick: () => {} } });
		return;
	}

	if (dataset === 'huge') {
		manyRows(25, (i) => {
			const kinds = [toast.success, toast.info, toast.warning, toast.error] as const;
			kinds[i % 4]({ message: `Imported batch ${i + 1} of 25`, description: i % 2 ? names.longHyphenated : labels.status });
		});
		return;
	}

	// Each variant gets an unbreakable string in its first line, the way a file or field name arrives.
	toast.success({
		message: identifiers.cameraFile,
		description: identifiers.uuid,
		action: { label: 'Copy link', onClick: () => {} },
	});
	toast.info({ message: identifiers.snakeIdentifier, description: labels.longDescription });
	toast.warning({
		message: labels.german,
		description: identifiers.snakeIdentifier,
		action: { label: 'Rückgängig machen und zurück zu den Einstellungen', onClick: () => {} },
	});
	toast.error({
		message: identifiers.cameraFile,
		description: `${identifiers.snakeIdentifier}\n${stackTrace}`,
		action: { label: 'Retry', onClick: () => {} },
	});
	toast.error({ message: names.longSuffix, description: emails.long });
	sonnerToast(identifiers.cameraFile, { description: identifiers.url });
	toast.info({ message: labels.markup, description: labels.multiline });
}

function ToastLab({ dataset, expand }: { dataset: Dataset; expand: boolean }) {
	useEffect(() => {
		sonnerToast.dismiss();
		const timer = window.setTimeout(() => fire(dataset), 50);
		return () => {
			window.clearTimeout(timer);
			sonnerToast.dismiss();
		};
	}, [dataset]);

	return (
		<div className="p-4">
			<Toaster position="top-right" duration={600_000} expand={expand} visibleToasts={expand ? 40 : 3} />
			<div className="flex flex-wrap gap-2">
				<Button variant="outline" onClick={() => fire(dataset)}>
					Fire again
				</Button>
				<Button variant="outline" onClick={() => sonnerToast.dismiss()}>
					Dismiss all
				</Button>
			</div>
		</div>
	);
}

/** Every toast expanded, so each one can be read on its own. */
export const Stress: StoryObj = {
	render: (_args, context) => <ToastLab dataset={getDataset(context)} expand />,
};

/** The collapsed stack (Sonner default): back toasts peek behind the front one. */
export const CollapsedStack: StoryObj = {
	parameters: { breakUi: { states: ['demo', 'worst', 'empty', 'one', 'huge'] } },
	render: (_args, context) => <ToastLab dataset={getDataset(context)} expand={false} />,
};
