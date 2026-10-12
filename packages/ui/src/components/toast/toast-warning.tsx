'use client';

import { AlertTriangleIcon } from 'lucide-react';
import { toast } from 'sonner';

import { ToastCard, type ToastTone } from './toast-card';

export interface ToastWarningProps {
	message: string;
	description?: string;
	action?: {
		label: string;
		onClick: () => void;
	};
	onDismiss?: () => void;
}

const tone: ToastTone = {
	border: 'border-amber-200/60 dark:border-amber-800/50',
	icon: 'text-amber-500',
	message: 'text-amber-700 dark:text-amber-400',
	action: 'text-amber-700 dark:text-amber-400',
};

export function showWarningToast(props: ToastWarningProps) {
	return toast.custom((t) => (
		<ToastCard toastId={t} icon={AlertTriangleIcon} closeLabel='Close warning notification' tone={tone} {...props} />
	));
}
