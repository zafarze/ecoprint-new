// src/components/PWAUpdatePrompt.tsx
// Красивая модалка обновления PWA — спрашивает пользователя перед перезагрузкой.
import { useEffect, useRef, useState } from 'react';
import { showNotification } from '../utils/notification';

export default function PWAUpdatePrompt() {
	const [updateAvailable, setUpdateAvailable] = useState(false);
	const [isUpdating, setIsUpdating] = useState(false);
	const updateSWRef = useRef<((reload?: boolean) => Promise<void>) | null>(null);

	useEffect(() => {
		(async () => {
			try {
				// @ts-expect-error — virtual module from vite-plugin-pwa
				const { registerSW } = await import('virtual:pwa-register');
				const updateSW = registerSW({
					onNeedRefresh() {
						setUpdateAvailable(true);
					},
					onOfflineReady() {
						showNotification(
							'Готово к работе offline',
							'Приложение установлено и доступно без интернета.',
							'success'
						);
					},
				});
				updateSWRef.current = updateSW;
			} catch (e) {
				console.debug('SW register skipped:', e);
			}
		})();
	}, []);

	const handleUpdate = async () => {
		setIsUpdating(true);
		// Вызываем service worker, который активирует новую версию и перезагружает страницу
		if (updateSWRef.current) {
			await updateSWRef.current(true);
		} else {
			window.location.reload();
		}
	};

	const handleLater = () => {
		setUpdateAvailable(false);
	};

	if (!updateAvailable) return null;

	return (
		<div className="modal active pwa-update-modal" style={{ zIndex: 2000 }}>
			<div className="modal-content message-modal-content pwa-update-content">
				<div className="pwa-update-icon">
					<i className="fas fa-cloud-download-alt"></i>
				</div>

				<h3 className="pwa-update-title">Доступно обновление</h3>

				<p className="pwa-update-text">
					Вышла новая версия <strong>ЭкоПринт CRM</strong>.<br />
					Обновить сейчас, чтобы применить изменения?
				</p>

				<div className="pwa-update-features">
					<div><i className="fas fa-check-circle"></i> Свежие функции и улучшения</div>
					<div><i className="fas fa-shield-alt"></i> Исправления и стабильность</div>
					<div><i className="fas fa-rocket"></i> Новый дизайн интерфейса</div>
				</div>

				<div className="pwa-update-actions">
					<button
						className="pwa-update-btn-later"
						onClick={handleLater}
						disabled={isUpdating}
					>
						Позже
					</button>
					<button
						className="pwa-update-btn-now"
						onClick={handleUpdate}
						disabled={isUpdating}
					>
						{isUpdating ? (
							<>
								<i className="fas fa-spinner fa-spin"></i> Обновление...
							</>
						) : (
							<>
								<i className="fas fa-sync-alt"></i> Обновить сейчас
							</>
						)}
					</button>
				</div>
			</div>
		</div>
	);
}
