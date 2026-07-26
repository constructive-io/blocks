import { useEffect, useState } from 'react';

export function useColorScheme(): 'light' | 'dark' {
	const [scheme, setScheme] = useState<'light' | 'dark'>('light');

	useEffect(() => {
		const update = () => {
			setScheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
		};
		update();
		const observer = new MutationObserver(() => update());
		observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
		return () => observer.disconnect();
	}, []);

	return scheme;
}
