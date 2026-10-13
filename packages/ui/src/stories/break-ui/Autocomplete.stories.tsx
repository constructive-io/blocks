import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { SearchIcon } from 'lucide-react';

import {
	Autocomplete,
	AutocompleteEmpty,
	AutocompleteInput,
	AutocompleteItem,
	AutocompleteList,
	AutocompletePopup,
} from '../../components/autocomplete';
import { caption, demoOptions, manyOptions, worstOptions, type Option } from './b-fixtures';
import { pickDataset } from './dataset';
import { emails } from './worst-case';

const meta: Meta = {
	title: 'Break UI/Autocomplete',
	parameters: { breakUi: { states: ['demo', 'worst', 'empty', 'one', 'huge'] } },
};
export default meta;

const demo = { options: demoOptions, typed: 'ed' };
const worst = { options: worstOptions, typed: emails.long };

function Cell({ title, width, children }: { title: string; width: number; children: ReactNode }) {
	return (
		<div style={{ width, maxWidth: '100%' }}>
			<div style={caption}>{title}</div>
			{children}
		</div>
	);
}

function OptionList() {
	return (
		<AutocompleteList>
			{(item: Option) => (
				<AutocompleteItem key={item.value} value={item}>
					{item.label}
				</AutocompleteItem>
			)}
		</AutocompleteList>
	);
}

export const Stress: StoryObj = {
	render: (_args, context) => {
		const data = pickDataset(context, {
			demo,
			worst,
			empty: { options: [], typed: '' },
			one: { options: [demoOptions[0]], typed: '' },
			huge: { options: manyOptions, typed: '' },
		});

		return (
			<div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 56 }}>
				<Cell title="Form field 320px, long typed text, clear + trigger" width={320}>
					<Autocomplete items={data.options} defaultValue={data.typed}>
						<AutocompleteInput placeholder="Search" showClear showTrigger data-testid="ac-form" />
						<AutocompletePopup>
							<AutocompleteEmpty>No results found.</AutocompleteEmpty>
							<OptionList />
						</AutocompletePopup>
					</Autocomplete>
				</Cell>

				<Cell title="Sidebar 240px, start addon, long placeholder" width={240}>
					<Autocomplete items={data.options}>
						<AutocompleteInput
							placeholder="Search workspaces, people, and billing accounts"
							startAddon={<SearchIcon />}
							data-testid="ac-sidebar"
						/>
						<AutocompletePopup>
							<AutocompleteEmpty>No results found.</AutocompleteEmpty>
							<OptionList />
						</AutocompletePopup>
					</Autocomplete>
				</Cell>
			</div>
		);
	},
};
