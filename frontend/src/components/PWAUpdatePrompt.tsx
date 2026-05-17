// src/components/PWAUpdatePrompt.tsx
// АГРЕССИВНОЕ авто-обновление: как только обнаружена новая версия — перезагружаем
// страницу автоматически, БЕЗ модалки. Это нужно, чтобы все клиенты были на одной
// версии кода, иначе real-time sync ломается (разные форматы payload).
import { useEffect, useRef } from 'react';

export default function PWAUpdatePrompt() {
	const updateSWRef = useRef<((reload?: boolean) => Promise<void>) | null>(null);
	const reloadedRef = useRef(false);

	useEffect(() => {
		(async () => {
			try {
				// @ts-expect-error — virtual module from vite-plugin-pwa
				const { registerSW } = await import('virtual:pwa-register');
				const updateSW = registerSW({
					immediate: true,
					onNeedRefresh() {
						// Новая версия SW активна → reload, но только один раз за сессию,
						// чтобы не словить бесконечный цикл при поломке сборки.
						if (reloadedRef.current) return;
						reloadedRef.current = true;
						console.log('[pwa] новая версия → перезагрузка');
						updateSW(true).catch(() => window.location.reload());
					},
					onOfflineReady() {
						console.log('[pwa] готов к offline-работе');
					},
				});
				updateSWRef.current = updateSW;

				// Дополнительная страховка: проверяем апдейты раз в минуту,
				// чтобы не ждать естественного триггера vite-plugin-pwa.
				const interval = setInterval(async () => {
					try {
						const regs = await navigator.serviceWorker?.getRegistrations();
						regs?.forEach(reg => reg.update().catch(() => {}));
					} catch { /* ignore */ }
				}, 60_000);
				return () => clearInterval(interval);
			} catch (e) {
				console.debug('SW register skipped:', e);
			}
		})();
	}, []);

	return null;
}
