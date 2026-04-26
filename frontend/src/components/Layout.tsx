import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import AIChatWidget from './AIChatWidget';
import LegacyNotification from './LegacyNotification';
import PWAUpdatePrompt from './PWAUpdatePrompt';

export default function Layout() {
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
		return localStorage.getItem('sidebar_collapsed') === '1';
	});

	// Класс на <body> — legacy CSS строит на нём схлопнутое состояние
	useEffect(() => {
		document.body.classList.toggle('sidebar-collapsed', isCollapsed);
		localStorage.setItem('sidebar_collapsed', isCollapsed ? '1' : '0');
	}, [isCollapsed]);

	// Класс на body для затемнения фона при открытом мобильном сайдбаре
	useEffect(() => {
		document.body.classList.toggle('sidebar-mobile-open', isMobileMenuOpen);
		// Блокируем скролл страницы при открытом меню
		document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
		return () => { document.body.style.overflow = ''; };
	}, [isMobileMenuOpen]);

	// 🔥 Синхронизация (Firebase + polling + visibility/focus)
	useEffect(() => {
		const dispatch = () => window.dispatchEvent(new Event('sync-updated'));

		let timerId: ReturnType<typeof setTimeout>;
		const loop = () => { dispatch(); timerId = setTimeout(loop, 3000); };
		timerId = setTimeout(loop, 3000);

		const onVisible = () => { if (document.visibilityState === 'visible') dispatch(); };
		document.addEventListener('visibilitychange', onVisible);
		window.addEventListener('focus', onVisible);

		let unsubscribeFirebase: (() => void) | null = null;
		(async () => {
			try {
				const { subscribeToSync } = await import('../firebase');
				unsubscribeFirebase = subscribeToSync(dispatch);
			} catch {
				// Firebase недоступен — polling продолжит работу
			}
		})();

		return () => {
			unsubscribeFirebase?.();
			clearTimeout(timerId);
			document.removeEventListener('visibilitychange', onVisible);
			window.removeEventListener('focus', onVisible);
		};
	}, []);

	return (
		<>
			<Sidebar
				isOpen={isMobileMenuOpen}
				onClose={() => setIsMobileMenuOpen(false)}
				isCollapsed={isCollapsed}
				onToggleCollapse={() => setIsCollapsed(v => !v)}
			/>

			{/* Затемнение фона на мобиле при открытом сайдбаре — клик закрывает */}
			{isMobileMenuOpen && (
				<div
					className="sidebar-backdrop"
					onClick={() => setIsMobileMenuOpen(false)}
					style={{
						position: 'fixed',
						inset: 0,
						background: 'rgba(0,0,0,0.5)',
						zIndex: 999,
					}}
				/>
			)}

			<div className="page-container">
				<Header onMenuClick={() => setIsMobileMenuOpen(true)} />
				<Outlet />
			</div>

			<AIChatWidget />
			<LegacyNotification />
			<PWAUpdatePrompt />
		</>
	);
}
