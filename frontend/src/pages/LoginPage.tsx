import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Loader2, Sparkles, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
	const navigate = useNavigate();
	const currentYear = new Date().getFullYear();

	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [activeLang, setActiveLang] = useState('ru');

	// --- 3D Эффект ---
	const x = useMotionValue(0);
	const y = useMotionValue(0);
	const rotateX = useTransform(y, [-100, 100], [5, -5]);
	const rotateY = useTransform(x, [-100, 100], [-5, 5]);

	useEffect(() => {
		// Чистим старые данные при заходе на страницу логина (выход из системы)
		localStorage.removeItem('token');
		localStorage.removeItem('user');
	}, []);

	const handleMouseMove = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
		const rect = event.currentTarget.getBoundingClientRect();
		const width = rect.width;
		const height = rect.height;
		const mouseX = event.clientX - rect.left;
		const mouseY = event.clientY - rect.top;
		const xPct = mouseX / width - 0.5;
		const yPct = mouseY / height - 0.5;
		x.set(xPct * 200);
		y.set(yPct * 200);
	};

	const handleMouseLeave = () => {
		x.set(0); y.set(0);
	};

	// --- ОБНОВЛЕННАЯ ЛОГИКА АВТОРИЗАЦИИ ---
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError('');

		try {
			// Отправляем запрос на эндпоинт получения токена (SimpleJWT)
			const response = await fetch('http://127.0.0.1:8000/api/token/', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ username, password }),
			});

			if (response.ok) {
				const data = await response.json();

				// Сохраняем токен (access токен для авторизации последующих запросов)
				localStorage.setItem('token', data.access || data.token);

				// Можно также сохранить имя пользователя для отображения в хедере дашборда
				localStorage.setItem('user', JSON.stringify({ username }));

				// Перекидываем пользователя на главную страницу (Дашборд)
				navigate('/');
			} else {
				// Если сервер ответил ошибкой (например, неверный пароль)
				setError('Неверный логин или пароль');
			}
		} catch (err) {
			console.error('Ошибка входа:', err);
			setError('Нет связи с сервером Django. Проверьте, запущен ли он.');
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden font-sans selection:bg-cyan-100 selection:text-cyan-800">

			{/* Стили для кастомных анимаций сетки и бабочки */}
			<style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                .animate-float {
                    animation: float 3s ease-in-out infinite;
                }
            `}</style>

			{/* ФОН: Полиграфическая точечная сетка (Halftone) */}
			<div className="absolute inset-0 z-0 opacity-[0.4] pointer-events-none"
				style={{
					backgroundImage: 'radial-gradient(circle, #94a3b8 1.5px, transparent 1.5px)',
					backgroundSize: '24px 24px',
					maskImage: 'radial-gradient(circle at center, black 40%, transparent 90%)',
					WebkitMaskImage: 'radial-gradient(circle at center, black 40%, transparent 90%)'
				}}>
			</div>

			{/* Декоративные полиграфические метки (Crop marks & Registration marks) */}
			<div className="absolute inset-6 z-0 pointer-events-none opacity-30">
				{/* Углы */}
				<div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-slate-400"></div>
				<div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-slate-400"></div>
				<div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-slate-400"></div>
				<div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-slate-400"></div>

				{/* Центры (приводные метки) */}
				<div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-4 bg-slate-400"></div>
				<div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-px h-4 bg-slate-400"></div>
				<div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-px bg-slate-400"></div>
				<div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-px bg-slate-400"></div>
			</div>

			{/* Размытые пятна в стилистике CMYK */}
			<div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
				<div className="absolute top-[10%] left-[10%] w-[600px] h-[600px] bg-cyan-400/15 rounded-full mix-blend-multiply filter blur-[100px] animate-pulse"></div>
				<div className="absolute top-[20%] right-[10%] w-[500px] h-[500px] bg-pink-500/10 rounded-full mix-blend-multiply filter blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
				<div className="absolute -bottom-[10%] left-[30%] w-[700px] h-[700px] bg-yellow-400/15 rounded-full mix-blend-multiply filter blur-[120px] animate-pulse" style={{ animationDelay: '4s' }}></div>
			</div>

			{/* 3D КАРТОЧКА */}
			<motion.div
				className="relative w-full max-w-[400px] mx-4 p-0 z-10"
				style={{ perspective: 1000 }}
				onMouseMove={handleMouseMove}
				onMouseLeave={handleMouseLeave}
				initial={{ scale: 0.9, opacity: 0, y: 30 }}
				animate={{ scale: 1, opacity: 1, y: 0 }}
				transition={{ type: "spring", duration: 0.8 }}
			>
				<motion.div style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}>
					<div className="absolute inset-6 bg-white/40 blur-3xl rounded-full -z-10"></div>
					<div className="bg-white/70 backdrop-blur-2xl rounded-[2.5rem] p-6 sm:p-10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] border border-white/60 relative overflow-hidden group">

						{/* Языки */}
						<div className="flex justify-center mb-4 sm:mb-0 sm:absolute sm:top-6 sm:right-6 z-20 relative">
							<div className="bg-white/50 backdrop-blur-md p-1 rounded-xl flex items-center gap-1 shadow-sm border border-white/50">
								{['ru', 'tj', 'en'].map((lang) => (
									<button
										key={lang}
										onClick={() => setActiveLang(lang)}
										className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all duration-200 ${activeLang === lang ? 'bg-white text-blue-600 shadow-md scale-105 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}
									>
										{lang}
									</button>
								))}
							</div>
						</div>

						<div className="relative z-10 flex flex-col items-center text-center">
							{/* Анимированная бабочка EcoPrint */}
							<motion.div
								initial={{ scale: 0, rotate: -45 }}
								animate={{ scale: 1, rotate: 0 }}
								transition={{ type: "spring", delay: 0.2 }}
								className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-tr from-blue-50 to-white rounded-2xl flex items-center justify-center mb-4 sm:mb-6 shadow-inner border border-white"
							>
								<span className="text-4xl sm:text-5xl filter drop-shadow-md animate-float cursor-pointer">🦋</span>
							</motion.div>

							<motion.h1
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.3 }}
								className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight mb-2"
							>
								ЭкоПринт
							</motion.h1>
							<motion.p
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ delay: 0.4 }}
								className="text-slate-500 font-bold text-xs max-w-[200px] leading-relaxed mb-6 sm:mb-8"
							>
								Твой путь к успешным заказам начинается здесь.
							</motion.p>

							<AnimatePresence>
								{error && (
									<motion.div
										initial={{ opacity: 0, height: 0, marginBottom: 0 }}
										animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
										exit={{ opacity: 0, height: 0, mb: 0 }}
										className="w-full bg-red-50/80 backdrop-blur-sm text-red-500 text-xs font-bold py-3 rounded-xl border border-red-100 flex items-center justify-center gap-2 overflow-hidden"
									>
										<span className="text-lg">⚠️</span> {error}
									</motion.div>
								)}
							</AnimatePresence>

							<form onSubmit={handleSubmit} className="w-full space-y-4 sm:space-y-5">
								<div className="text-left group">
									<label className="block text-[10px] font-black text-slate-400 uppercase ml-1 mb-1.5 transition-colors group-focus-within:text-blue-500">
										Логин
									</label>
									<div className="relative transform transition-all duration-300 focus-within:scale-[1.02]">
										<input
											type="text"
											className="w-full bg-white/60 border-2 border-slate-100 rounded-2xl px-5 py-3 sm:py-4 text-slate-800 font-bold text-sm focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
											placeholder="admin"
											value={username}
											onChange={(e) => setUsername(e.target.value)}
											required
										/>
									</div>
								</div>

								<div className="text-left group">
									<label className="block text-[10px] font-black text-slate-400 uppercase ml-1 mb-1.5 transition-colors group-focus-within:text-blue-500">
										Пароль
									</label>
									<div className="relative transform transition-all duration-300 focus-within:scale-[1.02]">
										<input
											type={showPassword ? "text" : "password"}
											className="w-full bg-white/60 border-2 border-slate-100 rounded-2xl px-5 py-3 sm:py-4 text-slate-800 font-bold text-sm focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm pr-12"
											placeholder="••••••••"
											value={password}
											onChange={(e) => setPassword(e.target.value)}
											required
										/>
										<button
											type="button"
											onClick={() => setShowPassword(!showPassword)}
											className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors p-1"
										>
											{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
										</button>
									</div>
								</div>

								{/* Кнопка с градиентом EcoPrint */}
								<motion.button
									type="submit"
									disabled={isLoading}
									whileHover={{ scale: 1.03, boxShadow: "0 15px 35px -10px rgba(0, 136, 204, 0.4)" }}
									whileTap={{ scale: 0.98 }}
									className="w-full mt-2 bg-gradient-to-r from-pink-500 to-blue-500 hover:from-pink-600 hover:to-blue-600 text-white font-black py-3 sm:py-4 rounded-2xl shadow-xl shadow-blue-200 transition-all relative overflow-hidden group"
								>
									<div className="absolute inset-0 bg-white/20 translate-y-full hover:translate-y-0 transition-transform duration-300 rounded-2xl"></div>
									<span className="relative z-10 flex items-center justify-center gap-2">
										{isLoading ? (
											<><Loader2 className="animate-spin" size={20} /><span>ВХОД...</span></>
										) : (
											<><span>ПОЕХАЛИ!</span><Sparkles size={18} className="animate-pulse" /></>
										)}
									</span>
								</motion.button>
							</form>
						</div>
					</div>

					{/* Копирайт */}
					<motion.p
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 1 }}
						className="text-center text-slate-400 text-[10px] font-bold tracking-[0.2em] uppercase mt-8 absolute bottom-[-50px] w-full"
					>
						ECOPRINT © {currentYear}
					</motion.p>
				</motion.div>
			</motion.div>
		</div>
	);
}