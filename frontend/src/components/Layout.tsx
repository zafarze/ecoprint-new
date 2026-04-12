import { useState, useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import AIChatWidget from './AIChatWidget';
import api from '../api/api';

export default function Layout() {
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const lastUpdatedRef = useRef<number | null>(null);

	// Глобальный пуллинг для «мгновенных» обновлений
	useEffect(() => {
		const pollState = async () => {
			try {
				const res = await api.get('system-state/');
				const newLastUpdated = res.data.last_updated;

				if (lastUpdatedRef.current !== null && newLastUpdated > lastUpdatedRef.current) {
					// Изменения обнаружены — мгновенно рассылаем событие всем страницам
					window.dispatchEvent(new Event('sync-updated'));
					// Через 600мс повторяем (фоновые потоки бэкенда могут не успеть за первым разом)
					setTimeout(() => window.dispatchEvent(new Event('sync-updated')), 600);
				}
				lastUpdatedRef.current = newLastUpdated;
			} catch (e) {
				// Игнорируем ошибки сети при пуллинге
			}
		};

		// Первоначальный запрос, чтобы узнать стартовое время
		pollState();

		// Проверяем каждые 2 секунды (достаточно быстро, но меньше нагрузки на сервер)
		const interval = setInterval(pollState, 2000);
		return () => clearInterval(interval);
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