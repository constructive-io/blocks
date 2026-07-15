import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import {
	Autocomplete,
	AutocompleteInput,
	AutocompletePopup,
	AutocompleteList,
	AutocompleteItem,
	AutocompleteEmpty,
	AutocompleteGroup,
	AutocompleteGroupLabel,
	AutocompleteSeparator,
} from '../components/autocomplete';
import { Label } from '../components/label';

const meta: Meta<typeof Autocomplete> = {
	title: 'UI/Autocomplete',
	component: Autocomplete,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const fruits = [
	{ value: 'apple', label: 'Apple' },
	{ value: 'banana', label: 'Banana' },
	{ value: 'blueberry', label: 'Blueberry' },
	{ value: 'grapes', label: 'Grapes' },
	{ value: 'pineapple', label: 'Pineapple' },
	{ value: 'strawberry', label: 'Strawberry' },
	{ value: 'watermelon', label: 'Watermelon' },
	{ value: 'mango', label: 'Mango' },
	{ value: 'orange', label: 'Orange' },
	{ value: 'kiwi', label: 'Kiwi' },
];

export const Default: Story = {
	render: () => (
		<div className='w-[280px]'>
			<Autocomplete items={fruits}>
				<AutocompleteInput placeholder='Search fruits...' />
				<AutocompletePopup>
					<AutocompleteEmpty>No fruits found.</AutocompleteEmpty>
					<AutocompleteList>
						{(item: (typeof fruits)[0]) => (
							<AutocompleteItem key={item.value} value={item}>
								{item.label}
							</AutocompleteItem>
						)}
					</AutocompleteList>
				</AutocompletePopup>
			</Autocomplete>
		</div>
	),
};

export const WithLabel: Story = {
	render: () => (
		<div className='w-[280px] space-y-1.5'>
			<Label>Favorite fruit</Label>
			<Autocomplete items={fruits}>
				<AutocompleteInput placeholder='Search fruits...' />
				<AutocompletePopup>
					<AutocompleteEmpty>No fruits found.</AutocompleteEmpty>
					<AutocompleteList>
						{(item: (typeof fruits)[0]) => (
							<AutocompleteItem key={item.value} value={item}>
								{item.label}
							</AutocompleteItem>
						)}
					</AutocompleteList>
				</AutocompletePopup>
			</Autocomplete>
		</div>
	),
};

export const WithTrigger: Story = {
	render: () => (
		<div className='w-[280px]'>
			<Autocomplete items={fruits}>
				<AutocompleteInput placeholder='Select a fruit...' showTrigger />
				<AutocompletePopup>
					<AutocompleteEmpty>No fruits found.</AutocompleteEmpty>
					<AutocompleteList>
						{(item: (typeof fruits)[0]) => (
							<AutocompleteItem key={item.value} value={item}>
								{item.label}
							</AutocompleteItem>
						)}
					</AutocompleteList>
				</AutocompletePopup>
			</Autocomplete>
		</div>
	),
};

export const WithClear: Story = {
	render: () => (
		<div className='w-[280px]'>
			<Autocomplete items={fruits}>
				<AutocompleteInput placeholder='Search fruits...' showClear />
				<AutocompletePopup>
					<AutocompleteEmpty>No fruits found.</AutocompleteEmpty>
					<AutocompleteList>
						{(item: (typeof fruits)[0]) => (
							<AutocompleteItem key={item.value} value={item}>
								{item.label}
							</AutocompleteItem>
						)}
					</AutocompleteList>
				</AutocompletePopup>
			</Autocomplete>
		</div>
	),
};

type GroupedItem = {
	value: string;
	items: { value: string; label: string }[];
};

const groupedItems: GroupedItem[] = [
	{
		value: 'Fruits',
		items: [
			{ value: 'apple', label: 'Apple' },
			{ value: 'banana', label: 'Banana' },
			{ value: 'orange', label: 'Orange' },
		],
	},
	{
		value: 'Vegetables',
		items: [
			{ value: 'carrot', label: 'Carrot' },
			{ value: 'broccoli', label: 'Broccoli' },
			{ value: 'spinach', label: 'Spinach' },
		],
	},
	{
		value: 'Proteins',
		items: [
			{ value: 'chicken', label: 'Chicken' },
			{ value: 'beef', label: 'Beef' },
			{ value: 'fish', label: 'Fish' },
		],
	},
];

export const WithGroups: Story = {
	render: () => (
		<div className='w-[280px]'>
			<Autocomplete items={groupedItems}>
				<AutocompleteInput placeholder='Search food...' />
				<AutocompletePopup>
					<AutocompleteEmpty>No items found.</AutocompleteEmpty>
					<AutocompleteList>
						{(group: GroupedItem, index: number) => (
							<AutocompleteGroup key={group.value} items={group.items}>
								<AutocompleteGroupLabel>{group.value}</AutocompleteGroupLabel>
								{group.items.map((item) => (
									<AutocompleteItem key={item.value} value={item}>
										{item.label}
									</AutocompleteItem>
								))}
								{index < groupedItems.length - 1 && <AutocompleteSeparator />}
							</AutocompleteGroup>
						)}
					</AutocompleteList>
				</AutocompletePopup>
			</Autocomplete>
		</div>
	),
};

const shortFruits = fruits.slice(0, 3);

export const Sizes: Story = {
	render: () => (
		<div className='w-[280px] space-y-4'>
			<div className='space-y-1.5'>
				<Label>Small</Label>
				<Autocomplete items={shortFruits}>
					<AutocompleteInput placeholder='Small input...' size='sm' />
					<AutocompletePopup>
						<AutocompleteEmpty>No results.</AutocompleteEmpty>
						<AutocompleteList>
							{(item: (typeof fruits)[0]) => (
								<AutocompleteItem key={item.value} value={item}>
									{item.label}
								</AutocompleteItem>
							)}
						</AutocompleteList>
					</AutocompletePopup>
				</Autocomplete>
			</div>

			<div className='space-y-1.5'>
				<Label>Default</Label>
				<Autocomplete items={shortFruits}>
					<AutocompleteInput placeholder='Default input...' size='default' />
					<AutocompletePopup>
						<AutocompleteEmpty>No results.</AutocompleteEmpty>
						<AutocompleteList>
							{(item: (typeof fruits)[0]) => (
								<AutocompleteItem key={item.value} value={item}>
									{item.label}
								</AutocompleteItem>
							)}
						</AutocompleteList>
					</AutocompletePopup>
				</Autocomplete>
			</div>

			<div className='space-y-1.5'>
				<Label>Large</Label>
				<Autocomplete items={shortFruits}>
					<AutocompleteInput placeholder='Large input...' size='lg' />
					<AutocompletePopup>
						<AutocompleteEmpty>No results.</AutocompleteEmpty>
						<AutocompleteList>
							{(item: (typeof fruits)[0]) => (
								<AutocompleteItem key={item.value} value={item}>
									{item.label}
								</AutocompleteItem>
							)}
						</AutocompleteList>
					</AutocompletePopup>
				</Autocomplete>
			</div>
		</div>
	),
};

export const Controlled: Story = {
	render: function ControlledExample() {
		const [inputValue, setInputValue] = useState('');

		return (
			<div className='w-[280px] space-y-4'>
				<Autocomplete items={fruits} value={inputValue} onValueChange={setInputValue}>
					<AutocompleteInput placeholder='Search fruits...' showClear />
					<AutocompletePopup>
						<AutocompleteEmpty>No fruits found.</AutocompleteEmpty>
						<AutocompleteList>
							{(item: (typeof fruits)[0]) => (
								<AutocompleteItem key={item.value} value={item}>
									{item.label}
								</AutocompleteItem>
							)}
						</AutocompleteList>
					</AutocompletePopup>
				</Autocomplete>
				<p className='text-muted-foreground text-sm'>Input value: {inputValue || 'empty'}</p>
			</div>
		);
	},
};

const countries = [
	{ value: 'us', label: 'United States', flag: '🇺🇸' },
	{ value: 'ca', label: 'Canada', flag: '🇨🇦' },
	{ value: 'uk', label: 'United Kingdom', flag: '🇬🇧' },
	{ value: 'de', label: 'Germany', flag: '🇩🇪' },
	{ value: 'fr', label: 'France', flag: '🇫🇷' },
	{ value: 'jp', label: 'Japan', flag: '🇯🇵' },
	{ value: 'au', label: 'Australia', flag: '🇦🇺' },
	{ value: 'br', label: 'Brazil', flag: '🇧🇷' },
];

export const WithCustomContent: Story = {
	render: () => (
		<div className='w-[280px]'>
			<Autocomplete items={countries}>
				<AutocompleteInput placeholder='Search countries...' />
				<AutocompletePopup>
					<AutocompleteEmpty>No countries found.</AutocompleteEmpty>
					<AutocompleteList>
						{(item: (typeof countries)[0]) => (
							<AutocompleteItem key={item.value} value={item} className='gap-2'>
								<span>{item.flag}</span>
								<span>{item.label}</span>
							</AutocompleteItem>
						)}
					</AutocompleteList>
				</AutocompletePopup>
			</Autocomplete>
		</div>
	),
};

export const FormExample: Story = {
	render: () => (
		<form className='w-full max-w-sm space-y-4'>
			<div className='space-y-1.5'>
				<Label>Country</Label>
				<Autocomplete items={countries}>
					<AutocompleteInput placeholder='Select your country...' showTrigger />
					<AutocompletePopup>
						<AutocompleteEmpty>No countries found.</AutocompleteEmpty>
						<AutocompleteList>
							{(item: (typeof countries)[0]) => (
								<AutocompleteItem key={item.value} value={item} className='gap-2'>
									<span>{item.flag}</span>
									<span>{item.label}</span>
								</AutocompleteItem>
							)}
						</AutocompleteList>
					</AutocompletePopup>
				</Autocomplete>
			</div>

			<div className='space-y-1.5'>
				<Label>Favorite fruit</Label>
				<Autocomplete items={fruits}>
					<AutocompleteInput placeholder='Search fruits...' showClear />
					<AutocompletePopup>
						<AutocompleteEmpty>No fruits found.</AutocompleteEmpty>
						<AutocompleteList>
							{(item: (typeof fruits)[0]) => (
								<AutocompleteItem key={item.value} value={item}>
									{item.label}
								</AutocompleteItem>
							)}
						</AutocompleteList>
					</AutocompletePopup>
				</Autocomplete>
			</div>
		</form>
	),
};
