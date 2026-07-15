import { Fragment, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Search } from 'lucide-react';

import {
	Combobox,
	ComboboxChips,
	ComboboxChip,
	ComboboxCollection,
	ComboboxEmpty,
	ComboboxGroup,
	ComboboxGroupLabel,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
	ComboboxPopup,
	ComboboxSeparator,
	ComboboxValue,
} from '../components/combobox';
import { Label } from '../components/label';

const meta: Meta<typeof Combobox> = {
	title: 'UI/Combobox',
	component: Combobox,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

type Item = {
	value: string;
	label: string;
};

const fruits: Item[] = [
	{ value: 'apple', label: 'Apple' },
	{ value: 'banana', label: 'Banana' },
	{ value: 'blueberry', label: 'Blueberry' },
	{ value: 'grapes', label: 'Grapes' },
	{ value: 'pineapple', label: 'Pineapple' },
	{ value: 'strawberry', label: 'Strawberry' },
	{ value: 'watermelon', label: 'Watermelon' },
];

export const Default: Story = {
	render: () => (
		<div className='w-[280px]'>
			<Combobox items={fruits}>
				<ComboboxInput placeholder='Select a fruit...' />
				<ComboboxPopup>
					<ComboboxEmpty>No fruit found.</ComboboxEmpty>
					<ComboboxList>
						{(item: Item) => (
							<ComboboxItem key={item.value} value={item}>
								{item.label}
							</ComboboxItem>
						)}
					</ComboboxList>
				</ComboboxPopup>
			</Combobox>
		</div>
	),
};

export const WithLabel: Story = {
	render: () => (
		<div className='w-[280px] space-y-1.5'>
			<Label>Favorite fruit</Label>
			<Combobox items={fruits}>
				<ComboboxInput placeholder='Select a fruit...' />
				<ComboboxPopup>
					<ComboboxEmpty>No fruit found.</ComboboxEmpty>
					<ComboboxList>
						{(item: Item) => (
							<ComboboxItem key={item.value} value={item}>
								{item.label}
							</ComboboxItem>
						)}
					</ComboboxList>
				</ComboboxPopup>
			</Combobox>
		</div>
	),
};

export const WithClear: Story = {
	render: () => (
		<div className='w-[280px]'>
			<Combobox items={fruits}>
				<ComboboxInput placeholder='Select a fruit...' showClear />
				<ComboboxPopup>
					<ComboboxEmpty>No fruit found.</ComboboxEmpty>
					<ComboboxList>
						{(item: Item) => (
							<ComboboxItem key={item.value} value={item}>
								{item.label}
							</ComboboxItem>
						)}
					</ComboboxList>
				</ComboboxPopup>
			</Combobox>
		</div>
	),
};

export const WithStartAddon: Story = {
	render: () => (
		<div className='w-[280px]'>
			<Combobox items={fruits}>
				<ComboboxInput placeholder='Search fruits...' startAddon={<Search />} />
				<ComboboxPopup>
					<ComboboxEmpty>No fruit found.</ComboboxEmpty>
					<ComboboxList>
						{(item: Item) => (
							<ComboboxItem key={item.value} value={item}>
								{item.label}
							</ComboboxItem>
						)}
					</ComboboxList>
				</ComboboxPopup>
			</Combobox>
		</div>
	),
};

type Group = {
	label: string;
	items: Item[];
};

const groupedItems: Group[] = [
	{
		label: 'Fruits',
		items: [
			{ value: 'apple', label: 'Apple' },
			{ value: 'banana', label: 'Banana' },
			{ value: 'orange', label: 'Orange' },
		],
	},
	{
		label: 'Vegetables',
		items: [
			{ value: 'carrot', label: 'Carrot' },
			{ value: 'broccoli', label: 'Broccoli' },
			{ value: 'spinach', label: 'Spinach' },
		],
	},
];

export const WithGroups: Story = {
	render: () => (
		<div className='w-[280px]'>
			<Combobox items={groupedItems}>
				<ComboboxInput placeholder='Search food...' />
				<ComboboxPopup>
					<ComboboxEmpty>No items found.</ComboboxEmpty>
					<ComboboxList>
						{(group: Group) => (
								<Fragment key={group.label}>
								<ComboboxGroup items={group.items}>
									<ComboboxGroupLabel>{group.label}</ComboboxGroupLabel>
									<ComboboxCollection>
										{(item: Item) => (
											<ComboboxItem key={item.value} value={item}>
												{item.label}
											</ComboboxItem>
										)}
									</ComboboxCollection>
								</ComboboxGroup>
								<ComboboxSeparator />
								</Fragment>
						)}
					</ComboboxList>
				</ComboboxPopup>
			</Combobox>
		</div>
	),
};

export const MultipleSelection: Story = {
	render: () => (
		<div className='w-[380px]'>
			<Combobox items={fruits} multiple>
				<ComboboxChips>
					<ComboboxValue>
						{(selected: Item[]) =>
							selected.map((item) => <ComboboxChip key={item.value}>{item.label}</ComboboxChip>)
						}
					</ComboboxValue>
					<ComboboxInput placeholder='Select fruits...' />
				</ComboboxChips>
				<ComboboxPopup>
					<ComboboxEmpty>No items found.</ComboboxEmpty>
					<ComboboxList>
						{(item: Item) => (
							<ComboboxItem key={item.value} value={item}>
								{item.label}
							</ComboboxItem>
						)}
					</ComboboxList>
				</ComboboxPopup>
			</Combobox>
		</div>
	),
};

export const Sizes: Story = {
	render: () => (
		<div className='w-[280px] space-y-4'>
			<div className='space-y-1.5'>
				<Label>Small</Label>
				<Combobox items={fruits.slice(0, 3)}>
					<ComboboxInput placeholder='Small...' size='sm' />
					<ComboboxPopup>
						<ComboboxEmpty>No items found.</ComboboxEmpty>
						<ComboboxList>
							{(item: Item) => (
								<ComboboxItem key={item.value} value={item}>
									{item.label}
								</ComboboxItem>
							)}
						</ComboboxList>
					</ComboboxPopup>
				</Combobox>
			</div>

			<div className='space-y-1.5'>
				<Label>Default</Label>
				<Combobox items={fruits.slice(0, 3)}>
					<ComboboxInput placeholder='Default...' size='default' />
					<ComboboxPopup>
						<ComboboxEmpty>No items found.</ComboboxEmpty>
						<ComboboxList>
							{(item: Item) => (
								<ComboboxItem key={item.value} value={item}>
									{item.label}
								</ComboboxItem>
							)}
						</ComboboxList>
					</ComboboxPopup>
				</Combobox>
			</div>

			<div className='space-y-1.5'>
				<Label>Large</Label>
				<Combobox items={fruits.slice(0, 3)}>
					<ComboboxInput placeholder='Large...' size='lg' />
					<ComboboxPopup>
						<ComboboxEmpty>No items found.</ComboboxEmpty>
						<ComboboxList>
							{(item: Item) => (
								<ComboboxItem key={item.value} value={item}>
									{item.label}
								</ComboboxItem>
							)}
						</ComboboxList>
					</ComboboxPopup>
				</Combobox>
			</div>
		</div>
	),
};

export const Controlled: Story = {
	render: function ControlledExample() {
		const [value, setValue] = useState<Item | null>(null);

		return (
			<div className='w-[280px] space-y-3'>
				<Combobox items={fruits} value={value} onValueChange={setValue}>
					<ComboboxInput placeholder='Select a fruit...' showClear />
					<ComboboxPopup>
						<ComboboxEmpty>No fruit found.</ComboboxEmpty>
						<ComboboxList>
							{(item: Item) => (
								<ComboboxItem key={item.value} value={item}>
									{item.label}
								</ComboboxItem>
							)}
						</ComboboxList>
					</ComboboxPopup>
				</Combobox>
				<p className='text-muted-foreground text-sm'>Value: {value?.label ?? 'none'}</p>
			</div>
		);
	},
};
