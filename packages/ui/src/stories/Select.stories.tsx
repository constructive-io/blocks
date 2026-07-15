import type { Meta, StoryObj } from '@storybook/react-vite';

import { Label } from '../components/label';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
} from '../components/select';

const meta: Meta<typeof Select> = {
	title: 'UI/Select',
	component: Select,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<Select>
			<SelectTrigger className='w-[180px]'>
				<SelectValue placeholder='Select a fruit' />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value='apple'>Apple</SelectItem>
				<SelectItem value='banana'>Banana</SelectItem>
				<SelectItem value='blueberry'>Blueberry</SelectItem>
				<SelectItem value='grapes'>Grapes</SelectItem>
				<SelectItem value='pineapple'>Pineapple</SelectItem>
			</SelectContent>
		</Select>
	),
};

export const WithLabel: Story = {
	render: () => (
		<div className='grid w-full max-w-sm items-center gap-1.5'>
			<Label htmlFor='fruit-select'>Choose your favorite fruit</Label>
			<Select>
				<SelectTrigger>
					<SelectValue placeholder='Select a fruit' />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value='apple'>Apple</SelectItem>
					<SelectItem value='banana'>Banana</SelectItem>
					<SelectItem value='blueberry'>Blueberry</SelectItem>
					<SelectItem value='grapes'>Grapes</SelectItem>
					<SelectItem value='pineapple'>Pineapple</SelectItem>
				</SelectContent>
			</Select>
		</div>
	),
};

export const WithGroups: Story = {
	render: () => (
		<Select>
			<SelectTrigger className='w-[200px]'>
				<SelectValue placeholder='Select a timezone' />
			</SelectTrigger>
			<SelectContent>
				<SelectGroup>
					<SelectLabel>North America</SelectLabel>
					<SelectItem value='est'>Eastern Standard Time (EST)</SelectItem>
					<SelectItem value='cst'>Central Standard Time (CST)</SelectItem>
					<SelectItem value='mst'>Mountain Standard Time (MST)</SelectItem>
					<SelectItem value='pst'>Pacific Standard Time (PST)</SelectItem>
					<SelectItem value='akst'>Alaska Standard Time (AKST)</SelectItem>
					<SelectItem value='hst'>Hawaii Standard Time (HST)</SelectItem>
				</SelectGroup>
				<SelectSeparator />
				<SelectGroup>
					<SelectLabel>Europe & Africa</SelectLabel>
					<SelectItem value='gmt'>Greenwich Mean Time (GMT)</SelectItem>
					<SelectItem value='cet'>Central European Time (CET)</SelectItem>
					<SelectItem value='eet'>Eastern European Time (EET)</SelectItem>
					<SelectItem value='west'>Western European Summer Time (WEST)</SelectItem>
					<SelectItem value='cat'>Central Africa Time (CAT)</SelectItem>
					<SelectItem value='eat'>Eastern Africa Time (EAT)</SelectItem>
				</SelectGroup>
				<SelectSeparator />
				<SelectGroup>
					<SelectLabel>Asia</SelectLabel>
					<SelectItem value='msk'>Moscow Time (MSK)</SelectItem>
					<SelectItem value='ist'>India Standard Time (IST)</SelectItem>
					<SelectItem value='cst_china'>China Standard Time (CST)</SelectItem>
					<SelectItem value='jst'>Japan Standard Time (JST)</SelectItem>
					<SelectItem value='kst'>Korea Standard Time (KST)</SelectItem>
					<SelectItem value='ist_indonesia'>Indonesia Standard Time (IST)</SelectItem>
				</SelectGroup>
			</SelectContent>
		</Select>
	),
};

export const Disabled: Story = {
	render: () => (
		<Select disabled>
			<SelectTrigger className='w-[180px]'>
				<SelectValue placeholder='Select a fruit' />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value='apple'>Apple</SelectItem>
				<SelectItem value='banana'>Banana</SelectItem>
				<SelectItem value='blueberry'>Blueberry</SelectItem>
			</SelectContent>
		</Select>
	),
};

export const WithDisabledItems: Story = {
	render: () => (
		<Select>
			<SelectTrigger className='w-[180px]'>
				<SelectValue placeholder='Select a fruit' />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value='apple'>Apple</SelectItem>
				<SelectItem value='banana' disabled>
					Banana (Out of stock)
				</SelectItem>
				<SelectItem value='blueberry'>Blueberry</SelectItem>
				<SelectItem value='grapes' disabled>
					Grapes (Out of stock)
				</SelectItem>
				<SelectItem value='pineapple'>Pineapple</SelectItem>
			</SelectContent>
		</Select>
	),
};

export const FormExample: Story = {
	render: () => (
		<form className='w-full max-w-sm space-y-4'>
			<div className='space-y-2'>
				<Label htmlFor='country'>Country</Label>
				<Select>
					<SelectTrigger>
						<SelectValue placeholder='Select your country' />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value='us'>United States</SelectItem>
						<SelectItem value='ca'>Canada</SelectItem>
						<SelectItem value='uk'>United Kingdom</SelectItem>
						<SelectItem value='au'>Australia</SelectItem>
						<SelectItem value='de'>Germany</SelectItem>
						<SelectItem value='fr'>France</SelectItem>
					</SelectContent>
				</Select>
			</div>
			<div className='space-y-2'>
				<Label htmlFor='role'>Role</Label>
				<Select>
					<SelectTrigger>
						<SelectValue placeholder='Select your role' />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value='admin'>Administrator</SelectItem>
						<SelectItem value='editor'>Editor</SelectItem>
						<SelectItem value='viewer'>Viewer</SelectItem>
						<SelectItem value='guest'>Guest</SelectItem>
					</SelectContent>
				</Select>
			</div>
			<div className='space-y-2'>
				<Label htmlFor='notifications'>Notification Frequency</Label>
				<Select>
					<SelectTrigger>
						<SelectValue placeholder='Select frequency' />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value='never'>Never</SelectItem>
						<SelectItem value='daily'>Daily</SelectItem>
						<SelectItem value='weekly'>Weekly</SelectItem>
						<SelectItem value='monthly'>Monthly</SelectItem>
					</SelectContent>
				</Select>
			</div>
		</form>
	),
};

export const Sizes: Story = {
	render: () => (
		<div className='space-y-4'>
			<div className='space-y-2'>
				<Label>Small Select</Label>
				<Select>
					<SelectTrigger size='sm' className='w-[150px]'>
						<SelectValue placeholder='Small select (h-8, text-xs)' />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value='option1'>Option 1</SelectItem>
						<SelectItem value='option2'>Option 2</SelectItem>
						<SelectItem value='option3'>Option 3</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div className='space-y-2'>
				<Label>Medium Select (Default)</Label>
				<Select>
					<SelectTrigger size='default' className='w-[180px]'>
						<SelectValue placeholder='Medium select (h-9, text-sm)' />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value='option1'>Option 1</SelectItem>
						<SelectItem value='option2'>Option 2</SelectItem>
						<SelectItem value='option3'>Option 3</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div className='space-y-2'>
				<Label>Large Select</Label>
				<Select>
					<SelectTrigger size='lg' className='w-[220px]'>
						<SelectValue placeholder='Large select (h-10, text-base)' />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value='option1'>Option 1</SelectItem>
						<SelectItem value='option2'>Option 2</SelectItem>
						<SelectItem value='option3'>Option 3</SelectItem>
					</SelectContent>
				</Select>
			</div>
		</div>
	),
};

export const SizeComparison: Story = {
	render: () => (
		<div className='w-full max-w-md space-y-3'>
			<Select>
				<SelectTrigger size='sm'>
					<SelectValue placeholder='Small - Compact interfaces' />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value='option1'>Option 1</SelectItem>
					<SelectItem value='option2'>Option 2</SelectItem>
				</SelectContent>
			</Select>

			<Select>
				<SelectTrigger size='default'>
					<SelectValue placeholder='Medium - Standard forms (default)' />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value='option1'>Option 1</SelectItem>
					<SelectItem value='option2'>Option 2</SelectItem>
				</SelectContent>
			</Select>

			<Select>
				<SelectTrigger size='lg'>
					<SelectValue placeholder='Large - Prominent elements' />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value='option1'>Option 1</SelectItem>
					<SelectItem value='option2'>Option 2</SelectItem>
				</SelectContent>
			</Select>
		</div>
	),
};

export const LongList: Story = {
	render: () => (
		<Select>
			<SelectTrigger className='w-[200px]'>
				<SelectValue placeholder='Select a country' />
			</SelectTrigger>
			<SelectContent>
				{[
					'Afghanistan',
					'Albania',
					'Algeria',
					'Argentina',
					'Australia',
					'Austria',
					'Bangladesh',
					'Belgium',
					'Brazil',
					'Bulgaria',
					'Canada',
					'Chile',
					'China',
					'Colombia',
					'Croatia',
					'Czech Republic',
					'Denmark',
					'Egypt',
					'Finland',
					'France',
					'Germany',
					'Ghana',
					'Greece',
					'Hungary',
					'Iceland',
					'India',
					'Indonesia',
					'Ireland',
					'Israel',
					'Italy',
					'Japan',
					'Kenya',
					'Malaysia',
					'Mexico',
					'Netherlands',
					'New Zealand',
					'Nigeria',
					'Norway',
					'Pakistan',
					'Philippines',
					'Poland',
					'Portugal',
					'Romania',
					'Russia',
					'Singapore',
					'South Africa',
					'South Korea',
					'Spain',
					'Sweden',
					'Switzerland',
					'Thailand',
					'Turkey',
					'Ukraine',
					'United Kingdom',
					'United States',
					'Vietnam',
				].map((country) => (
					<SelectItem key={country} value={country.toLowerCase().replace(/ /g, '-')}>
						{country}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	),
};
