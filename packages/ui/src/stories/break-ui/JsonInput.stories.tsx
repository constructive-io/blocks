import { useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { JsonInput } from '../../components/json-input';
import { caption } from './b-fixtures';
import { pickDataset } from './dataset';
import { emails, identifiers, labels, manyRows, names } from './worst-case';

const meta: Meta = {
	title: 'Break UI/JsonInput',
	parameters: { breakUi: { states: ['demo', 'worst', 'empty', 'huge'] } },
};
export default meta;

const demo = JSON.stringify({ name: 'production-db', region: 'us-east-1', replicas: 2 }, null, 2);

// One minified 79 KB line (a webhook payload pasted straight from a log), as real exports are not pretty-printed.
const minified = JSON.stringify({
	event: 'invoice.payment_failed',
	customer: { name: names.longHyphenated, email: emails.long, locale: 'ar-EG', note: names.rtl },
	items: manyRows(300, (index) => ({
		sku: `${identifiers.snakeIdentifier}_${index}`,
		description: labels.jobTitle,
		url: identifiers.url,
		amount: 12_345_678.9 + index,
	})),
});

// Deeply nested config, 60 levels: real GraphQL introspection and AST dumps go this deep.
let deep: unknown = { leaf: identifiers.uuid };
for (let level = 0; level < 60; level += 1) deep = { [`level_${level}`]: deep };

// A 4,500-line pretty-printed list.
const manyLines = JSON.stringify(
	manyRows(500, (index) => ({ id: index, name: names.longHyphenated, email: emails.long, tags: ['a', 'b'] })),
	null,
	2,
);

// Invalid JSON with the error far from the start, as a trailing comma at line 4,500 is.
const invalid = manyLines.replace(/\n\]$/, ',\n]');

const worst = {
	value: minified,
	deep: JSON.stringify(deep, null, 2),
	many: manyLines,
	invalid,
};

function Cell({ title, width, children }: { title: string; width: number; children: ReactNode }) {
	return (
		<div style={{ width, maxWidth: '100%' }}>
			<div style={caption}>{title}</div>
			{children}
		</div>
	);
}

function Json({ initial, minLines, theme, testId }: { initial: string; minLines?: number; theme?: 'light' | 'dark'; testId: string }) {
	const [value, setValue] = useState(initial);
	return (
		<div data-testid={testId}>
			<JsonInput value={value} setValue={setValue} minLines={minLines} theme={theme} />
		</div>
	);
}

export const Stress: StoryObj = {
	render: (_args, context) => {
		const data = pickDataset(context, {
			demo: { value: demo, deep: demo, many: demo, invalid: '{ "name": "production-db", }' },
			worst,
			empty: { value: '', deep: '', many: '', invalid: '' },
			huge: { ...worst, value: manyLines },
		});
		const theme = context.globals.theme === 'dark' ? 'dark' : 'light';

		return (
			<div style={{ display: 'flex', flexDirection: 'column', gap: 22, paddingBottom: 56 }}>
				<Cell title="Dialog 480px: one minified line" width={480}>
					<Json initial={data.value} minLines={8} theme={theme} testId="json-minified" />
				</Cell>
				<Cell title="Sidebar 280px: 60-level nesting" width={280}>
					<Json initial={data.deep} minLines={8} theme={theme} testId="json-deep" />
				</Cell>
				<Cell title="Dialog 480px: 4,500 lines" width={480}>
					<Json initial={data.many} minLines={8} theme={theme} testId="json-many" />
				</Cell>
				<Cell title="theme prop omitted (default) while the app is in dark mode" width={480}>
					<Json initial={demo} minLines={6} testId="json-default-theme" />
				</Cell>
				<Cell title="Dialog 480px: invalid, error far from the start" width={480}>
					<Json initial={data.invalid} minLines={8} theme={theme} testId="json-invalid" />
				</Cell>
			</div>
		);
	},
};
