import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, BarChart2, Package, Archive, Settings, X, ChevronLeft, ChevronRight, LogOut } from 'lucide-react';

interface SidebarProps {
	isOpen: boolean;
	onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
	const [isCollapsed, setIsCollapsed] = useState(false);
	// useNavigate нам больше не нужен для логаута, но мы его оставим, вдруг пригодится


	const menuItems = [
		{ path: '/', icon: Home, label: 'Главная' },
		{ path: '/statistics', icon: BarChart2, label: 'Статистика' },
		{ path: '/products', icon: Package, label: 'Товары' },
		{ path: '/archive', icon: Archive, label: 'Архив заказов' },
		{ path: '/settings', icon: Settings, label: 'Настройки' },
	];

	// 🔥 Изменили только эту функцию
	const handleLogout = () => {
		localStorage.removeItem('token');
		localStorage.removeItem('user');
		// Заменяем navigate на window.location.href, чтобы жестко сбросить все стейты React
		window.location.href = '/login';
	};

	return (
		<>
			{/* Мобильный затемненный фон */}
			{isOpen && (
				<div
					className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity"
					onClick={onClose}
				/>
			)}

			{/* Сам сайдбар */}
			<aside
				className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200 shadow-xl lg:shadow-none lg:static transform transition-all duration-300 ease-in-out flex flex-col 
                    ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} 
                    ${isCollapsed ? 'w-72 lg:w-24' : 'w-72 lg:w-72'}
                `}
			>
				{/* Логотип */}
				<div className={`h-20 flex items-center border-b border-slate-100 transition-all duration-300 ${isCollapsed ? 'lg:justify-center px-6 lg:px-0 justify-between' : 'justify-between px-6'}`}>
					<NavLink to="/" onClick={onClose} className="flex items-center gap-3 group" title="На главную">
						<span className="text-3xl filter drop-shadow-sm animate-float shrink-0">🦋</span>
						<div className={`text-2xl font-black tracking-tight text-slate-800 whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'lg:opacity-0 lg:w-0 lg:overflow-hidden' : 'opacity-100 w-auto'}`}>
							<span className="text-eco-pink">Эко</span>
							<span className="text-eco-blue">Принт</span>
						</div>
					</NavLink>
					{/* Кнопка закрытия только для мобилок */}
					<button onClick={onClose} className="lg:hidden p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors shrink-0">
						<X size={24} />
					</button>
				</div>

				{/* Навигация */}
				<nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
					{menuItems.map((item) => (
						<NavLink
							key={item.path}
							to={item.path}
							onClick={onClose}
							title={isCollapsed ? item.label : undefined}
							className={({ isActive }) =>
								`flex items-center px-4 py-3.5 rounded-2xl font-bold transition-all duration-200 ${isActive
									? 'bg-gradient-eco shadow-eco-md text-white'
									: 'text-slate-500 hover:bg-slate-50 hover:text-primary hover:scale-[1.02]'
								} ${isCollapsed ? 'gap-0 lg:justify-center lg:px-0' : 'gap-4'}`
							}
						>
							<item.icon size={20} className="shrink-0" />
							<span className={`whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'lg:opacity-0 lg:w-0 lg:overflow-hidden' : 'opacity-100 w-auto'}`}>
								{item.label}
							</span>
						</NavLink>
					))}
				</nav>

				{/* 🔥 Подвал сайдбара: Выход + Сворачивание */}
				<div className={`p-4 border-t border-slate-100 flex ${isCollapsed ? 'flex-col items-center gap-4' : 'items-center justify-between'} mt-auto`}>

					{/* Кнопка Выхода */}
					<button
						onClick={handleLogout}
						className={`flex items-center text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200 outline-none ${isCollapsed ? 'p-3 justify-center w-full' : 'px-4 py-2 gap-3 w-full max-w-[140px]'
							}`}
						title="Выйти из системы"
					>
						<LogOut size={20} className="shrink-0" />
						<span className={`whitespace-nowrap font-bold transition-all duration-300 ${isCollapsed ? 'hidden' : 'block'}`}>
							Выход
						</span>
					</button>

					{/* Яркая кнопка сворачивания (скрыта на мобилках) */}
					<button
						onClick={() => setIsCollapsed(!isCollapsed)}
						className={`hidden lg:flex rounded-xl text-white bg-gradient-eco shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300 items-center justify-center shrink-0 outline-none ${isCollapsed ? 'p-3 w-full' : 'p-2'
							}`}
						title={isCollapsed ? 'Развернуть меню' : 'Свернуть меню'}
					>
						{isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
					</button>
				</div>
			</aside>
		</>
	);
}