// src/components/PWAUpdatePrompt.tsx
// Уведомление о новой версии приложения (когда service worker обновился).
// Показывается тост "Доступно обновление" — клик перезагружает страницу.
import { useEffect } from 'react';
import { showNotification } from '../utils/notification';

export default function PWAUpdatePrompt() {
	useEffect(() => {
		// Динамический импорт — virtual:pwa-register виртуальный модуль из vite-plugin-pwa
		(async () => {
			try {
				// @ts-expect-error — virtual module from vite-plugin-pwa
				const { registerSW } = await import('virtual:pwa-register');
				const updateSW = registerSW({
					onNeedRefresh() {
						showNotification(
							'Доступно обновление',
							'Нажми, чтобы перезагрузить приложение и применить новую версию.',
							'info'
						);
						// Через 2 сек применяем автоматически (или пользователь сам перезагрузит)
						setTimeout(() => updateSW(true), 5000);
					},
					onOfflineReady() {
						showNotification(
							'Готово к работе offline',
							'Приложение установлено и доступно без интернета.',
							'success'
						);
					},
				});
			} catch (e) {
				// SW не активен (dev режим) — игнорируем
				console.debug('SW register skipped:', e);
			}
		})();
	}, []);

	return null;
}
