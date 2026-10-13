import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { UserIcon } from 'lucide-react';

import {
	Select,
	SelectContent,
	SelectFieldItem,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectRichItem,
	SelectTrigger,
	SelectValue,
} from '../../components/select';
import { caption, demoOptions, manyOptions, worstOptions, type Option } from './b-fixtures';
import { pickDataset } from './dataset';
import { identifiers } from './worst-case';

const meta: Meta = {
	title: 'Break UI/Select',
	parameters: { breakUi: { states: ['demo', 'worst', 'empty', 'one', 'huge'] } },
};
export default meta;

type Fields = { name: string; type: string }[];

const demo = {
	options: demoOptions,
	selected: 'editor' as string | undefined,
	fields: [
		{ name: 'id', type: 'uuid' },
		{ name: 'created_at', type: 'timestamptz' },
	] as Fields,
};
const worst = {
	options: worstOptions,
	selected: 'job' as string | undefined,
	fields: [
		{ name: identifiers.snakeIdentifier, type: 'timestamp with time zone' },
		{ name: 'customer_subscription_billing_adjustment_line_items_total_amount_cents', type: 'numeric(38,18)[]' },
		{ name: 'id', type: 'uuid' },
	] as Fields,
};

function Cell({ title, width, children }: { title: string; width: number; children: ReactNode }) {
	return (
		<div style={{ width, maxWidth: '100%' }}>
			<div style={caption}>{title}</div>
			{children}
		</div>
	);
}

function Items({ options }: { options: Option[] }) {
	return (
		<>
			{options.map((option) => (
				<SelectItem key={option.value} value={option.value}>
					{option.label}
				</SelectItem>
			))}
		</>
	);
}

export const Stress: StoryObj = {
	render: (_args, context) => {
		const data = pickDataset(context, {
			demo,
			worst,
			empty: { ...demo, options: [], selected: undefined, fields: [] },
			one: { ...demo, options: [demoOptions[0]], selected: 'viewer' },
			huge: { ...worst, options: manyOptions, selected: 'ws_0777' },
		});
		const { options, selected, fields } = data;
		// Look up the label the way a consumer would when they know the selected option.
		const items = options.map((option) => ({ value: option.value, label: option.label }));

		return (
			<div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 56 }}>
				<Cell title="Form field 320px, selected value, no items prop (labels read from the declared items)" width={320}>
					<Select defaultValue={selected}>
						<SelectTrigger data-testid="select-plain">
							<SelectValue placeholder="Pick a role" />
						</SelectTrigger>
						<SelectContent>
							{options.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</Cell>

				<Cell title="Sidebar 240px, selected value, items prop supplied" width={240}>
					<Select defaultValue={selected} items={items}>
						<SelectTrigger data-testid="select-items">
							<SelectValue placeholder="Pick a role" />
						</SelectTrigger>
						<SelectContent>
							<Items options={options} />
						</SelectContent>
					</Select>
				</Cell>

				<Cell title="Table-header filter 120px" width={120}>
					<Select defaultValue={selected} items={items}>
						<SelectTrigger size="sm" data-testid="select-120">
							<SelectValue placeholder="Role" />
						</SelectTrigger>
						<SelectContent>
							<Items options={options} />
						</SelectContent>
					</Select>
				</Cell>

				<Cell title="Small trigger 280px with long placeholder" width={280}>
					<Select>
						<SelectTrigger size="sm" data-testid="select-sm">
							<SelectValue placeholder="Select a notification delivery channel for this workspace" />
						</SelectTrigger>
						<SelectContent>
							<Items options={options} />
						</SelectContent>
					</Select>
				</Cell>

				<Cell title="Rich items (label + description + icon) 320px" width={320}>
					<Select defaultValue={selected} items={items}>
						<SelectTrigger data-testid="select-rich">
							<SelectValue placeholder="Pick a role" />
						</SelectTrigger>
						<SelectContent>
							{options.map((option) => (
								<SelectRichItem
									key={option.value}
									value={option.value}
									label={option.label}
									description={option.description}
									icon={<UserIcon />}
								/>
							))}
						</SelectContent>
					</Select>
				</Cell>

				<Cell title="Field items (name + type) 280px" width={280}>
					<Select defaultValue={fields[0]?.name} items={fields.map((field) => ({ value: field.name, label: field.name }))}>
						<SelectTrigger data-testid="select-fields">
							<SelectValue placeholder="Pick a column" />
						</SelectTrigger>
						<SelectContent>
							{fields.map((field) => (
								<SelectFieldItem key={field.name} value={field.name} name={field.name} type={field.type} />
							))}
						</SelectContent>
					</Select>
				</Cell>

				<Cell title="Grouped, long group label 280px" width={280}>
					<Select defaultValue={selected} items={items}>
						<SelectTrigger data-testid="select-grouped">
							<SelectValue placeholder="Pick a role" />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								<SelectLabel>Workspace roles inherited from the Northwind Industries Holdings organization</SelectLabel>
								<Items options={options.slice(0, Math.ceil(options.length / 2))} />
							</SelectGroup>
							<SelectGroup>
								<SelectLabel>Custom</SelectLabel>
								<Items options={options.slice(Math.ceil(options.length / 2))} />
							</SelectGroup>
						</SelectContent>
					</Select>
				</Cell>
			</div>
		);
	},
};
