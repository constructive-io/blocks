import type { Meta, StoryObj } from '@storybook/react-vite';
import React from 'react';

import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from '../../components/pagination';
import { pickDataset } from './dataset';
import { Frame } from './group-a-frame';
import { manyRows } from './worst-case';

const meta: Meta = {
	title: 'Break UI/Pagination',
	parameters: { breakUi: { states: ['demo', 'worst', 'empty', 'one', 'huge'] } },
};
export default meta;

type PageState = { current: number; total: number; windowed: boolean };

const demo: PageState = { current: 2, total: 3, windowed: true };

/** First, last and a window around the current page, with gaps marked as `null`. */
function windowPages({ current, total }: PageState): Array<number | null> {
	if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
	const pages = new Set([1, total, current - 1, current, current + 1]);
	const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
	const out: Array<number | null> = [];
	sorted.forEach((page, i) => {
		if (i > 0 && page - sorted[i - 1] > 1) out.push(null);
		out.push(page);
	});
	return out;
}

const fmt = new Intl.NumberFormat('en-US');

function Pager({ state, format }: { state: PageState; format?: (n: number) => string }) {
	const label = format ?? String;
	const pages = state.windowed ? windowPages(state) : Array.from({ length: state.total }, (_, i) => i + 1);
	return (
		<Pagination>
			<PaginationContent>
				<PaginationItem>
					<PaginationPrevious href="#" isDisabled={state.current <= 1} />
				</PaginationItem>
				{pages.map((page, i) => (
					<PaginationItem key={page ?? `gap-${i}`}>
						{page === null ? (
							<PaginationEllipsis />
						) : (
							<PaginationLink href="#" isActive={page === state.current}>
								{label(page)}
							</PaginationLink>
						)}
					</PaginationItem>
				))}
				<PaginationItem>
					<PaginationNext href="#" isDisabled={state.current >= state.total} />
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	);
}

export const Stress: StoryObj = {
	render: (_args, context) => {
		const mode = context.globals.dataset as string | undefined;
		const state = pickDataset<PageState>(context, {
			demo,
			worst: { current: 642, total: 1284, windowed: true },
			empty: { current: 0, total: 0, windowed: true },
			one: { current: 1, total: 1, windowed: true },
			huge: { current: 642, total: 1284, windowed: false },
		});

		return (
			<div style={{ display: 'flex', flexDirection: 'column' }}>
				<Frame width={480} label={`Page ${state.current} of ${state.total} in a 480px footer`}>
					<Pager state={state} />
				</Frame>

				<Frame width={288} label={`Same at 320px viewport (288px)`}>
					<Pager state={state} />
				</Frame>

				{mode === 'worst' ? (
					<>
						<Frame width={480} label="Formatted labels: 1,284 as the last page (480px)">
							<Pager state={{ current: 1283, total: 1284, windowed: true }} format={(n) => fmt.format(n)} />
						</Frame>

						<Frame width={288} label="Six-digit page numbers (128,400 pages) at 288px">
							<Pager state={{ current: 64200, total: 128400, windowed: true }} format={(n) => fmt.format(n)} />
						</Frame>

						<Frame width={480} label="Active page at the edges, ellipsis + disabled controls (480px)">
							<Pager state={{ current: 1, total: 1284, windowed: true }} />
							<div style={{ height: 12 }} />
							<Pager state={{ current: 1284, total: 1284, windowed: true }} />
						</Frame>
					</>
				) : null}
			</div>
		);
	},
};
