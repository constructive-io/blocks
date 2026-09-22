import { DatabaseIcon, MoreHorizontalIcon, ShieldCheckIcon } from 'lucide-react';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../components/accordion';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/avatar';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '../../components/breadcrumb';
import { Button } from '../../components/button';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/card';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../../components/empty';
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemSeparator, ItemTitle } from '../../components/item';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '../../components/pagination';
import { Separator } from '../../components/separator';
import { Stepper, StepperIndicator, StepperItem, StepperSeparator, StepperTitle, StepperTrigger } from '../../components/stepper';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '../../components/table';
import { Section, Specimen } from './sink-layout';

const CARD_VARIANTS = ['default', 'elevated', 'flat', 'ghost', 'interactive'] as const;

const ROWS = [
	{ name: 'orders', rows: '1.2M', size: '842 MB', rls: 'on' },
	{ name: 'customers', rows: '84K', size: '96 MB', rls: 'on' },
	{ name: 'events', rows: '48M', size: '12 GB', rls: 'off' },
	{ name: 'invoices', rows: '9.4K', size: '14 MB', rls: 'on' },
];

export function DataSection() {
	return (
		<Section id='data' index='03' title='Data display' description='Cards, tables, and identity'>
			<Specimen label='Card — variants' wide>
				<div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
					{CARD_VARIANTS.map((variant) => (
						<Card key={variant} variant={variant} className='capitalize'>
							<CardHeader>
								<CardTitle className='text-sm'>{variant}</CardTitle>
								<CardDescription>variant=&quot;{variant}&quot;</CardDescription>
							</CardHeader>
							<CardContent>
								<p className='text-sm text-muted-foreground'>Surface treatment for grouped content.</p>
							</CardContent>
						</Card>
					))}
				</div>
			</Specimen>
			<Specimen label='Card — sizes' wide>
				<div className='grid gap-3 sm:grid-cols-2'>
					<Card>
						<CardHeader>
							<CardTitle className='text-sm'>Default</CardTitle>
							<CardDescription>size=&quot;default&quot; · 1.5rem pad</CardDescription>
						</CardHeader>
						<CardContent>
							<p className='text-sm text-muted-foreground'>Standard card rhythm.</p>
						</CardContent>
					</Card>
					<Card size='sm'>
						<CardHeader>
							<CardTitle className='text-sm'>Small</CardTitle>
							<CardDescription>size=&quot;sm&quot; · 1rem pad</CardDescription>
						</CardHeader>
						<CardContent>
							<p className='text-sm text-muted-foreground'>Compact density for dashboards.</p>
						</CardContent>
					</Card>
				</div>
			</Specimen>
			<Specimen label='Card — composed' wide>
				<Card className='max-w-md'>
					<CardHeader>
						<CardTitle>production-db</CardTitle>
						<CardDescription>PostgreSQL 17 · us-east-1</CardDescription>
						<CardAction>
							<Button size='icon-xs' variant='ghost' aria-label='More actions'>
								<MoreHorizontalIcon />
							</Button>
						</CardAction>
					</CardHeader>
					<CardContent>
						<div className='flex gap-6 text-sm'>
							<div>
								<p className='font-medium tabular-nums'>1.2M</p>
								<p className='text-muted-foreground'>rows</p>
							</div>
							<div>
								<p className='font-medium tabular-nums'>99.99%</p>
								<p className='text-muted-foreground'>uptime</p>
							</div>
						</div>
					</CardContent>
					<CardFooter className='gap-2'>
						<Button size='sm'>Connect</Button>
						<Button size='sm' variant='outline'>
							Logs
						</Button>
					</CardFooter>
				</Card>
			</Specimen>
			<Specimen label='Table' wide>
				<Table>
					<TableCaption>Tables in public schema</TableCaption>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead className='text-right'>Rows</TableHead>
							<TableHead className='text-right'>Size</TableHead>
							<TableHead>RLS</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{ROWS.map((row) => (
							<TableRow key={row.name}>
								<TableCell className='font-medium'>{row.name}</TableCell>
								<TableCell className='text-right tabular-nums'>{row.rows}</TableCell>
								<TableCell className='text-right tabular-nums'>{row.size}</TableCell>
								<TableCell>{row.rls}</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</Specimen>
			<Specimen label='Avatar' center>
				<div className='flex items-center gap-3'>
					<Avatar>
						<AvatarFallback>MC</AvatarFallback>
					</Avatar>
					<Avatar>
						<AvatarFallback>TB</AvatarFallback>
					</Avatar>
					<Avatar>
						<AvatarFallback>+9</AvatarFallback>
					</Avatar>
				</div>
			</Specimen>
			<Specimen label='Empty' center>
				<Empty className='min-h-56'>
					<EmptyHeader>
						<EmptyMedia variant='icon'>
							<DatabaseIcon />
						</EmptyMedia>
						<EmptyTitle>No records yet</EmptyTitle>
						<EmptyDescription>Create the first record to start exploring this table.</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<Button size='sm'>Create record</Button>
					</EmptyContent>
				</Empty>
			</Specimen>
			<Specimen label='Breadcrumb' wide>
				<Breadcrumb>
					<BreadcrumbList>
						<BreadcrumbItem>
							<BreadcrumbLink href='#'>Projects</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbLink href='#'>constructive</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbPage>production-db</BreadcrumbPage>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>
			</Specimen>
			<Specimen label='Pagination' wide center>
				<Pagination>
					<PaginationContent>
						<PaginationItem>
							<PaginationPrevious href='#' />
						</PaginationItem>
						<PaginationItem>
							<PaginationLink href='#'>1</PaginationLink>
						</PaginationItem>
						<PaginationItem>
							<PaginationLink href='#' isActive>
								2
							</PaginationLink>
						</PaginationItem>
						<PaginationItem>
							<PaginationLink href='#'>3</PaginationLink>
						</PaginationItem>
						<PaginationItem>
							<PaginationEllipsis />
						</PaginationItem>
						<PaginationItem>
							<PaginationNext href='#' />
						</PaginationItem>
					</PaginationContent>
				</Pagination>
			</Specimen>
			<Specimen label='Stepper' wide>
				<Stepper defaultValue={2} className='w-full'>
					{['Connect', 'Schema', 'Policies', 'Review'].map((label, i) => (
						<StepperItem key={label} step={i + 1} className='flex-1'>
							<StepperTrigger className='w-full'>
								<StepperIndicator />
								<StepperTitle>{label}</StepperTitle>
							</StepperTrigger>
							{i < 3 ? <StepperSeparator /> : null}
						</StepperItem>
					))}
				</Stepper>
			</Specimen>
			<Specimen label='Item' wide>
				<ItemGroup>
					<Item variant='outline'>
						<ItemMedia variant='icon'>
							<DatabaseIcon />
						</ItemMedia>
						<ItemContent>
							<ItemTitle>db-prod-eu-1</ItemTitle>
							<ItemDescription>Postgres 17 · eu-central-1 · 2 vCPU</ItemDescription>
						</ItemContent>
						<ItemActions>
							<Button variant='ghost' size='icon-sm' aria-label='Open database'>
								<MoreHorizontalIcon />
							</Button>
						</ItemActions>
					</Item>
					<Item variant='muted' size='sm'>
						<ItemMedia variant='icon'>
							<ShieldCheckIcon />
						</ItemMedia>
						<ItemContent>
							<ItemTitle>RLS enabled</ItemTitle>
						</ItemContent>
					</Item>
					<ItemSeparator />
					<Item size='xs'>
						<ItemContent>
							<ItemTitle>Extra small row</ItemTitle>
						</ItemContent>
					</Item>
				</ItemGroup>
			</Specimen>
			<Specimen label='Accordion' wide>
				<Accordion defaultValue={['q1']}>
					<AccordionItem value='q1'>
						<AccordionTrigger>What counts as a compute hour?</AccordionTrigger>
						<AccordionContent>
							One hour of an active compute unit serving requests. Paused projects accrue nothing.
						</AccordionContent>
					</AccordionItem>
					<AccordionItem value='q2'>
						<AccordionTrigger>Can I pause a project?</AccordionTrigger>
						<AccordionContent>
							Yes — free-plan projects pause after 7 days of inactivity, or on demand.
						</AccordionContent>
					</AccordionItem>
					<AccordionItem value='q3'>
						<AccordionTrigger>How do read replicas bill?</AccordionTrigger>
						<AccordionContent>
							Each replica bills as its own compute size plus the storage it holds.
						</AccordionContent>
					</AccordionItem>
				</Accordion>
			</Specimen>
			<Specimen label='Separator'>
				<div>
					<p className='text-sm'>Horizontal</p>
					<Separator className='my-3' />
					<div className='flex h-5 items-center gap-3 text-sm'>
						<span>Rows</span>
						<Separator orientation='vertical' />
						<span>Columns</span>
						<Separator orientation='vertical' />
						<span>Policies</span>
					</div>
				</div>
			</Specimen>
		</Section>
	);
}
