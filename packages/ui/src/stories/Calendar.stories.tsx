import type { Meta, StoryObj } from '@storybook/react-vite';
import { getLocalTimeZone, today } from '@internationalized/date';

import { Calendar, RangeCalendar } from '../components/calendar-rac';

const meta: Meta<typeof Calendar> = {
	title: 'UI/Calendar',
	component: Calendar,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<div className='rounded-md border p-3'>
			<Calendar aria-label='Pick a date' />
		</div>
	),
};

export const WithSelection: Story = {
	render: () => (
		<div className='rounded-md border p-3'>
			<Calendar aria-label='Pick a date' defaultValue={today(getLocalTimeZone())} />
		</div>
	),
};

export const Range: Story = {
	render: () => (
		<div className='rounded-md border p-3'>
			<RangeCalendar
				aria-label='Pick a date range'
				defaultValue={{
					start: today(getLocalTimeZone()),
					end: today(getLocalTimeZone()).add({ days: 6 }),
				}}
			/>
		</div>
	),
};

export const UnavailableWeekends: Story = {
	render: () => (
		<div className='rounded-md border p-3'>
			<Calendar
				aria-label='Pick a weekday'
				isDateUnavailable={(date) => {
					const day = date.toDate(getLocalTimeZone()).getDay();
					return day === 0 || day === 6;
				}}
			/>
		</div>
	),
};
