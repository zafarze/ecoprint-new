import { useState, useEffect } from 'react';
import { TrendingUp, Clock, CalendarDays, Star, BarChart3, PieChart as PieChartIcon, Loader2 } from 'lucide-react';
import {
	AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
	PieChart, Pie, Cell, Legend
} from 'recharts';
import Card from '../components/ui/Card';

// 🔥 1. Импортируем наш настроенный Axios
import api from '../api/api';

// Цвета для круговой диаграммы (Tailwind цвета: изумрудный, желтый, розовый, синий)
const PIE_COLORS = ['#10b981', '#f59e0b', '#ec4899', '#3b82f6'];

export default function StatisticsPage() {
	const [period, setPeriod] = useState('week');
	const [isLoading, setIsLoading] = useState(true);

	const [stats, setStats] = useState({
		total_orders: 0,
		pending_orders: 0,
		created_today: 0,
		top_product: 'Загрузка...',
		status_counts: { labels: [], counts: [] },
		dynamics_data: []
	});

	useEffect(() => {
		const fetchStats = async () => {
			setIsLoading(true);

			try {
				// 🔥 2. Магия api.ts: Короткий запрос! Токен и проверки на 401 работают под капотом.
				const res = await api.get(`statistics-data/?period=${period}`);

				// Axios автоматически парсит JSON, данные лежат в свойстве .data
				setStats(res.data);
			} catch (err) {
				console.error("Ошибка при загрузке статистики:", err);
			} finally {
				setIsLoading(false);
			}
		};

		fetchStats();
	}, [period]); // 🧹 Убрали navigate, он здесь больше не нужен

	// Форматируем данные для круговой диаграммы
	const pieData = stats.status_counts.labels.map((label: string, index: number) => ({
		name: label === 'ready' ? 'Готово' : label === 'in-progress' ? 'В процессе' : 'Не готов',
		value: stats.status_counts.counts[index]
	}));

	// Вспомогательный компонент для карточки-статистики
	const StatWidget = ({ title, value, icon: Icon, colorClass }: any) => (
		<Card className={`relative overflow-hidden group animate-in fade-in slide-in-from-bottom-4`}>
			<div className="flex items-center justify-between">
				<div>
					<p className="text-sm font-bold text-slate-400 mb-1">{title}</p>
					<h3 className="text-3xl font-black text-slate-800">{isLoading ? <Loader2 className="animate-spin text-slate-300 mt-1" size={28} /> : value}</h3>
				</div>
				<div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 group-hover:rotate-3 ${colorClass}`}>
					<Icon size={24} strokeWidth={2.5} />
				</div>
			</div>
			{/* Декоративный блик */}
			<div className="absolute -right-6 -top-6 w-24 h-24 bg-white opacity-20 rounded-full blur-2xl transform group-hover:scale-150 transition-transform duration-500 pointer-events-none"></div>
		</Card>
	);

	return (
		<div className="space-y-6">

			{/* Шапка страницы и фильтр периодов */}
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
				<div>
					<h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
						<BarChart3 className="text-primary" size={32} strokeWidth={2.5} />
						Аналитика
					</h1>
					<p className="text-sm font-bold text-slate-400 mt-1">Ключевые показатели бизнеса</p>
				</div>

				{/* Переключатель периодов (Стиль "таблетки") */}
				<div className="bg-slate-200/50 p-1 rounded-xl flex gap-1 shadow-inner">
					{[
						{ id: 'week', label: 'Неделя' },
						{ id: 'month', label: 'Месяц' },
						{ id: 'year', label: 'Год' }
					].map((p) => (
						<button
							key={p.id}
							onClick={() => setPeriod(p.id)}
							className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${period === p.id
								? 'bg-white text-primary shadow-sm'
								: 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
								}`}
						>
							{p.label}
						</button>
					))}
				</div>
			</div>

			{/* Верхний ряд: Виджеты KPI (Сетка 4 колонки) */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
				<StatWidget title="Всего заказов" value={stats.total_orders} icon={TrendingUp} colorClass="bg-blue-100 text-blue-600" />
				<StatWidget title="В ожидании" value={stats.pending_orders} icon={Clock} colorClass="bg-amber-100 text-amber-600" />
				<StatWidget title="Создано сегодня" value={stats.created_today} icon={CalendarDays} colorClass="bg-emerald-100 text-emerald-600" />
				<StatWidget title="Хит продаж" value={stats.top_product} icon={Star} colorClass="bg-pink-100 text-pink-600" />
			</div>

			{/* Нижний ряд: Графики */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700">

				{/* Главный график: Динамика (занимает 2/3 ширины) */}
				<Card className="lg:col-span-2 flex flex-col">
					<div className="flex items-center gap-2 mb-6">
						<TrendingUp className="text-slate-400" size={20} />
						<h3 className="font-black text-slate-800 text-lg">Динамика заказов</h3>
					</div>
					<div className="flex-1 min-h-[300px]">
						{isLoading ? (
							<div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
								<Loader2 className="animate-spin mb-2" size={32} />
								<p className="font-bold text-sm">Построение графика...</p>
							</div>
						) : stats.dynamics_data.length > 0 ? (
							<ResponsiveContainer width="100%" height="100%">
								<AreaChart data={stats.dynamics_data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
									<defs>
										<linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
											<stop offset="5%" stopColor="#0088cc" stopOpacity={0.4} />
											<stop offset="95%" stopColor="#0088cc" stopOpacity={0} />
										</linearGradient>
									</defs>
									<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
									<XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} dy={10} />
									<YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} />
									<Tooltip
										contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
										itemStyle={{ color: '#0088cc' }}
										cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
									/>
									<Area type="monotone" dataKey="orders" stroke="#0088cc" strokeWidth={4} fillOpacity={1} fill="url(#colorOrders)" activeDot={{ r: 6, strokeWidth: 0, fill: '#ec4899' }} />
								</AreaChart>
							</ResponsiveContainer>
						) : (
							<div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-sm">Нет данных за выбранный период</div>
						)}
					</div>
				</Card>

				{/* Круговая диаграмма: Статусы (занимает 1/3 ширины) */}
				<Card className="flex flex-col">
					<div className="flex items-center gap-2 mb-6">
						<PieChartIcon className="text-slate-400" size={20} />
						<h3 className="font-black text-slate-800 text-lg">Статусы работ</h3>
					</div>
					<div className="flex-1 min-h-[300px]">
						{isLoading ? (
							<div className="w-full h-full flex items-center justify-center"><Loader2 className="animate-spin text-slate-300" size={32} /></div>
						) : pieData.length > 0 ? (
							<ResponsiveContainer width="100%" height="100%">
								<PieChart>
									<Pie
										data={pieData}
										cx="50%"
										cy="45%"
										innerRadius={60}
										outerRadius={90}
										paddingAngle={5}
										dataKey="value"
										stroke="none"
									>
										{pieData.map((_, index) => (
											<Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
										))}
									</Pie>
									<Tooltip
										contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
									/>
									<Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }} />
								</PieChart>
							</ResponsiveContainer>
						) : (
							<div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-sm">Нет активных заказов</div>
						)}
					</div>
				</Card>

			</div>
		</div>
	);
}