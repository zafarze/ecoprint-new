import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, RefreshCw, Bell, User, LogOut, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

interface HeaderProps {
	onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
	const [isProfileOpen, setIsProfileOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const navigate = useNavigate();

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

	const handleLogout = () => {
		localStorage.removeItem('token');
		localStorage.removeItem('user');
		setIsProfileOpen(false);
		navigate('/login');
	};

	const handleSync = async () => {
		const token = localStorage.getItem('token');
		const syncToast = toast.loading('Синхронизация данных...');

		try {
			// Берем базовый URL из .env файла (Vite подставит нужное значение: локальное или продакшен)
			const baseUrl = import.meta.env.VITE_API_URL;

			const res = await fetch(`${baseUrl}/api/sync-sheets/`, {
				method: 'POST',
				headers: { 'Authorization': `Bearer ${token}` }
			});

			if (res.ok) {
				toast.success('Синхронизация успешно выполнена!', { id: syncToast });
			} else {
				toast.success('Тестовая синхронизация завершена', { id: syncToast });
			}
		} catch (e) {
			console.error(e);
			toast.error('Ошибка сети при попытке синхронизации', { id: syncToast });
		}
	};

	return (
		// "Плавающий" (Floating) контейнер хедера с эффектом стекла
		<div className="px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 lg:pt-8 pb-2 z-30 relative">
			<header className="h-16 bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-eco-sm rounded-3xl flex items-center justify-between px-4 sm:px-6 transition-all duration-300">

				{/* Левая часть: Гамбургер + Синхронизация */}
				<div className="flex items-center gap-3">
					<button
						onClick={onMenuClick}
						className="lg:hidden p-2.5 text-slate-500 hover:bg-white hover:shadow-sm hover:text-primary rounded-xl transition-all"
					>
						<Menu size={22} />
					</button>

					<button
						onClick={handleSync}
						className="hidden sm:flex items-center gap-2 px-4 py-2 bg-slate-100/50 text-slate-600 hover:text-primary hover:bg-white border border-transparent hover:border-slate-200 hover:shadow-sm rounded-xl font-bold text-sm transition-all active:scale-95 group"
					>
						<RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-500" />
						<span>Синхронизировать</span>
					</button>
				</div>

				{/* Правая часть: Уведомления + Профиль */}
				<div className="flex items-center gap-2 sm:gap-4">

					<button
						onClick={() => toast('У вас нет новых уведомлений', { icon: '🔔' })}
						className="p-2.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-xl transition-all relative group"
					>
						<Bell size={22} className="group-hover:animate-bounce" />
						{/* Индикатор новых уведомлений (точка) */}
						<span className="absolute top-2.5 right-3 w-2 h-2 bg-eco-pink rounded-full border-2 border-white/80"></span>
					</button>

					<div className="w-px h-8 bg-slate-200 mx-1 hidden sm:block"></div> {/* Разделитель */}

					<div className="relative" ref={dropdownRef}>
						<button
							onClick={() => setIsProfileOpen(!isProfileOpen)}
							className="w-10 h-10 rounded-full bg-gradient-eco text-white font-black flex items-center justify-center text-lg shadow-md hover:shadow-lg hover:shadow-primary/30 hover:scale-105 transition-all outline-none focus:ring-4 focus:ring-primary/20"
						>
							{userInitial}
						</button>

						{/* Выпадающее меню профиля */}
						{isProfileOpen && (
							<div className="absolute right-0 mt-3 w-64 bg-white rounded-3xl shadow-eco-xl border border-slate-100 py-3 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
								<div className="px-5 py-3 border-b border-slate-50 mb-2 flex items-center gap-3">
									<div className="w-12 h-12 rounded-full bg-gradient-eco text-white font-black flex items-center justify-center text-xl shadow-inner">
										{userInitial}
									</div>
									<div>
										<p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Администратор</p>
										<p className="text-sm font-black text-slate-800 truncate">{username}</p>
									</div>
								</div>

								<div className="px-2">
									<Link
										to="/profile"
										onClick={() => setIsProfileOpen(false)}
										className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-600 hover:text-primary hover:bg-primary-light rounded-xl transition-colors"
									>
										<User size={18} />
										Мой профиль
									</Link>

									<Link
										to="/settings"
										onClick={() => setIsProfileOpen(false)}
										className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors mt-1"
									>
										<Sparkles size={18} />
										Настройки
									</Link>

									<div className="h-px bg-slate-100 my-2 mx-4"></div>

									<button
										onClick={handleLogout}
										className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors"
									>
										<LogOut size={18} />
										Выйти из системы
									</button>
								</div>
							</div>
						)}
					</div>
				</div>

			</header>
		</div>
	);
}