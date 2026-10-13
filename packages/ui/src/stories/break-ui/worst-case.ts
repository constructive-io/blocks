/**
 * Shared, realistic worst-case values for break-ui stories. Every value is
 * something a real user or API could produce; nothing here is random filler.
 */
export const names = {
	longHyphenated: 'Aleksandra Wiśniewska-Kowalczyk',
	longSuffix: 'Christopher Alexander Montgomery III',
	compound: 'Konstantin Oberhauser-Wettstein',
	twoLetters: 'Jo',
	oneLetter: 'J',
	vietnamese: 'Đặng Thị Ngọc Hân',
	cjk: '王秀英',
	rtl: 'نور الهدى عبد الرحمن',
	apostrophe: "Seán O'Brien-Ó Súilleabháin",
	particles: 'María José de la Cruz y Fernández',
	lowercase: 'dana',
	emojiFirst: '🦊 Fox',
	zwjEmoji: '👩🏽‍💻 Priya',
	extraSpaces: '  Sam   Lee ',
} as const;

export const emails = {
	long: 'bartholomew.fitzgerald@northwind-industries-holdings.example.com',
	short: 'a@b.co',
	plus: 'first.last+billing-notifications@example.com',
	subdomains: 'ops@sub.department.region.example.co.uk',
} as const;

export const identifiers = {
	url: 'https://example.com/workspaces/acme/projects/q3-launch/docs/9f8e7d6c5b4a?tab=comments&filter=unresolved',
	uuid: '9f8e7d6c-5b4a-4c3d-8e2f-1a0b9c8d7e6f',
	fileName: 'Q3 Board Deck — FINAL (revised) v12 [approved by legal].pdf',
	cameraFile: 'IMG_20250914_183022_HDR_portrait_edited_edited.HEIC',
	longHandle: '@thisisaverylongusernamethatisallowed',
	snakeIdentifier: 'customer_subscription_billing_adjustment_line_items',
} as const;

export const labels = {
	jobTitle: 'Senior Product Design Engineer, Platform Infrastructure',
	status: 'Invitation expired 12 days ago',
	german: 'Benachrichtigungseinstellungen',
	french: 'Paramètres de confidentialité et de sécurité',
	longTag: 'customer-feedback-from-enterprise-onboarding',
	markup: '<script>alert(1)</script> &amp; **bold**',
	multiline: 'Line one\nLine two',
	blank: '   ',
	longDescription:
		'Quarterly reconciliation of enterprise seat licenses across the EMEA and APAC regions, including the retroactive adjustments negotiated during the renewal cycle, the credits issued for the March outage, and the migration of legacy annual contracts to the new usage-based pricing model. Finance needs sign-off from regional leads before the board review, and any discrepancies above the 2% threshold must be documented with the original invoice, the corrected amount, and the approver who accepted the variance.',
} as const;

export const tags = [
	'design',
	'frontend',
	'q3',
	'urgent',
	'needs-review',
	'accessibility',
	'i18n',
	'customer-feedback-from-enterprise-onboarding',
	'performance',
	'blocked',
	'v2',
	'backend',
] as const;

export const numbers = {
	zero: 0,
	one: 1,
	thousands: 1284,
	million: 1_000_000,
	currency: 12_345_678.9,
	negative: -42.5,
	floatError: 0.1 + 0.2,
	overPercent: 142,
	underPercent: -3,
} as const;

/** Build N realistic rows from a factory; use for the "huge" (1,000 rows) state. */
export function manyRows<T>(count: number, make: (index: number) => T): T[] {
	return Array.from({ length: count }, (_, index) => make(index));
}
