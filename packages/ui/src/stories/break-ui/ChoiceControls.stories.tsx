import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { DirectionProvider } from '@base-ui/react/direction-provider';
import { BoldIcon } from 'lucide-react';

import { Checkbox } from '../../components/checkbox';
import { CheckboxGroup } from '../../components/checkbox-group';
import { FieldRow } from '../../components/field';
import { Label } from '../../components/label';
import { Radio, RadioGroup } from '../../components/radio-group';
import { Slider } from '../../components/slider';
import { Switch } from '../../components/switch';
import { Toggle } from '../../components/toggle';
import { ToggleGroup, ToggleGroupItem } from '../../components/toggle-group';
import { caption } from './b-fixtures';
import { pickDataset } from './dataset';
import { emails, identifiers, labels, manyRows } from './worst-case';

const meta: Meta = {
	title: 'Break UI/ChoiceControls',
	parameters: { breakUi: { states: ['demo', 'worst', 'empty', 'one', 'huge'] } },
};
export default meta;

type Choice = { value: string; label: string; description?: string };

const demo: Choice[] = [
	{ value: 'email', label: 'Email notifications', description: 'Get a digest each morning.' },
	{ value: 'push', label: 'Push notifications', description: 'Only for mentions.' },
	{ value: 'sms', label: 'SMS' },
];
const worst: Choice[] = [
	{ value: 'a', label: labels.longDescription.slice(0, 190), description: labels.longDescription.slice(190, 420) },
	{ value: 'b', label: labels.german, description: labels.status },
	{ value: 'c', label: emails.long, description: identifiers.url },
	{ value: 'd', label: identifiers.fileName },
	{ value: 'e', label: labels.french, description: labels.jobTitle },
	{ value: 'f', label: identifiers.snakeIdentifier },
	{ value: 'g', label: 'J' },
	{ value: 'h', label: labels.blank },
	{ value: 'i', label: labels.markup },
];
const huge: Choice[] = manyRows(1000, (index) => ({
	value: `perm_${index + 1}`,
	label: `Permission ${index + 1}: ${identifiers.snakeIdentifier}`,
	description: index % 4 === 0 ? labels.status : undefined,
}));

const ranges = {
	demo: ['1h', '24h', '7d', '30d'],
	worst: ['Letzte 24 Stunden', 'Letzte 7 Tage', 'Letzte 30 Tage', 'Letzte 90 Tage', 'Letzte 12 Monate', 'Gesamter Zeitraum'],
	toggle: { demo: 'Bold', worst: labels.longTag },
};

function Cell({ title, width, children }: { title: string; width: number; children: ReactNode }) {
	return (
		<div style={{ width, maxWidth: '100%' }}>
			<div style={caption}>{title}</div>
			{children}
		</div>
	);
}

/** The composition most consumers copy: control, then a label (and optional description) beside it. */
function Row({ choice, control, align, id }: { choice: Choice; control: ReactNode; align: 'center' | 'start'; id: string }) {
	return (
		<div className={`flex gap-2 ${align === 'start' ? 'items-start' : 'items-center'}`}>
			{control}
			<div className="grid gap-1 leading-none">
				<Label htmlFor={id}>{choice.label}</Label>
				{choice.description && <p className="text-muted-foreground text-xs">{choice.description}</p>}
			</div>
		</div>
	);
}

export const Stress: StoryObj = {
	render: (_args, context) => {
		const data = pickDataset(context, {
			demo,
			worst,
			empty: [] as Choice[],
			one: demo.slice(0, 1),
			huge,
		});
		const rangeLabels = pickDataset(context, { demo: ranges.demo, worst: ranges.worst });
		const toggleLabel = pickDataset(context, { demo: ranges.toggle.demo, worst: ranges.toggle.worst });
		// Only the checkbox group carries the full list; the other cells would repeat 1,000 controls each.
		const few = data.slice(0, 12);

		return (
			<div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 56 }}>
				<Cell title="Checkbox rows, 280px, items-center (as in the library stories)" width={280}>
					<div style={{ display: 'grid', gap: 12 }} data-testid="cc-checkbox-center">
						{few.map((choice) => (
							<Row
								key={choice.value}
								choice={choice}
								align="center"
								id={`row-c-${choice.value}`}
								control={<Checkbox id={`row-c-${choice.value}`} defaultChecked={choice.value === 'a'} />}
							/>
						))}
					</div>
				</Cell>

				<Cell title="Checkbox rows, 280px, items-start" width={280}>
					<CheckboxGroup data-testid="cc-checkbox-start" defaultValue={data.slice(0, 1).map((choice) => choice.value)}>
						{data.map((choice) => (
							<Row
								key={choice.value}
								choice={choice}
								align="start"
								id={`row-${choice.value}`}
								control={<Checkbox id={`row-${choice.value}`} value={choice.value} />}
							/>
						))}
					</CheckboxGroup>
				</Cell>

				<Cell title="Radio rows, 280px, items-start" width={280}>
					<RadioGroup data-testid="cc-radio" defaultValue={few[0]?.value}>
						{few.map((choice) => (
							<Row
								key={choice.value}
								choice={choice}
								align="start"
								id={`row-r-${choice.value}`}
								control={<Radio id={`row-r-${choice.value}`} value={choice.value} />}
							/>
						))}
					</RadioGroup>
				</Cell>

				<Cell title="Switch rows (label start, switch end), 320px" width={320}>
					<div style={{ display: 'grid', gap: 12 }} data-testid="cc-switch-end">
						{few.map((choice) => (
							<div key={choice.value} className="flex items-center justify-between gap-3">
								<div className="grid gap-1 leading-none">
									<Label htmlFor={`sw-${choice.value}`}>{choice.label}</Label>
									{choice.description && <p className="text-muted-foreground text-xs">{choice.description}</p>}
								</div>
								<Switch id={`sw-${choice.value}`} defaultChecked />
							</div>
						))}
					</div>
				</Cell>

				<Cell title="Switch rows, items-start, 280px" width={280}>
					<div style={{ display: 'grid', gap: 12 }} data-testid="cc-switch-start">
						{few.map((choice) => (
							<Row
								key={choice.value}
								choice={choice}
								align="start"
								id={`row-sw-${choice.value}`}
								control={<Switch id={`row-sw-${choice.value}`} defaultChecked />}
							/>
						))}
					</div>
				</Cell>

				<Cell title="FieldRow (library composition) with Switch + Checkbox, 280px" width={280}>
					<div style={{ display: 'grid', gap: 12 }} data-testid="cc-fieldrow">
						{data.slice(0, 3).map((choice) => (
							<FieldRow key={choice.value} label={choice.label} description={choice.description}>
								<Checkbox />
							</FieldRow>
						))}
						{data.slice(0, 3).map((choice) => (
							<FieldRow key={`s-${choice.value}`} label={choice.label} description={choice.description}>
								<Switch />
							</FieldRow>
						))}
					</div>
				</Cell>

				<Cell title="Toggle with long label + ToggleGroup of ranges, 320px" width={320}>
					<div style={{ display: 'grid', gap: 12 }}>
						<Toggle variant="outline" data-testid="cc-toggle">
							<BoldIcon />
							{toggleLabel}
						</Toggle>
						<ToggleGroup defaultValue={[rangeLabels[1]]} variant="outline" data-testid="cc-togglegroup" aria-label="Range">
							{rangeLabels.map((range) => (
								<ToggleGroupItem key={range} value={range}>
									{range}
								</ToggleGroupItem>
							))}
						</ToggleGroup>
						<ToggleGroup defaultValue={[rangeLabels[1]]} spacing={1} data-testid="cc-togglegroup-spaced" aria-label="Range">
							{rangeLabels.map((range) => (
								<ToggleGroupItem key={range} value={range}>
									{range}
								</ToggleGroupItem>
							))}
						</ToggleGroup>
					</div>
				</Cell>

				<Cell title="Slider: out-of-range value, min = max, huge range, two thumbs on one value, 280px" width={280}>
					<div style={{ display: 'grid', gap: 24 }}>
						<Slider defaultValue={142} min={0} max={100} aria-label="Over the maximum" data-testid="cc-slider-over" />
						<Slider defaultValue={5} min={5} max={5} aria-label="Min equals max" data-testid="cc-slider-flat" />
						<Slider defaultValue={1_000_000} min={0} max={1_000_000_000} step={1000} aria-label="Huge" />
						<Slider defaultValue={[50, 50]} min={0} max={100} aria-label="Range" data-testid="cc-slider-pair" />
						<Slider defaultValue={[100, 100]} min={0} max={100} aria-label="Range at max" data-testid="cc-slider-pair-max" />
					</div>
				</Cell>

				<Cell title="Fix check: the same sliders inside Base UI DirectionProvider (matches the document direction)" width={280}>
					<DirectionProvider direction={context.globals.direction === 'rtl' ? 'rtl' : 'ltr'}>
						<div style={{ display: 'grid', gap: 24 }}>
							<Slider defaultValue={100} min={0} max={100} aria-label="At the maximum" data-testid="cc-slider-dir-max" />
							<Slider defaultValue={[50, 50]} min={0} max={100} aria-label="Range" data-testid="cc-slider-dir-pair" />
						</div>
					</DirectionProvider>
				</Cell>
			</div>
		);
	},
};
