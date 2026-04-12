import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import AIChatWidget from './AIChatWidget';

export default function Layout() {
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	// 🔥 Простой и надёжный polling: каждые 4 секунды рассылаем sync-updated всем страницам.
	// Используем Web Worker, чтобы браузер не замедлял polling до 1 минуты в фоновых вкладках.
	// OrdersPage сама защищает оптимистичные обновления через pendingItemIds.
	useEffect(() => {
		const worker = new Worker(new URL('../workers/pollingWorker.ts', import.meta.url), { type: 'module' });

		worker.onmessage = (e) => {
			if (e.data?.type === 'TICK') {
				window.dispatchEvent(new Event('sync-updated'));
			}
		};

		worker.postMessage({ type: 'START', interval: 4000 });

		// Мгновенная синхронизация при возвращении пользователя на вкладку
		const handleVisibilityChange = () => {
			if (document.visibilityState === 'visible') {
				window.dispatchEvent(new Event('sync-updated'));
			}
		};
		document.addEventListener('visibilitychange', handleVisibilityChange);

		return () => {
			worker.postMessage({ type: 'STOP' });
			worker.terminate();
			document.removeEventListener('visibilitychange', handleVisibilityChange);
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