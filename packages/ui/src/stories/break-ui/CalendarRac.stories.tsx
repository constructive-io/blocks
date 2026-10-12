import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { getLocalTimeZone, today, parseDate } from '@internationalized/date';
import { I18nProvider } from 'react-aria-components';

import { Calendar, RangeCalendar } from '../../components/calendar-rac';
import { caption } from './b-fixtures';
import { pickDataset } from './dataset';

const meta: Meta = {
	title: 'Break UI/CalendarRac',
	parameters: { breakUi: true },
};
export default meta;

const now = today(getLocalTimeZone());

// Locales where the heading, numerals, and week start all differ from en-US.
const demo = { locale: 'en-US', minValue: undefined as ReturnType<typeof today> | undefined };
const worst = { locale: 'ar-SA-u-ca-islamic-umalqura', minValue: now };

function Cell({ title, width, children }: { title: string; width: number; children: ReactNode }) {
	return (
		<div style={{ width, maxWidth: '100%' }}>
			<div style={caption}>{title}</div>
			{children}
		</div>
	);
}

export const Stress: StoryObj = {
	render: (_args, context) => {
		const data = pickDataset(context, { demo, worst });
		// The extra locales are fixed across datasets; the dataset swaps the bounds and the first locale.
		return (
			<div style={{ display: 'flex', flexDirection: 'column', gap: 22, paddingBottom: 56 }}>
				<Cell title={`Calendar, locale ${data.locale}, minValue today (previous button should read as disabled)`} width={300}>
					<I18nProvider locale={data.locale}>
						<div className="rounded-md border p-3" data-testid="cal-first">
							<Calendar aria-label="Pick a date" minValue={data.minValue} defaultValue={now} />
						</div>
					</I18nProvider>
				</Cell>

				<Cell title="Calendar, th-TH (Buddhist era), fi-FI" width={300}>
					<div style={{ display: 'grid', gap: 12 }}>
						<I18nProvider locale="th-TH-u-ca-buddhist">
							<div className="rounded-md border p-3" data-testid="cal-th">
								<Calendar aria-label="Pick a date" defaultValue={now} />
							</div>
						</I18nProvider>
						<I18nProvider locale="fi-FI">
							<div className="rounded-md border p-3" data-testid="cal-fi">
								<Calendar aria-label="Pick a date" defaultValue={now} />
							</div>
						</I18nProvider>
					</div>
				</Cell>

				<Cell title="RangeCalendar across a month boundary, invalid selection (unavailable day inside the range)" width={300}>
					<div className="rounded-md border p-3" data-testid="cal-range">
						<RangeCalendar
							aria-label="Pick a range"
							defaultValue={{ start: parseDate(now.toString()).subtract({ days: 3 }), end: parseDate(now.toString()).add({ days: 10 }) }}
							isDateUnavailable={(date) => date.compare(now.add({ days: 5 })) === 0}
						/>
					</div>
				</Cell>
			</div>
		);
	},
};
