import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import AIChatWidget from './AIChatWidget'; // <-- 1. ИМПОРТИРУЕМ НАШ ЧАТ

export default function Layout() {
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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