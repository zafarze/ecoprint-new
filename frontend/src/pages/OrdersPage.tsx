// src/pages/OrdersPage.tsx
import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
	Plus, Search, Edit2, Archive, Loader2, PackageOpen,
	X, PlayCircle, Flag, User, AlertCircle, Filter,
	MessageSquare, Trash2, CheckSquare, Square, ChevronLeft, ChevronRight, Copy, Phone, Calendar, Clock, CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Form';
import OrderModal from '../modals/OrderModal';
import ConfirmDeleteModal from '../modals/ConfirmDeleteModal';

import api from '../api/api';

// 🎨 Цветовые схемы для статусов (Серый, Оранжевый, Зеленый)
const CARD_STYLES: Record<string, string> = {
	'ready': 'bg-emerald-50/40 border-emerald-200 text-emerald-950', // Готово - Зеленый
	'in-progress': 'bg-orange-50 border-orange-300 text-orange-950 shadow-sm', // В процессе - Оранжевый
	'not-ready': 'bg-slate-50 border-slate-300 text-slate-800 shadow-sm' // Не готов - Серый (хокистаранг)
};

const BADGE_STYLES: Record<string, string> = {
	'ready': 'bg-emerald-500 text-white hover:bg-emerald-600',
	'in-progress': 'bg-orange-500 text-white hover:bg-orange-600',
	'not-ready': 'bg-slate-500 text-white hover:bg-slate-600 shadow-sm'
};

const BADGE_LABELS: Record<string, string> = {
	'ready': 'Готово',
	'in-progress': 'В процессе',
	'not-ready': 'Не готов'
};

const getLocalDateStr = (offsetDays = 0) => {
	const d = new Date();
	d.setDate(d.getDate() + offsetDays);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function OrdersPage() {
	const userStr = localStorage.getItem('user');
	const user = userStr ? JSON.parse(userStr) : null;
	const userRole = user?.role || 'worker';
	const canIssueOrders = userRole === 'manager' || userRole === 'superadmin' || userRole === 'admin';

	const [orders, setOrders] = useState<any[]>([]);
	const [allProducts, setAllProducts] = useState<any[]>([]);

	const [searchParams, setSearchParams] = useSearchParams();
	const deadlineFilter = searchParams.get('deadline');

	const [searchQuery, setSearchQuery] = useState('');
	const [activeStatus, setActiveStatus] = useState<string | null>(null);
	const [activeProduct, setActiveProduct] = useState<string | null>(null);

	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 30;

	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingOrder, setEditingOrder] = useState<any>(null);
	const [isLoading, setIsLoading] = useState(true);

	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [orderToDelete, setOrderToDelete] = useState<any>(null);

	const isModalOpenRef = useRef(false);
	isModalOpenRef.current = isModalOpen || isDeleteModalOpen;

	useEffect(() => { setCurrentPage(1); }, [searchQuery, activeStatus, activeProduct, deadlineFilter]);

	const notifyHeader = () => window.dispatchEvent(new Event('orders-updated'));

	const fetchProducts = async () => {
		try {
			const res = await api.get('products/');
			setAllProducts(res.data);
		} catch (err) {
			console.error("Ошибка загрузки продукции:", err);
		}
	};

	const fetchOrdersSilently = async () => {
		try {
			const res = await api.get('orders/?is_archived=false');
			const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
			// Сохраняем свежие данные в кэш браузера и в стейт
			localStorage.setItem('cached_orders', JSON.stringify(data));
			setOrders(data);
		} catch (err) {
			console.error("Ошибка при загрузке заказов:", err);
		}
	};

	const loadOrders = async () => {
		// 🔥 МАГИЯ КЭША: Если в браузере уже есть сохраненные заказы, моментально показываем их
		const cached = localStorage.getItem('cached_orders');
		if (cached) {
			setOrders(JSON.parse(cached));
			setIsLoading(false); // Выключаем лоадер МОМЕНТАЛЬНО (бабах!)
		} else {
			setIsLoading(true);
		}

		// В любом случае запускаем тихое скачивание свежих данных
		await fetchOrdersSilently();
		setIsLoading(false);

		// Запускаем чистку архива В ФОНЕ (без await), она отработает незаметно
		api.post('orders/trigger_auto_archive/')
			.then(() => fetchOrdersSilently())
			.catch(err => {
				console.error("Ошибка авто-архивации на сервере:", err);
			});
	};

	useEffect(() => {
		loadOrders();
		fetchProducts();
	}, []);

	const handleToggleItemStatus = async (item: any, orderId: number) => {
		const previousOrders = [...orders];
		const nextStatusMap: Record<string, string> = { 'not-ready': 'in-progress', 'in-progress': 'ready', 'ready': 'not-ready' };
		const newStatus = nextStatusMap[item.status];
		if (!newStatus) return;

		setOrders(prev => prev.map(o => {
			if (o.id === orderId) {
				const updatedItems = o.items.map((i: any) => i.id === item.id ? { ...i, status: newStatus } : i);
				const allReady = updatedItems.every((i: any) => i.status === 'ready');
				const allNotReady = updatedItems.every((i: any) => i.status === 'not-ready');

				let newOrderStatus = 'in-progress';
				if (allReady) newOrderStatus = 'ready';
				else if (allNotReady) newOrderStatus = 'not-ready';

				return { ...o, items: updatedItems, status: newOrderStatus };
			}
			return o;
		}));

		try {
			await api.patch(`items/${item.id}/`, { status: newStatus });
			notifyHeader();
		} catch (e) {
			setOrders(previousOrders);
			toast.error('Ошибка сохранения. Данные возвращены назад.');
		}
	};

	const handleToggleReceived = async (order: any) => {
		const previousOrders = [...orders];
		const newVal = !order.is_received;

		setOrders(prev => prev.map(o => o.id === order.id ? { ...o, is_received: newVal } : o));

		try {
			await api.patch(`orders/${order.id}/`, { is_received: newVal });
			toast.success(newVal ? 'Заказ выдан!' : 'Отметка о выдаче снята');
			notifyHeader();
		} catch (e) {
			setOrders(previousOrders);
			toast.error('Ошибка сети. Действие отменено.');
		}
	};

	const handleSaveOrder = async (orderData: any) => {
		const saveToast = toast.loading('Сохранение...');

		// 1. ОПТИМИСТИКА: Мгновенно закрываем модальное окно, не ждем сервер!
		setIsModalOpen(false);

		const fakeId = Date.now();
		const isCreating = !editingOrder;

		// 2. ОПТИМИСТИКА: Сразу рисуем заказ в таблице, чтобы пользователь видел результат моментально
		if (isCreating) {
			const fakeOrder = {
				id: fakeId,
				client: orderData.client,
				client_phone: orderData.client_phone,
				status: 'in-progress',
				is_received: false,
				created_at: new Date().toISOString(),
				items: (orderData.items_write || []).map((i: any, idx: number) => ({
					id: fakeId + idx,
					name: i.name || 'Ожидание...',
					quantity: i.quantity || 1,
					deadline: i.deadline,
					status: i.status || 'not-ready',
					comment: i.comment || '',
					responsible_user: { first_name: 'Сохранение...' }
				}))
			};
			setOrders(prev => [fakeOrder, ...prev]);
		}

		try {
			let savedOrder: any;
			if (editingOrder) {
				const res = await api.put(`orders/${editingOrder.id}/`, orderData);
				savedOrder = res.data;
				// Обновляем реальными данными
				setOrders(prev => prev.map(o => o.id === savedOrder.id ? savedOrder : o));
			} else {
				const res = await api.post('orders/', orderData);
				savedOrder = res.data;
				// Меняем наш фейковый ID на настоящий из Базы Данных
				setOrders(prev => prev.map(o => o.id === fakeId ? savedOrder : o));
			}

			toast.success('Успешно!', { id: saveToast });
			notifyHeader();
		} catch (e) {
			toast.error('Ошибка сети. Действие отменено.', { id: saveToast });
			if (isCreating) {
				setOrders(prev => prev.filter(o => o.id !== fakeId)); // Убираем фейк при ошибке
			}
			fetchOrdersSilently(); // Синхронизируем базу
		}
	};

	const handleArchiveOrder = async (orderId: number) => {
		// ОПТИМИСТИЧНЫЙ UI: Сначала моментально прячем заказ с экрана
		const previousOrders = [...orders];
		setOrders(prev => prev.filter(o => o.id !== orderId));
		toast.success('Заказ отправлен в архив');

		try {
			// Отправляем запрос в фоне
			await api.post(`orders/${orderId}/archive/`);
			notifyHeader();
		} catch (e) {
			// Если произошла ошибка сети, возвращаем карточку обратно
			setOrders(previousOrders);
			toast.error('Ошибка сети. Заказ возвращен.');
		}
	};

	const confirmDelete = async () => {
		if (!orderToDelete) return;

		// ОПТИМИСТИЧНЫЙ UI: Сначала закрываем окно и моментально удаляем карточку
		const previousOrders = [...orders];
		const targetId = orderToDelete.id;

		setOrders(prev => prev.filter(o => o.id !== targetId));
		setIsDeleteModalOpen(false);
		toast.success('Удалено');

		try {
			// Асинхронно удаляем на сервере
			await api.delete(`orders/${targetId}/`);
			notifyHeader();
		} catch (e) {
			setOrders(previousOrders);
			toast.error('Ошибка при удалении');
		}
	};

	const getDeadlineStyles = (dateStr: string) => {
		if (!dateStr) return 'text-slate-400';
		const today = new Date(); today.setHours(0, 0, 0, 0);
		const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
		const deadline = new Date(dateStr); deadline.setHours(0, 0, 0, 0);

		if (deadline < today) return 'text-rose-600 font-black';
		if (deadline.getTime() === today.getTime()) return 'text-red-600 font-black';
		if (deadline.getTime() === tomorrow.getTime()) return 'text-orange-600 font-black';
		return 'text-slate-600';
	};

	const dynamicProducts = useMemo(() => {
		const activeNames = new Set(
			orders.flatMap(o => o.items?.map((i: any) => i.name?.toLowerCase().trim()) || [])
		);
		return allProducts.filter(p => activeNames.has(p.name.toLowerCase().trim()));
	}, [orders, allProducts]);

	const filteredOrders = useMemo(() => {
		const todayStr = getLocalDateStr(0);
		const tomorrowStr = getLocalDateStr(1);

		let result = orders.filter(order => {
			const searchLower = searchQuery.toLowerCase();
			const matchesSearch = order.client.toLowerCase().includes(searchLower) ||
				order.id.toString().includes(searchLower) ||
				(Array.isArray(order.items) && order.items.some((item: any) => item.name.toLowerCase().includes(searchLower)));

			const matchesStatus = !activeStatus || order.status === activeStatus;

			const matchesProduct = !activeProduct ||
				(Array.isArray(order.items) && order.items.some((item: any) => item.name.toLowerCase().includes(activeProduct.toLowerCase())));

			let matchesDeadline = true;
			if (deadlineFilter === 'today') {
				matchesDeadline = Array.isArray(order.items) && order.items.some((item: any) => item.deadline === todayStr && item.status !== 'ready');
			} else if (deadlineFilter === 'tomorrow') {
				matchesDeadline = Array.isArray(order.items) && order.items.some((item: any) => item.deadline === tomorrowStr && item.status !== 'ready');
			} else if (deadlineFilter === 'overdue') {
				matchesDeadline = Array.isArray(order.items) && order.items.some((item: any) => item.deadline && item.deadline < todayStr && item.status !== 'ready');
			}

			return matchesSearch && matchesStatus && matchesProduct && matchesDeadline;
		});

		const sortTodayStr = getLocalDateStr(0);
		const isOverdue = (order: any) =>
			order.status !== 'ready' &&
			Array.isArray(order.items) &&
			order.items.some((i: any) => i.status !== 'ready' && i.deadline && i.deadline < sortTodayStr);

		result.sort((a, b) => {
			// Оставляем просроченные заказы наверху, чтобы о них не забыли
			const overdueA = isOverdue(a) ? 0 : 1;
			const overdueB = isOverdue(b) ? 0 : 1;
			if (overdueA !== overdueB) return overdueA - overdueB;

			// Дальше просто сортируем по дате создания (чем новее, тем выше), 
			// БЕЗ прыжков по статусу, как и просил клиент.
			return b.id - a.id;
		});

		return result;
	}, [orders, searchQuery, activeStatus, activeProduct, deadlineFilter]);

	const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
	const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

	return (
		<div className="space-y-6">

			<Card className="flex flex-col gap-5 shadow-sm border-slate-200/60 p-5 sm:p-6">
				<div className="flex justify-between items-center mb-1">
					<h2 className="text-lg sm:text-xl font-black text-slate-800 flex items-center gap-2">
						<Filter size={20} className="text-slate-800" strokeWidth={2.5} /> Фильтры и поиск
					</h2>
					<Button onClick={() => { setEditingOrder(null); setIsModalOpen(true); }} icon={<Plus size={18} strokeWidth={3} />} className="shrink-0 shadow-md hover:shadow-lg transition-all text-sm py-2 sm:px-5">
						Новый заказ
					</Button>
				</div>

				<div className="flex flex-col xl:flex-row gap-3">
					<div className="relative flex-1">
						<Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} strokeWidth={2.5} />
						<Input className="pl-11 rounded-full bg-white border-slate-200 h-[44px]" placeholder="Поиск по клиенту, номеру или товару..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
					</div>

					<div className="flex items-center gap-2 overflow-x-auto pb-1 xl:pb-0 hide-scrollbar shrink-0">

						{deadlineFilter === 'overdue' && (
							<div className="px-4 h-[44px] rounded-full text-sm font-black flex items-center gap-2 border bg-rose-100 text-rose-700 border-rose-300 shadow-sm">
								<AlertCircle size={16} /> Просрочено
							</div>
						)}
						{deadlineFilter === 'today' && (
							<div className="px-4 h-[44px] rounded-full text-sm font-black flex items-center gap-2 border bg-red-50 text-red-600 border-red-200 shadow-sm">
								<Calendar size={16} /> На сегодня
							</div>
						)}
						{deadlineFilter === 'tomorrow' && (
							<div className="px-4 h-[44px] rounded-full text-sm font-black flex items-center gap-2 border bg-amber-50 text-amber-600 border-amber-200 shadow-sm">
								<Clock size={16} /> На завтра
							</div>
						)}

						<button onClick={() => setActiveStatus(activeStatus === 'ready' ? null : 'ready')} className={`px-4 h-[44px] rounded-full text-sm font-bold flex items-center gap-2 border transition-all ${activeStatus === 'ready' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>
							<CheckCircle2 size={16} className="text-slate-400" /> Готовые
						</button>
						<button onClick={() => setActiveStatus(activeStatus === 'in-progress' ? null : 'in-progress')} className={`px-4 h-[44px] rounded-full text-sm font-bold flex items-center gap-2 border transition-all ${activeStatus === 'in-progress' ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>
							<Loader2 size={16} className="text-slate-400" /> В процессе
						</button>
						<button onClick={() => setActiveStatus(activeStatus === 'not-ready' ? null : 'not-ready')} className={`px-4 h-[44px] rounded-full text-sm font-bold flex items-center gap-2 border transition-all ${activeStatus === 'not-ready' ? 'bg-slate-200 text-slate-800 border-slate-300 shadow-inner' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>
							<Clock size={16} className="text-slate-400" /> Не готовые
						</button>

						{(activeStatus || searchQuery || activeProduct || deadlineFilter) && (
							<button onClick={() => {
								setActiveStatus(null);
								setSearchQuery('');
								setActiveProduct(null);
								if (deadlineFilter) setSearchParams({});
							}} className="w-11 h-[44px] rounded-full border border-slate-300 border-dashed flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 shrink-0 transition-colors" title="Сбросить все фильтры">
								<X size={16} strokeWidth={2.5} />
							</button>
						)}
					</div>
				</div>

				<div className="flex items-center gap-4 pt-2">
					<div className="flex items-center gap-2 text-sm font-black text-slate-500 shrink-0">
						<PackageOpen size={18} strokeWidth={2.5} /> В работе:
					</div>
					<div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar flex-1">
						{dynamicProducts.length === 0 ? (
							<span className="text-xs text-slate-400 font-bold">Спискок товаров пуст</span>
						) : (
							dynamicProducts.map((p) => (
								<button
									key={p.id}
									onClick={() => setActiveProduct(activeProduct === p.name ? null : p.name)}
									className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-bold whitespace-nowrap transition-colors border ${activeProduct === p.name
										? 'bg-primary text-white border-primary shadow-sm'
										: 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
										}`}
								>
									<i className={`${p.icon || 'fas fa-tag'} ${activeProduct === p.name ? 'text-white/80' : 'text-slate-400'}`}></i> {p.name}
								</button>
							))
						)}
					</div>
				</div>
			</Card>

			<Card noPadding className="overflow-hidden border-slate-200/60 shadow-sm flex flex-col">
				<div className="overflow-x-auto custom-scrollbar flex-1 pb-2">
					<table className="w-full text-left border-collapse min-w-[1100px]">
						<thead>
							<tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs uppercase font-black tracking-wider">
								<th className="px-6 py-5 w-20">№</th>
								<th className="px-6 py-5 w-48">Клиент</th>
								<th className="px-6 py-5 min-w-[450px]">Товары (Интерактивные)</th>
								<th className="px-6 py-5 w-40 text-center">Статус и Выдача</th>
								<th className="px-6 py-5 w-32 text-center">Действия</th>
							</tr>
						</thead>
						<tbody className="divide-y-4 divide-slate-50/50">
							{isLoading ? (
								<tr><td colSpan={5} className="py-20 text-center"><Loader2 className="mx-auto animate-spin text-primary" size={32} /></td></tr>
							) : (!Array.isArray(paginatedOrders) || paginatedOrders.length === 0) ? (
								<tr><td colSpan={5} className="py-20 text-center">
									<PackageOpen className="mx-auto text-slate-200" size={48} />
									<p className="text-slate-400 font-medium mt-4">Ничего не найдено</p>
								</td></tr>
							) : (
								paginatedOrders.map((order, orderIndex) => {
									// Проверяем, есть ли просроченные товары в заказе
									const isOrderOverdue = Array.isArray(order.items) && order.items.some((i: any) => i.status !== 'ready' && i.deadline && i.deadline < getLocalDateStr(0));

									return (
										<tr key={order.id} className="bg-white hover:bg-slate-50/30 group">
											<td className="px-6 py-6 align-top">
												<div className="font-black text-slate-800 text-lg">#{((currentPage - 1) * itemsPerPage) + orderIndex + 1}</div>
												<div className="text-[11px] font-bold text-slate-400 mt-1">ID:{order.id}</div>
											</td>

											<td className="px-6 py-6 align-top">
												<div
													onClick={() => {
														navigator.clipboard.writeText(order.client);
														toast.success('Имя клиента скопировано!');
													}}
													className="font-bold text-slate-800 cursor-pointer hover:text-primary flex items-center gap-1.5 group/client"
													title="Нажмите, чтобы скопировать"
												>
													{order.client} <Copy size={12} className="opacity-0 group-hover/client:opacity-100" />
												</div>
												<div className="text-xs font-bold text-slate-500 mt-1.5">
													{order.client_phone ? (
														<div
															onClick={() => {
																navigator.clipboard.writeText(order.client_phone);
																toast.success('Номер телефона скопирован!');
															}}
															className="cursor-pointer hover:text-primary hover:underline flex items-center gap-1.5 w-max group/phone"
															title="Нажмите, чтобы скопировать"
														>
															<Phone size={12} /> {order.client_phone} <Copy size={10} className="opacity-0 group-hover/phone:opacity-100" />
														</div>
													) : '—'}
												</div>
											</td>

											<td className="px-6 py-6 align-top">
												<div className="flex flex-col gap-3.5">
													{Array.isArray(order.items) && order.items.map((item: any, idx: number) => {
														let currentCardStyle = CARD_STYLES[item.status] || CARD_STYLES['not-ready'];
														let currentBadgeStyle = BADGE_STYLES[item.status] || BADGE_STYLES['not-ready'];
														const currentBadgeLabel = BADGE_LABELS[item.status] || 'Неизвестно';

														// Красный цвет только если реально просрочено
														if (item.status !== 'ready' && item.deadline) {
															const todayStr = getLocalDateStr(0);
															if (item.deadline < todayStr) {
																currentCardStyle = 'bg-rose-100 border-rose-400 text-rose-950 shadow-md ring-2 ring-rose-400';
																currentBadgeStyle = 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm';
															} else if (item.deadline === todayStr) {
																currentCardStyle = 'bg-red-50/80 border-red-300 text-red-950 shadow-sm ring-1 ring-red-200';
															}
														}

														return (
															<div key={item.id} className={`flex flex-col gap-2.5 p-4 rounded-2xl border transition-colors ${currentCardStyle}`}>
																<div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
																	<div className="flex items-center gap-3.5">
																		<div className="w-6 h-6 rounded-full bg-white border border-slate-200 text-primary flex items-center justify-center text-xs font-black shrink-0 shadow-inner">{idx + 1}</div>
																		<div className="font-black text-sm tracking-tight">{item.name} <span className="text-slate-500 font-medium ml-1">x{item.quantity}</span></div>

																		<div className="flex flex-col text-xs sm:text-[13px] font-black ml-1 sm:ml-4 border-l-2 border-slate-200/50 pl-4 space-y-1">
																			<div className="flex items-center gap-2 text-slate-500"><PlayCircle size={14} className="text-slate-400" /> {order.created_at ? new Date(order.created_at).toLocaleDateString('ru-RU') : '—'}</div>
																			<div className={`flex items-center gap-2 ${getDeadlineStyles(item.deadline)}`}><Flag size={14} /> {item.deadline ? new Date(item.deadline).toLocaleDateString('ru-RU') : '—'}</div>
																		</div>

																		<div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-slate-700 ml-4 bg-white/70 px-2.5 py-1.5 rounded-lg border border-slate-100/80 shadow-inner">
																			<User size={14} className="text-slate-400" />
																			{item.responsible_user ? `${item.responsible_user.first_name || item.responsible_user.username}` : 'Не назначен'}
																		</div>
																	</div>

																	<button onClick={() => handleToggleItemStatus(item, order.id)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider active:scale-95 cursor-pointer shrink-0 transition-colors ${currentBadgeStyle}`} title="Изменить статус">
																		{currentBadgeLabel}
																	</button>
																</div>
																{item.comment && (
																	<div className="flex items-start gap-2 text-slate-600 text-xs font-medium pl-10 mt-0.5">
																		<MessageSquare size={14} className="mt-0.5 shrink-0 text-slate-400" />
																		<span className="max-w-md leading-relaxed">{item.comment}</span>
																	</div>
																)}
															</div>
														);
													})}
												</div>
											</td>

											<td className="px-6 py-6 align-top text-center flex flex-col items-center gap-3">
												{/* Общий статус заказа с учетом просрочки */}
												{order.status === 'ready' ? (
													<span className="px-4 py-2 rounded-full text-xs font-black bg-emerald-100 text-emerald-700 uppercase shadow-sm">Готово</span>
												) : isOrderOverdue ? (
													<span className="px-4 py-2 rounded-full text-xs font-black bg-rose-100 text-rose-700 uppercase shadow-sm animate-pulse">Просрочено</span>
												) : order.status === 'in-progress' ? (
													<span className="px-4 py-2 rounded-full text-xs font-black bg-orange-100 text-orange-600 uppercase shadow-sm">В процессе</span>
												) : (
													<span className="px-4 py-2 rounded-full text-xs font-black bg-slate-200 text-slate-700 uppercase shadow-sm">Не готов</span>
												)}

												{order.status === 'ready' && canIssueOrders && (
													<button 
														onClick={() => handleToggleReceived(order)} 
														className={`w-full max-w-[150px] flex items-center justify-center py-2.5 px-3 rounded-full text-[11px] font-black uppercase tracking-wider transition-all shadow-sm ${
															order.is_received 
															? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
															: 'bg-rose-100 text-rose-600 hover:bg-rose-200'
														}`}
													>
														{order.is_received ? 'Клиент получил' : 'Готова к выдачу'}
													</button>
												)}
											</td>

											<td className="px-6 py-6 align-top">
												<div className="flex justify-center gap-2">
													<button onClick={() => { setEditingOrder(order); setIsModalOpen(true); }} className="w-10 h-10 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary transition-colors" title="Редактировать"><Edit2 size={16} /></button>
													<button onClick={() => handleArchiveOrder(order.id)} className="w-10 h-10 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-400 hover:text-purple-500 hover:border-purple-500 transition-colors" title="В архив"><Archive size={16} /></button>
													<button onClick={() => { setOrderToDelete(order); setIsDeleteModalOpen(true); }} className="w-10 h-10 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-500 transition-colors" title="Удалить"><Trash2 size={16} /></button>
												</div>
											</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>

				{totalPages > 1 && (
					<div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
						<p className="text-sm font-bold text-slate-500">Показаны {((currentPage - 1) * itemsPerPage) + 1} – {Math.min(currentPage * itemsPerPage, filteredOrders.length)} из {filteredOrders.length}</p>
						<div className="flex items-center gap-2">
							<button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-50 hover:bg-slate-100"><ChevronLeft size={18} /></button>
							<div className="flex gap-1">
								{Array.from({ length: totalPages }).map((_, i) => (
									<button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-9 h-9 rounded-xl text-sm font-black ${currentPage === i + 1 ? 'bg-primary text-white shadow-md shadow-primary/30' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>{i + 1}</button>
								))}
							</div>
							<button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-50 hover:bg-slate-100"><ChevronRight size={18} /></button>
						</div>
					</div>
				)}
			</Card>

			{isModalOpen && <OrderModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveOrder} initialData={editingOrder} />}
			<ConfirmDeleteModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={confirmDelete} title="Удаление заказа" itemName={`Заказ #${orderToDelete?.id}`} />
		</div>
	);
}