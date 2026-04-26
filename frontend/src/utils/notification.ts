// src/utils/notification.ts — pub/sub для уведомлений (стиль EcoPrint_old)

export type NotifyType = 'success' | 'warning' | 'error' | 'info';

export interface NotifyPayload {
	id: number;
	title: string;
	message: string;
	type: NotifyType;
}

type Listener = (n: NotifyPayload) => void;

let listeners: Listener[] = [];
let counter = 0;

export function showNotification(title: string, message: string, type: NotifyType = 'info'): void {
	const payload: NotifyPayload = { id: ++counter, title, message, type };
	listeners.forEach(l => l(payload));
}

export function subscribeNotification(l: Listener): () => void {
	listeners.push(l);
	return () => { listeners = listeners.filter(x => x !== l); };
}

// Проверка глобальной настройки попапов из localStorage
export function isPopupEnabled(): boolean {
	try {
		const raw = localStorage.getItem('notify_settings');
		if (!raw) return true;
		const parsed = JSON.parse(raw);
		return parsed.popup !== false;
	} catch {
		return true;
	}
}
