// src/components/PWAInstallButton.tsx
// Кнопка "Установить приложение".
// На Chrome/Edge/Android — нативный prompt через beforeinstallprompt.
// На iOS Safari — открывается инструкция (Apple не даёт API).
import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export default function PWAInstallButton() {
	const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
	const [showIosHint, setShowIosHint] = useState(false);
	const [isInstalled, setIsInstalled] = useState(false);

	useEffect(() => {
		// Уже установлено?
		const standalone =
			window.matchMedia('(display-mode: standalone)').matches ||
			(window.navigator as Navigator & { standalone?: boolean }).standalone === true;
		if (standalone) { setIsInstalled(true); return; }

		const handler = (e: Event) => {
			e.preventDefault();
			setDeferred(e as BeforeInstallPromptEvent);
		};
		window.addEventListener('beforeinstallprompt', handler);

		const installedHandler = () => setIsInstalled(true);
		window.addEventListener('appinstalled', installedHandler);

		return () => {
			window.removeEventListener('beforeinstallprompt', handler);
			window.removeEventListener('appinstalled', installedHandler);
		};
	}, []);

	if (isInstalled) return null;

	const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window);

	const handleClick = async () => {
		if (deferred) {
			await deferred.prompt();
			await deferred.userChoice;
			setDeferred(null);
		} else if (isIos) {
			setShowIosHint(true);
		}
	};

	// На iOS показываем кнопку всегда (нет нативного prompt)
	// На других — только если есть deferred prompt
	if (!deferred && !isIos) return null;

	return (
		<>
			<button
				onClick={handleClick}
				className="pwa-install-btn"
				title="Установить приложение"
			>
				<i className="fas fa-download"></i>
				<span>Установить</span>
			</button>

			{showIosHint && (
				<div className="modal active" onClick={(e) => { if (e.target === e.currentTarget) setShowIosHint(false); }}>
					<div className="modal-content message-modal-content">
						<div className="message-modal-icon">
							<i className="fab fa-apple icon-info"></i>
						</div>
						<h3 style={{ marginBottom: 10 }}>Установка на iPhone / iPad</h3>
						<p style={{ color: '#666', marginBottom: 20, lineHeight: 1.6, textAlign: 'left' }}>
							1. Нажми кнопку <strong>«Поделиться»</strong> внизу экрана <i className="fas fa-share-square" style={{ color: '#0088cc' }}></i><br /><br />
							2. Прокрути вниз и выбери<br /><strong>«На экран Домой»</strong> <i className="fas fa-plus-square" style={{ color: '#0088cc' }}></i><br /><br />
							3. Нажми <strong>«Добавить»</strong>
						</p>
						<div className="form-actions" style={{ justifyContent: 'center' }}>
							<button className="btn btn-content" onClick={() => setShowIosHint(false)} style={{ minWidth: 120 }}>
								Понятно
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
