import type { Meta, StoryObj } from '@storybook/react-vite';
import { CheckIcon } from 'lucide-react';

import { Badge } from '../../components/badge';
import { pickDataset } from './dataset';
import { Frame } from './group-a-frame';
import { labels, manyRows, names, tags } from './worst-case';

const meta: Meta = {
	title: 'Break UI/Badge',
	parameters: { breakUi: { states: ['demo', 'worst', 'empty', 'one', 'huge'] } },
};
export default meta;

type Variant = NonNullable<React.ComponentProps<typeof Badge>['variant']>;
const variants: Variant[] = ['default', 'secondary', 'outline', 'destructive', 'error', 'info', 'success', 'warning'];

const demoTags = ['design', 'frontend', 'q3'];

// Statuses and counts as they arrive from data: long, translated, empty, unformatted.
const worstStatuses: Array<{ note: string; text: React.ReactNode; variant: Variant }> = [
	{ note: 'long status', text: labels.status, variant: 'warning' },
	{ note: 'German compound', text: labels.german, variant: 'info' },
	{ note: 'French expansion', text: labels.french, variant: 'secondary' },
	{ note: 'long tag', text: labels.longTag, variant: 'outline' },
	{ note: 'one letter', text: 'J', variant: 'default' },
	{ note: 'one digit', text: 1, variant: 'default' },
	{ note: 'zero', text: 0, variant: 'secondary' },
	{ note: 'capped count', text: '99+', variant: 'error' },
	{ note: 'formatted count', text: '1,284', variant: 'success' },
	{ note: 'unformatted count', text: 1000000, variant: 'success' },
	{ note: 'undefined count', text: undefined, variant: 'info' },
	{ note: 'blank string', text: labels.blank, variant: 'warning' },
	{ note: 'markup as text', text: labels.markup, variant: 'outline' },
	{ note: 'newline', text: labels.multiline, variant: 'secondary' },
	{ note: 'Vietnamese', text: 'Đặng Thị Ngọc Hân', variant: 'default' },
	{ note: 'Thai', text: 'ผู้ดูแลระบบสูงสุด', variant: 'info' },
	{ note: 'Arabic', text: 'مدير النظام', variant: 'success' },
	{ note: 'CJK', text: '管理者権限', variant: 'warning' },
	{ note: 'emoji first', text: names.emojiFirst, variant: 'secondary' },
	{ note: 'ZWJ emoji', text: names.zwjEmoji, variant: 'outline' },
];

function StatusRow({ name, badge }: { name: string; badge: React.ReactNode }) {
	return (
		<div className="flex items-center gap-2 px-2 py-2">
			<span className="min-w-0 flex-1 truncate text-sm font-medium">{name}</span>
			{badge}
		</div>
	);
}

export const Stress: StoryObj = {
	render: (_args, context) => {
		const mode = context.globals.dataset as string | undefined;
		const tagList = pickDataset(context, {
			demo: demoTags,
			worst: [...tags],
			empty: [] as string[],
			one: [demoTags[0]],
			huge: manyRows(1000, (i) => `label-${i + 1}`),
		});

		return (
			<div style={{ display: 'flex', flexDirection: 'column' }}>
				<Frame width={280} label="Status badge beside a name in a 280px row">
					{mode === 'worst' ? (
						<>
							<StatusRow name={names.longHyphenated} badge={<Badge variant="warning">{labels.status}</Badge>} />
							<StatusRow name={names.twoLetters} badge={<Badge variant="success">Active</Badge>} />
							<StatusRow name={names.compound} badge={<Badge variant="error">{labels.german}</Badge>} />
						</>
					) : (
						<StatusRow name="Jane Doe" badge={<Badge variant="success">Active</Badge>} />
					)}
				</Frame>

				{mode === 'worst' ? (
					<>
						<Frame width={160} label="Same values in a 160px cell (list column / narrow card)">
							<div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 6 }}>
								{worstStatuses.slice(0, 4).map((s) => (
									<div key={s.note}>
										<Badge variant={s.variant}>{s.text}</Badge>
									</div>
								))}
							</div>
						</Frame>

						<Frame width={420} label="Each value as a plain inline badge (wrapped row)">
							<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 8, alignItems: 'center' }}>
								{worstStatuses.map((s) => (
									<span key={s.note} title={s.note} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, maxWidth: '100%' }}>
										<Badge variant={s.variant}>{s.text}</Badge>
										<span style={{ font: '9px/1.2 system-ui, sans-serif', color: '#737373' }}>{s.note}</span>
									</span>
								))}
							</div>
						</Frame>

						<Frame width={420} label="Variants × sizes">
							<div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 8 }}>
								{(['sm', 'default', 'lg'] as const).map((size) => (
									<div key={size} style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
										{variants.map((variant) => (
											<Badge key={variant} variant={variant} size={size}>
												<CheckIcon />
												{variant}
											</Badge>
										))}
									</div>
								))}
							</div>
						</Frame>
					</>
				) : null}

				<Frame width={280} label={`Tag wall in a 280px column (${tagList.length} tags)`}>
					<div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: 8 }}>
						{tagList.map((tag) => (
							<Badge key={tag} variant="outline">
								{tag}
							</Badge>
						))}
					</div>
				</Frame>

				<Frame width={240} label="Tag wall in a 240px column">
					<div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: 8 }}>
						{mode === 'worst' ? <Badge variant="outline">{labels.longTag}</Badge> : <Badge variant="outline">q3</Badge>}
					</div>
				</Frame>
			</div>
		);
	},
};
