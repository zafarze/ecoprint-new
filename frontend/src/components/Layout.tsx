import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import AIChatWidget from './AIChatWidget';

export default function Layout() {
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	// 🔥 НАДЁЖНЫЙ POLLING: 3 механизма синхронизации, ни один не зависит от браузерного throttling
	useEffect(() => {
		const dispatch = () => window.dispatchEvent(new Event('sync-updated'));

		// 1) Каждые 4 секунды (работает пока вкладка активна на экране)
		const interval = setInterval(dispatch, 4000);

		// 2) МГНОВЕННО при переключении вкладки (tab focus/unfocus)
		//    Это главное решение против Chrome throttling фоновых вкладок!
		const onVisibility = () => {
			if (document.visibilityState === 'visible') dispatch();
		};
		document.addEventListener('visibilitychange', onVisibility);

		// 3) МГНОВЕННО при клике на окно браузера (когда переключаешь между окнами)
		const onFocus = () => dispatch();
		window.addEventListener('focus', onFocus);

		return () => {
			clearInterval(interval);
			document.removeEventListener('visibilitychange', onVisibility);
			window.removeEventListener('focus', onFocus);
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