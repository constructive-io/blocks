import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '../../components/button';
import { Kbd, KbdGroup } from '../../components/kbd';
import { Label } from '../../components/label';
import { Separator } from '../../components/separator';
import { Skeleton } from '../../components/skeleton';
import { Spinner } from '../../components/spinner';
import { pickDataset } from './dataset';
import { Frame } from './group-a-frame';
import { labels, manyRows, names } from './worst-case';

/**
 * Quick pass for the pure-visual primitives: Kbd, Label, Separator, Skeleton, Spinner.
 */
const meta: Meta = {
	title: 'Break UI/Primitives',
	parameters: { breakUi: { states: ['demo', 'worst', 'huge'] } },
};
export default meta;

const demoKeys = ['⌘', 'K'];
const worstKeys = ['⌘', 'Shift', 'Esc', 'Backspace', 'Entf', 'Eingabetaste', 'Page Down', 'Caps Lock', 'Print Screen', 'Ctrl + Shift + Alt + Delete'];

function MenuRow({ label, keys }: { label: string; keys: string[] }) {
	return (
		<div className="flex items-center justify-between gap-3 px-2 py-1.5 text-sm">
			<span className="min-w-0 truncate">{label}</span>
			<KbdGroup>
				{keys.map((key) => (
					<Kbd key={key}>{key}</Kbd>
				))}
			</KbdGroup>
		</div>
	);
}

export const Stress: StoryObj = {
	render: (_args, context) => {
		const mode = context.globals.dataset as string | undefined;
		const keys = pickDataset(context, { demo: demoKeys, worst: worstKeys });
		const labelText = pickDataset(context, { demo: 'Email', worst: labels.french + ' et ' + names.longHyphenated });

		return (
			<div style={{ display: 'flex', flexDirection: 'column' }}>
				<Frame width={200} label="Kbd row in a 200px popover: label + keys">
					<MenuRow label={mode === 'worst' ? labels.german : 'Search'} keys={mode === 'worst' ? ['Strg', 'Umschalt', 'Eingabetaste'] : keys.slice(0, 2)} />
				</Frame>

				<Frame width={420} label="Kbd, one per key (420px)">
					<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 8, alignItems: 'center' }}>
						{keys.map((key) => (
							<Kbd key={key}>{key}</Kbd>
						))}
					</div>
				</Frame>

				<Frame width={160} label="Kbd with a two-word label in a squeezed 160px flex row">
					<div className="flex items-center gap-2 p-2 text-sm">
						<span className="shrink-0">Next</span>
						<Kbd>{mode === 'worst' ? 'Page Down' : 'J'}</Kbd>
						<Kbd>{mode === 'worst' ? 'Print Screen' : 'K'}</Kbd>
					</div>
				</Frame>

				<Frame width={240} label="Label with long copy (240px)">
					<Label htmlFor="lbl">{labelText}</Label>
				</Frame>

				<Frame width={280} label="Vertical Separator in an auto-height row vs with an explicit height">
					<div className="flex items-center gap-2 p-2 text-sm">
						<span>Auto height</span>
						<Separator orientation="vertical" data-case="vsep-auto" />
						<span>Next</span>
						<Separator orientation="vertical" className="h-4" data-case="vsep-h4" />
						<span>With h-4</span>
					</div>
				</Frame>

				<Frame width={280} label="Skeleton without any size, then sized (280px)">
					<div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 8 }}>
						<Skeleton data-case="skeleton-bare" />
						<Skeleton className="h-4 w-full" data-case="skeleton-sized" />
						<Skeleton className="size-10 rounded-full" />
					</div>
				</Frame>

				<Frame width={280} label="Spinners: default, in a button, 20 on one page">
					<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 8, alignItems: 'center' }}>
						<Spinner />
						<Button disabled>
							<Spinner />
							{mode === 'worst' ? labels.german : 'Saving'}
						</Button>
						{manyRows(mode === 'worst' ? 20 : 1, (i) => (
							<Spinner key={i} />
						))}
					</div>
				</Frame>

				{mode === 'huge' ? (
					<Frame width={420} label="300 skeleton rows (3 bars each) shimmering at once">
						<div data-case="skeleton-huge" style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 8 }}>
							{manyRows(300, (i) => (
								<div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
									<Skeleton className="size-8 rounded-full" />
									<Skeleton className="h-4 flex-1" />
									<Skeleton className="h-4 w-12" />
								</div>
							))}
						</div>
					</Frame>
				) : null}
			</div>
		);
	},
};
