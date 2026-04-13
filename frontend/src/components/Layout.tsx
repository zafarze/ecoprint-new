import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import AIChatWidget from './AIChatWidget';

export default function Layout() {
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	// 🔥 МГНОВЕННАЯ СИНХРОНИЗАЦИЯ через Firebase Realtime Database
	// + Резервный polling каждые 5 сек + visibilitychange/focus для надёжности
	useEffect(() => {
		const dispatch = () => window.dispatchEvent(new Event('sync-updated'));

		// Резервные методы (всегда активны)
		let timerId: ReturnType<typeof setTimeout>;
		const loop = () => { dispatch(); timerId = setTimeout(loop, 5000); };
		timerId = setTimeout(loop, 5000);

		const onVisible = () => { if (document.visibilityState === 'visible') dispatch(); };
		document.addEventListener('visibilitychange', onVisible);
		window.addEventListener('focus', onVisible);

		// === МЕТОД 1: Firebase RTDB Push (МГНОВЕННЫЙ < 1 сек) ===
		// Async import чтобы не блокировать рендер
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
		<div className="flex h-screen bg-slate-50 overflow-hidden font-sans relative">
			{/* Сайдбар */}
			<Sidebar
				isOpen={isMobileMenuOpen}
				onClose={() => setIsMobileMenuOpen(false)}
			/>

			{/* Основная часть (Шапка + Контент) */}
			<div className="flex-1 flex flex-col min-w-0 overflow-hidden">
				<Header onMenuClick={() => setIsMobileMenuOpen(true)} />

				{/* Область для скролла страниц */}
				<main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 relative">
					<div className="max-w-7xl mx-auto">
						<Outlet />
					</div>
				</main>
			</div>

			{/* 2. ДОБАВЛЯЕМ ЧАТ СЮДА (он будет висеть поверх всего) */}
			<AIChatWidget />
		</div>
	);
}