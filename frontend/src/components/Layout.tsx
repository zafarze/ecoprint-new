import { useState, useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import AIChatWidget from './AIChatWidget';
import api from '../api/api';

export default function Layout() {
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const lastUpdatedRef = useRef<number | null>(null);

	// Глобальный пуллинг для "мгновенных" обновлений
	useEffect(() => {
		const pollState = async () => {
			try {
				const res = await api.get('system-state/');
				const newLastUpdated = res.data.last_updated;

				if (lastUpdatedRef.current !== null && newLastUpdated > lastUpdatedRef.current) {
					// Если данные изменились с прошлой проверки, рассылаем событие всем страницам
					window.dispatchEvent(new Event('sync-updated'));
				}
				lastUpdatedRef.current = newLastUpdated;
			} catch (e) {
				// Игнорируем ошибки сети при пуллинге
			}
		};

		// Первоначальный запрос, чтобы узнать стартовое время
		pollState();

		// Проверяем каждую 1 секунду (почти мгновенно для пользователя, но легко для сервера)
		const interval = setInterval(pollState, 1000);
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