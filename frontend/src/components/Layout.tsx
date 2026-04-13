import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import AIChatWidget from './AIChatWidget';

export default function Layout() {
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	// 🔥 НАДЁЖНЫЙ POLLING: рекурсивный setTimeout (как в старом проекте, не throttlится!)
	// + visibilitychange и focus для мгновенного обновления при переключении окна
	useEffect(() => {
		const dispatch = () => window.dispatchEvent(new Event('sync-updated'));

		// Рекурсивный setTimeout — следующий вызов планируется ПОСЛЕ завершения текущего.
		// Браузер меньше throttlит его по сравнению с setInterval в фоновых вкладках.
		let timerId: ReturnType<typeof setTimeout>;
		const loop = () => {
			dispatch();
			timerId = setTimeout(loop, 5000);
		};
		timerId = setTimeout(loop, 5000);

		// МГНОВЕННО при переключении вкладки (tab visibility)
		const onVisible = () => {
			if (document.visibilityState === 'visible') dispatch();
		};
		document.addEventListener('visibilitychange', onVisible);

		// МГНОВЕННО при клике на окно (window focus)
		const onFocus = () => dispatch();
		window.addEventListener('focus', onFocus);

		return () => {
			clearTimeout(timerId);
			document.removeEventListener('visibilitychange', onVisible);
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