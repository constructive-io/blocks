'use client';

import { Building2, Check, LifeBuoy, LogOut, Settings2, Ticket, User } from 'lucide-react';

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '../dropdown-menu';
import { AppearanceRow, monogram, SwitcherTrigger } from '../workspace-kit/menu';
import { useBillingAccount } from './billing-account-context';

const ITEM_CLASS = 'gap-2 [&_svg]:size-3.5 [&_svg]:text-muted-foreground';

/** Account switcher: every billing account the viewer can see, appearance, and account links. */
export function AccountMenu({ collapsed }: { collapsed: boolean }) {
	const { data, emit, theme, setTheme, canRedeem, openRedeem } = useBillingAccount();
	const current = data.accounts.find((account) => account.id === data.accountId) ?? data.accounts[0];
	return (
		<DropdownMenu>
			<SwitcherTrigger
				label={`Billing account: ${current?.name ?? 'none'}`}
				name={current?.name ?? ''}
				glyph={monogram(current?.name ?? '?')}
				collapsed={collapsed}
			/>
			<DropdownMenuContent align="start" className="w-64">
				<p className="px-2 pt-1 pb-1.5 text-xs text-muted-foreground">Billing accounts</p>
				{data.accounts.map((account) => {
					const Icon = account.kind === 'organization' ? Building2 : User;
					const active = account.id === data.accountId;
					return (
						<DropdownMenuItem key={account.id} className="gap-2" onClick={active ? undefined : () => emit({ type: 'switch-account', accountId: account.id })}>
							<Icon aria-hidden="true" className="size-3.5 text-muted-foreground" />
							<span className="min-w-0 flex-1">
								<span className="block truncate">{account.name}</span>
								<span className="block text-xs text-muted-foreground">
									{account.planName ?? 'No plan'}
									{account.role ? ` · ${account.role}` : ''}
								</span>
							</span>
							{active ? <Check aria-hidden="true" className="size-3.5" /> : null}
						</DropdownMenuItem>
					);
				})}
				<DropdownMenuSeparator />
				{canRedeem ? (
					<>
						<DropdownMenuItem className={ITEM_CLASS} onClick={openRedeem}>
							<Ticket aria-hidden="true" />
							Redeem a code
						</DropdownMenuItem>
						<DropdownMenuSeparator />
					</>
				) : null}
				<AppearanceRow value={theme} onChange={setTheme} />
				<DropdownMenuSeparator />
				<DropdownMenuItem className={ITEM_CLASS} onClick={() => emit({ type: 'account-menu', item: 'account-settings' })}>
					<Settings2 aria-hidden="true" />
					Account settings
				</DropdownMenuItem>
				<DropdownMenuItem className={ITEM_CLASS} onClick={() => emit({ type: 'account-menu', item: 'support' })}>
					<LifeBuoy aria-hidden="true" />
					Support
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem className={ITEM_CLASS} onClick={() => emit({ type: 'account-menu', item: 'log-out' })}>
					<LogOut aria-hidden="true" />
					Log out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
