import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, RefreshCw, Bell, User, LogOut, Sparkles, Calendar, Clock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

// Импортируем наш настроенный axios (убедитесь, что путь правильный)
import api from '../api/api';

interface HeaderProps {
	onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
	const [isProfileOpen, setIsProfileOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const navigate = useNavigate();

	const [deadlineStats, setDeadlineStats] = useState({ today: 0, tomorrow: 0, overdue: 0 });

	const userStr = localStorage.getItem('user');
	const username = userStr ? JSON.parse(userStr).username : 'Admin';
	const userInitial = username.charAt(0).toUpperCase();

	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsProfileOpen(false);
			}
		}
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	useEffect(() => {
		// 🔥 Обновленная функция с использованием api.ts
		const fetchDeadlineStats = async () => {
			try {
				// Axios сам подставит URL и токен из localStorage
				const res = await api.get('header-stats/');
				// Axios автоматически парсит JSON и кладет его в свойство .data
				setDeadlineStats(res.data);
			} catch (e) {
				console.error("Ошибка загрузки статистики хедера:", e);
			}
		};

		fetchDeadlineStats();
		const interval = setInterval(fetchDeadlineStats, 60000);

		window.addEventListener('orders-updated', fetchDeadlineStats);

		return () => {
			clearInterval(interval);
			window.removeEventListener('orders-updated', fetchDeadlineStats);
		};
	}, []);

	const handleLogout = () => {
		localStorage.removeItem('token');
		localStorage.removeItem('user');
		setIsProfileOpen(false);
		navigate('/login');
	};

	// 🔥 Обновленная функция с использованием api.ts
	const handleSync = async () => {
		const syncToast = toast.loading('Синхронизация данных...');

		try {
			// Просто делаем POST запрос. Токен прикрепится автоматически!
			await api.post('sync-sheets/');
			toast.success('Синхронизация успешно выполнена!', { id: syncToast });
		} catch (e) {
			toast.error('Ошибка сети при попытке синхронизации', { id: syncToast });
		}
	};

	return (
		<div className="px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 lg:pt-8 pb-2 z-30 relative">
			<header className="h-16 bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-eco-sm rounded-3xl flex items-center justify-between px-4 sm:px-6 transition-all duration-300">

				<div className="flex items-center gap-3">
					<button onClick={onMenuClick} className="lg:hidden p-2.5 text-slate-500 hover:bg-white hover:shadow-sm hover:text-primary rounded-xl transition-all">
						<Menu size={22} />
					</button>

					<button onClick={handleSync} className="hidden sm:flex items-center gap-2 px-4 py-2 bg-slate-100/50 text-slate-600 hover:text-primary hover:bg-white border border-transparent hover:border-slate-200 hover:shadow-sm rounded-xl font-bold text-sm transition-all active:scale-95 group">
						<RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-500" />
						<span>Синхронизировать</span>
					</button>

					<div className="hidden md:flex items-center gap-2 ml-2 pl-4 border-l border-slate-200/80">

						{deadlineStats.overdue > 0 && (
							<button
								onClick={() => navigate('/?deadline=overdue')}
								className="flex items-center gap-2 px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-xl text-sm font-black shadow-sm border border-rose-300 cursor-pointer transition-all active:scale-95 animate-pulse"
								title="Показать просроченные заказы"
							>
								<AlertCircle size={16} className="mb-0.5" />
								<span>Просрочено: {deadlineStats.overdue}</span>
							</button>
						)}

						<button
							onClick={() => navigate('/?deadline=today')}
							className="flex items-center gap-2 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-black shadow-sm border border-red-200 cursor-pointer transition-all active:scale-95"
							title="Заказы со сдачей на сегодня"
						>
							<Calendar size={16} className="mb-0.5" />
							<span>Сегодня: {deadlineStats.today}</span>
						</button>
						<button
							onClick={() => navigate('/?deadline=tomorrow')}
							className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-xl text-sm font-black shadow-sm border border-amber-200 cursor-pointer transition-all active:scale-95"
							title="Заказы со сдачей на завтра"
						>
							<Clock size={16} className="mb-0.5" />
							<span>Завтра: {deadlineStats.tomorrow}</span>
						</button>
					</div>
				</div>

				<div className="flex items-center gap-2 sm:gap-4">
					<button onClick={() => toast('У вас нет новых уведомлений', { icon: '🔔' })} className="p-2.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-xl transition-all relative group">
						<Bell size={22} className="group-hover:animate-bounce" />
						<span className="absolute top-2.5 right-3 w-2 h-2 bg-eco-pink rounded-full border-2 border-white/80"></span>
					</button>

					<div className="w-px h-8 bg-slate-200 mx-1 hidden sm:block"></div>

					<div className="relative" ref={dropdownRef}>
						<button onClick={() => setIsProfileOpen(!isProfileOpen)} className="w-10 h-10 rounded-full bg-gradient-eco text-white font-black flex items-center justify-center text-lg shadow-md hover:shadow-lg hover:shadow-primary/30 hover:scale-105 transition-all outline-none focus:ring-4 focus:ring-primary/20">
							{userInitial}
						</button>

						{isProfileOpen && (
							<div className="absolute right-0 mt-3 w-64 bg-white rounded-3xl shadow-eco-xl border border-slate-100 py-3 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
								<div className="px-5 py-3 border-b border-slate-50 mb-2 flex items-center gap-3">
									<div className="w-12 h-12 rounded-full bg-gradient-eco text-white font-black flex items-center justify-center text-xl shadow-inner">{userInitial}</div>
									<div>
										<p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Администратор</p>
										<p className="text-sm font-black text-slate-800 truncate">{username}</p>
									</div>
								</div>

								<div className="px-2">
									<Link to="/profile" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-600 hover:text-primary hover:bg-primary-light rounded-xl transition-colors"><User size={18} />Мой профиль</Link>
									<Link to="/settings" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors mt-1"><Sparkles size={18} />Настройки</Link>
									<div className="h-px bg-slate-100 my-2 mx-4"></div>
									<button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors"><LogOut size={18} />Выйти из системы</button>
								</div>
							</div>
						)}
					</div>
				</div>
			</header>
		</div>
	);
}