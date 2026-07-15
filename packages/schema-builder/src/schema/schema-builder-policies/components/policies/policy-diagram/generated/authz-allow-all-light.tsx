import type { SVGProps } from 'react';

interface AuthzAllowAllLightProps extends SVGProps<SVGSVGElement> {
	table?: string;
}

export function AuthzAllowAllLight({ table = 'table', ...props }: AuthzAllowAllLightProps) {
	return (
		<svg width="210" height="100" fill="none" viewBox="0 0 210 100" {...props}>
			<path fill="#D1FAE5" stroke="#6EE7B7" strokeWidth="2" d="M40 68a28 28 0 1 0 0-56 28 28 0 0 0 0 56Z"/><path stroke="#10B981" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M47 49v-2a4 4 0 0 0-4-4h-6a4 4 0 0 0-4 4v2"/><path stroke="#10B981" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M40 39a4 4 0 1 0 0-8 4 4 0 0 0 0 8"/><text xmlSpace="preserve" fill="#4B5563" fontFamily="var(--font-geist-sans), system-ui, sans-serif" fontSize="12" letterSpacing="0em" style={{ whiteSpace: 'pre' }}><tspan x="18.75" y="81.86">Anyone</tspan></text><path fill="#10B981" d="M82 44a4 4 0 1 0 0-8 4 4 0 0 0 0 8"/><path stroke="#A7F3D0" strokeLinecap="round" strokeWidth="2.5" d="M86 40h30"/><path fill="#10B981" d="M120 44a4 4 0 1 0 0-8 4 4 0 0 0 0 8"/><path fill="white" stroke="#10B981" strokeWidth="1.5" d="M101 48a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"/><path stroke="#10B981" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="m96 40 3 3 7-7"/><path fill="white" stroke="#6EE7B7" strokeWidth="2" d="M158 62a28 28 0 1 0 0-56 28 28 0 0 0 0 56Z"/><path fill="white" stroke="#6EE7B7" strokeWidth="2" d="M162 65a28 28 0 1 0 0-56 28 28 0 0 0 0 56Z"/><path fill="white" stroke="#6EE7B7" strokeWidth="2" d="M166 68a28 28 0 1 0 0-56 28 28 0 0 0 0 56Z"/><path stroke="#10B981" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M166 36c4.97 0 9-1.34 9-3s-4.03-3-9-3-9 1.34-9 3 4.03 3 9 3"/><path stroke="#10B981" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M157 33v14c0 .8.95 1.56 2.64 2.12 1.68.56 3.97.88 6.36.88s4.68-.32 6.36-.88c1.7-.56 2.64-1.32 2.64-2.12V33"/><path stroke="#10B981" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M157 40c0 .8.95 1.56 2.64 2.12 1.68.56 3.97.88 6.36.88s4.68-.32 6.36-.88c1.7-.56 2.64-1.32 2.64-2.12"/><foreignObject x="130" y="70" width="72" height="18"><div title={table} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center', width: '100%', padding: '0 4px', boxSizing: 'border-box', fontSize: '12px', fontFamily: 'var(--font-geist-sans),system-ui,sans-serif', color: '#4B5563', lineHeight: '18px' }}>{table}</div></foreignObject>
		</svg>
	);
}
