// src/pages/OrdersPage.tsx
import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
	Plus, Search, Edit2, Archive, Loader2, PackageOpen,
	X, PlayCircle, Flag, User, AlertCircle, Filter,
	MessageSquare, Trash2, ChevronLeft, ChevronRight, Copy, Phone, Calendar, Clock, CheckCircle2
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

// 🔥 ФУНКЦИЯ ДЛЯ КРАСИВОГО И ЕДИНОГО ФОРМАТА ДАТЫ (ДД.ММ.ГГГГ)
// Работает одинаково во всех странах (Германия, Таджикистан, Россия и т.д.)
const formatDateToRu = (dateStr: string) => {
	if (!dateStr) return '—';
	const d = new Date(dateStr);
	if (isNaN(d.getTime())) return '—';
	const day = String(d.getDate()).padStart(2, '0');
	const month = String(d.getMonth() + 1).padStart(2, '0');
	const year = d.getFullYear();
	return `${day}.${month}.${year}`;
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

	useEffect(() => {
		isModalOpenRef.current = isModalOpen || isDeleteModalOpen;
	}, [isModalOpen, isDeleteModalOpen]);

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

		// Мгновенное обновление по событию от глобального пуллера (Layout.tsx)
		const handleSync = () => {
			if (!isModalOpenRef.current) {
				fetchOrdersSilently();
			}
		};
		window.addEventListener('sync-updated', handleSync);

		return () => window.removeEventListener('sync-updated', handleSync);
	}, []);

	const handleToggleItemStatus = async (item: any, orderId: number) => {
		const previousOrders = [...orders];
		const nextStatusMap: Record<string, string> = { 'not-ready': 'in-progress', 'in-progress': 'ready', 'ready': 'not-ready' };
		const newStatus = nextStatusMap[item.status];
		if (!newStatus) return;

		const updateStateAndCache = (newOrdersList: any[]) => {
			setOrders(newOrdersList);
			localStorage.setItem('cached_orders', JSON.stringify(newOrdersList));
		};

		const newOrders = orders.map(o => {
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
		});

		updateStateAndCache(newOrders);

		try {
			await api.patch(`items/${item.id}/`, { status: newStatus });
			notifyHeader();
		} catch (e) {
			updateStateAndCache(previousOrders);
			toast.error('Ошибка сохранения. Данные возвращены назад.');
		}
	};

	const handleToggleReceived = async (order: any) => {
		const previousOrders = [...orders];
		const newVal = !order.is_received;

		const updateStateAndCache = (newOrdersList: any[]) => {
			setOrders(newOrdersList);
			localStorage.setItem('cached_orders', JSON.stringify(newOrdersList));
		};

		const newOrders = orders.map(o => o.id === order.id ? { ...o, is_received: newVal } : o);
		updateStateAndCache(newOrders);

		try {
			await api.patch(`orders/${order.id}/`, { is_received: newVal });
			toast.success(newVal ? 'Заказ выдан!' : 'Отметка о выдаче снята');
			notifyHeader();
		} catch (e) {
			updateStateAndCache(previousOrders);
			toast.error('Ошибка сети. Действие отменено.');
		}
	};

	const handleSaveOrder = async (orderData: any) => {
		const saveToast = toast.loading('Сохранение...');

		// 1. ОПТИМИСТИКА: Мгновенно закрываем модальное окно, не ждем сервер!
		setIsModalOpen(false);

		const fakeId = Date.now();
		const isCreating = !editingOrder;

		const updateStateAndCache = (newOrdersList: any[]) => {
			setOrders(newOrdersList);
			localStorage.setItem('cached_orders', JSON.stringify(newOrdersList));
		};

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
			updateStateAndCache([fakeOrder, ...orders]);
		}

		try {
			let savedOrder: any;
			if (editingOrder) {
				const res = await api.put(`orders/${editingOrder.id}/`, orderData);
				savedOrder = res.data;
				// Обновляем реальными данными
				updateStateAndCache(orders.map(o => o.id === savedOrder.id ? savedOrder : o));
			} else {
				const res = await api.post('orders/', orderData);
				savedOrder = res.data;
				// Меняем наш фейковый ID на настоящий из Базы Данных
				// В orders может быть fakeId, нам нужно его заменить
				setOrders(prev => {
					const updated = prev.map(o => o.id === fakeId ? savedOrder : o);
					localStorage.setItem('cached_orders', JSON.stringify(updated));
					return updated;
				});
			}

			toast.success('Успешно!', { id: saveToast });
			notifyHeader();
		} catch (e) {
			toast.error('Ошибка сети. Действие отменено.', { id: saveToast });
			if (isCreating) {
				setOrders(prev => {
					const updated = prev.filter(o => o.id !== fakeId);
					localStorage.setItem('cached_orders', JSON.stringify(updated));
					return updated;
				});
			}
			fetchOrdersSilently(); // Синхронизируем базу
		}
	};

	const handleArchiveOrder = async (orderId: number) => {
		// ОПТИМИСТИЧНЫЙ UI: Сначала моментально прячем заказ с экрана
		const previousOrders = [...orders];
		const updated = orders.filter(o => o.id !== orderId);
		setOrders(updated);
		localStorage.setItem('cached_orders', JSON.stringify(updated));
		toast.success('Заказ отправлен в архив');

		try {
			// Отправляем запрос в фоне
			await api.post(`orders/${orderId}/archive/`);
			notifyHeader();
		} catch (e) {
			// Если произошла ошибка сети, возвращаем карточку обратно
			setOrders(previousOrders);
			localStorage.setItem('cached_orders', JSON.stringify(previousOrders));
			toast.error('Ошибка сети. Заказ возвращен.');
		}
	};

	const confirmDelete = async () => {
		if (!orderToDelete) return;

		// ОПТИМИСТИЧНЫЙ UI: Сначала закрываем окно и моментально удаляем карточку
		const previousOrders = [...orders];
		const targetId = orderToDelete.id;

		const updated = orders.filter(o => o.id !== targetId);
		setOrders(updated);
		localStorage.setItem('cached_orders', JSON.stringify(updated));
		setIsDeleteModalOpen(false);
		toast.success('Удалено');

		try {
			// Асинхронно удаляем на сервере
			await api.delete(`orders/${targetId}/`);
			notifyHeader();
		} catch (e) {
			setOrders(previousOrders);
			localStorage.setItem('cached_orders', JSON.stringify(previousOrders));
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

		const getMinDeadline = (order: any) => {
			if (!Array.isArray(order.items) || order.items.length === 0) return '9999-12-31';

			// Сначала ищем дедлайны среди НЕ готовых товаров
			const activeDeadlines = order.items
				.filter((i: any) => i.status !== 'ready' && i.deadline)
				.map((i: any) => i.deadline);

			if (activeDeadlines.length > 0) {
				return activeDeadlines.sort()[0];
			}

			// Если активных нет, берем дедлайны готовых
			const allDeadlines = order.items.map((i: any) => i.deadline).filter(Boolean);
			if (allDeadlines.length > 0) {
				return allDeadlines.sort()[0];
			}

			return '9999-12-31';
		};

		result.sort((a, b) => {
			const deadlineA = getMinDeadline(a);
			const deadlineB = getMinDeadline(b);

			// Сортировка по дедлайну (самые близкие / просроченные первыми)
			if (deadlineA !== deadlineB) {
				return deadlineA.localeCompare(deadlineB);
			}

			// При равном дедлайне, сортируем по id (новые выше)
			return b.id - a.id;
		});

		return result;
	}, [orders, searchQuery, activeStatus, activeProduct, deadlineFilter]);

	const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
	const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

	return (
		<div className="space-y-6">

			<Card className="flex flex-col gap-3 shadow-sm border-slate-200/60 p-4">
				{/* ── Заголовок + кнопка в одну строку ── */}
				<div className="flex justify-between items-center gap-3">
					<h2 className="text-base font-black text-slate-800 flex items-center gap-2 shrink-0">
						<Filter size={18} className="text-slate-800" strokeWidth={2.5} /> Фильтры
					</h2>
					<Button onClick={() => { setEditingOrder(null); setIsModalOpen(true); }} icon={<Plus size={16} strokeWidth={3} />} className="shrink-0 shadow-md text-sm py-2 px-4">
						Новый заказ
					</Button>
				</div>

				{/* ── Поиск ── */}
				<div className="relative">
					<Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} strokeWidth={2.5} />
					<Input className="pl-10 rounded-full bg-white border-slate-200 h-[38px] text-sm" placeholder="Поиск по клиенту, номеру или товару..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
				</div>

				{/* ── Все фильтры в одну горизонтальную полосу ── */}
				<div className="flex items-center gap-2 overflow-x-auto pb-0.5 hide-scrollbar">
					{deadlineFilter === 'overdue' && <div className="px-3 h-[34px] rounded-full text-xs font-black flex items-center gap-1.5 border bg-rose-100 text-rose-700 border-rose-300 shrink-0"><AlertCircle size={13} /> Просрочено</div>}
					{deadlineFilter === 'today' && <div className="px-3 h-[34px] rounded-full text-xs font-black flex items-center gap-1.5 border bg-red-50 text-red-600 border-red-200 shrink-0"><Calendar size={13} /> Сегодня</div>}
					{deadlineFilter === 'tomorrow' && <div className="px-3 h-[34px] rounded-full text-xs font-black flex items-center gap-1.5 border bg-amber-50 text-amber-600 border-amber-200 shrink-0"><Clock size={13} /> Завтра</div>}

					<button onClick={() => setActiveStatus(activeStatus === 'ready' ? null : 'ready')} className={`px-3 h-[34px] rounded-full text-xs font-bold flex items-center gap-1.5 border transition-all shrink-0 ${activeStatus === 'ready' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
						<CheckCircle2 size={13} /> Готовые
					</button>
					<button onClick={() => setActiveStatus(activeStatus === 'in-progress' ? null : 'in-progress')} className={`px-3 h-[34px] rounded-full text-xs font-bold flex items-center gap-1.5 border transition-all shrink-0 ${activeStatus === 'in-progress' ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
						<Loader2 size={13} /> В процессе
					</button>
					<button onClick={() => setActiveStatus(activeStatus === 'not-ready' ? null : 'not-ready')} className={`px-3 h-[34px] rounded-full text-xs font-bold flex items-center gap-1.5 border transition-all shrink-0 ${activeStatus === 'not-ready' ? 'bg-slate-200 text-slate-800 border-slate-300' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
						<Clock size={13} /> Не готовые
					</button>

					{dynamicProducts.length > 0 && <div className="w-px h-5 bg-slate-200 shrink-0 mx-1" />}

					{dynamicProducts.map((p) => (
						<button
							key={p.id}
							onClick={() => setActiveProduct(activeProduct === p.name ? null : p.name)}
							className={`flex items-center gap-1.5 px-3 h-[34px] rounded-full text-xs font-bold whitespace-nowrap transition-colors border shrink-0 ${activeProduct === p.name ? 'bg-primary text-white border-primary' : 'bg-white text-slate-600 border-slate-200'}`}
						>
							<i className={`${p.icon || 'fas fa-tag'} ${activeProduct === p.name ? 'text-white/90' : 'text-primary'} text-[11px]`}></i> {p.name}
						</button>
					))}

					{(activeStatus || searchQuery || activeProduct || deadlineFilter) && (
						<button onClick={() => { setActiveStatus(null); setSearchQuery(''); setActiveProduct(null); if (deadlineFilter) setSearchParams({}); }} className="w-[34px] h-[34px] rounded-full border border-slate-300 border-dashed flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 shrink-0 transition-colors ml-auto" title="Сбросить">
							<X size={14} strokeWidth={2.5} />
						</button>
					)}
				</div>
			</Card>



			{/* ═══════════════════════════════════════════════════════
			    📱 МОБИЛЬНЫЕ КАРТОЧКИ — видны только на < lg
			    ═══════════════════════════════════════════════════════ */}
			<div className="lg:hidden space-y-3">
				{isLoading ? (
					<div className="py-20 flex justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>
				) : (!Array.isArray(paginatedOrders) || paginatedOrders.length === 0) ? (
					<div className="py-20 flex flex-col items-center">
						<PackageOpen className="text-slate-200" size={48} />
						<p className="text-slate-400 font-medium mt-4">Ничего не найдено</p>
					</div>
				) : (
					paginatedOrders.map((order, orderIndex) => {
						const isOrderOverdue = Array.isArray(order.items) && order.items.some((i: any) => i.status !== 'ready' && i.deadline && i.deadline < getLocalDateStr(0));
						const orderNum = ((currentPage - 1) * itemsPerPage) + orderIndex + 1;

						return (
							<div
								key={order.id}
								className={`rounded-2xl border-2 shadow-sm overflow-hidden ${order.status === 'ready'
									? 'border-emerald-200 bg-emerald-50/40'
									: isOrderOverdue
										? 'border-rose-400 bg-rose-50/40 ring-2 ring-rose-300/40'
										: order.status === 'in-progress'
											? 'border-orange-200 bg-orange-50/20'
											: 'border-slate-200 bg-white'
									}`}
							>
								{/* ── Шапка карточки ── */}
								<div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
									<div className="flex items-center gap-3 min-w-0">
										{/* Номер-аватар */}
										<div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-sm ${order.status === 'ready' ? 'bg-emerald-500 text-white' :
											isOrderOverdue ? 'bg-rose-500 text-white animate-pulse' :
												order.status === 'in-progress' ? 'bg-orange-500 text-white' :
													'bg-slate-200 text-slate-700'
											}`}>
											#{orderNum}
										</div>
										<div className="min-w-0">
											<div
												onClick={() => { navigator.clipboard.writeText(order.client); toast.success('Имя клиента скопировано!'); }}
												className="font-black text-slate-900 text-base leading-tight truncate cursor-pointer active:opacity-60"
											>
												{order.client}
											</div>
											{order.client_phone ? (
												<div
													onClick={() => { navigator.clipboard.writeText(order.client_phone); toast.success('Телефон скопирован!'); }}
													className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mt-0.5 cursor-pointer active:opacity-60"
												>
													<Phone size={11} /> {order.client_phone}
												</div>
											) : (
												<div className="text-xs text-slate-400 mt-0.5">ID:{order.id}</div>
											)}
										</div>
									</div>

									{/* Правый блок: бейдж + кнопки */}
									<div className="flex flex-col items-end gap-2 shrink-0">
										{order.status === 'ready' ? (
											<span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-700 uppercase">Готово</span>
										) : isOrderOverdue ? (
											<span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-100 text-rose-700 uppercase animate-pulse">Просрочено</span>
										) : order.status === 'in-progress' ? (
											<span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-orange-100 text-orange-600 uppercase">В процессе</span>
										) : (
											<span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-slate-200 text-slate-600 uppercase">Не готов</span>
										)}
										<div className="flex items-center gap-1.5">
											<button onClick={() => { setEditingOrder(order); setIsModalOpen(true); }} className="w-9 h-9 rounded-xl border-2 border-slate-200 bg-white flex items-center justify-center text-slate-500 active:bg-slate-100" title="Редактировать"><Edit2 size={15} /></button>
											<button onClick={() => handleArchiveOrder(order.id)} className="w-9 h-9 rounded-xl border-2 border-slate-200 bg-white flex items-center justify-center text-slate-500 active:bg-purple-50" title="В архив"><Archive size={15} /></button>
											<button onClick={() => { setOrderToDelete(order); setIsDeleteModalOpen(true); }} className="w-9 h-9 rounded-xl border-2 border-slate-200 bg-white flex items-center justify-center text-slate-500 active:bg-red-50 active:border-red-300 active:text-red-500" title="Удалить"><Trash2 size={15} /></button>
										</div>
									</div>
								</div>

								{/* ── Список товаров ── */}
								<div className="px-4 pb-3 space-y-2">
									{Array.isArray(order.items) && order.items.map((item: any, idx: number) => {
										let mCardStyle = CARD_STYLES[item.status] || CARD_STYLES['not-ready'];
										let mBadgeStyle = BADGE_STYLES[item.status] || BADGE_STYLES['not-ready'];
										const mBadgeLabel = BADGE_LABELS[item.status] || 'Статус';

										if (item.status !== 'ready' && item.deadline) {
											const todayStr = getLocalDateStr(0);
											if (item.deadline < todayStr) {
												mCardStyle = 'bg-rose-100 border-rose-400 text-rose-950 shadow-md ring-2 ring-rose-400';
												mBadgeStyle = 'bg-rose-600 text-white';
											} else if (item.deadline === todayStr) {
												mCardStyle = 'bg-red-50/80 border-red-300 text-red-950 shadow-sm ring-1 ring-red-200';
											}
										}

										return (
											<div key={item.id} className={`rounded-xl border-2 p-3 ${mCardStyle}`}>
												{/* Название + количество */}
												<div className="flex items-center gap-2 mb-2">
													<div className="w-5 h-5 rounded-full bg-white border border-slate-200 text-primary flex items-center justify-center text-[10px] font-black shrink-0 shadow-inner">{idx + 1}</div>
													<div className="font-black text-sm leading-tight flex-1">{item.name} <span className="font-medium text-slate-500 text-xs">×{item.quantity} шт</span></div>
												</div>
												{/* Даты + ответственный */}
												<div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold mb-2.5 pl-7">
													<div className="flex items-center gap-1 text-slate-500">
														<PlayCircle size={11} className="text-slate-400" />
														{formatDateToRu(order.created_at)}
													</div>
													<div className={`flex items-center gap-1 ${getDeadlineStyles(item.deadline)}`}>
														<Flag size={11} />
														{formatDateToRu(item.deadline)}
													</div>
													{item.responsible_user && (
														<div className="flex items-center gap-1 text-slate-500">
															<User size={11} className="text-slate-400" />
															{item.responsible_user.first_name || item.responsible_user.username}
														</div>
													)}
												</div>
												{/* Комментарий */}
												{item.comment && (
													<div className="flex items-start gap-1.5 text-xs font-medium text-slate-600 pl-7 mb-2.5">
														<MessageSquare size={11} className="mt-0.5 shrink-0 text-slate-400" />
														<span>{item.comment}</span>
													</div>
												)}
												{/* Большая кнопка статуса — удобна для пальца */}
												<button
													onClick={() => handleToggleItemStatus(item, order.id)}
													className={`w-full py-2.5 rounded-lg text-xs font-black uppercase tracking-wider active:scale-95 transition-transform ${mBadgeStyle}`}
												>
													{mBadgeLabel}
												</button>
											</div>
										);
									})}
								</div>

								{/* ── Кнопка выдачи (менеджерам, только когда готово) ── */}
								{canIssueOrders && order.status === 'ready' && (
									<div className="px-4 pb-4">
										<button
											onClick={() => handleToggleReceived(order)}
											className={`w-full py-3 rounded-xl text-sm font-black active:scale-95 transition-transform ${order.is_received
												? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-200'
												: 'bg-rose-100 text-rose-700 border-2 border-rose-200'
												}`}
										>
											{order.is_received ? '✓ Клиент получил' : '📦 Выдать клиенту'}
										</button>
									</div>
								)}
							</div>
						);
					})
				)}

				{/* Мобильная пагинация */}
				{totalPages > 1 && (
					<div className="flex items-center justify-between pt-2 pb-4 px-1">
						<button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-slate-200 bg-white text-slate-600 font-bold disabled:opacity-40 active:bg-slate-100 text-sm">
							<ChevronLeft size={16} /> Назад
						</button>
						<span className="text-sm font-black text-slate-600">{currentPage} / {totalPages}</span>
						<button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-slate-200 bg-white text-slate-600 font-bold disabled:opacity-40 active:bg-slate-100 text-sm">
							Вперёд <ChevronRight size={16} />
						</button>
					</div>
				)}
			</div>

			{/* ═══════════════════════════════════════════════════════
			    🖥️ ТАБЛИЦА — видна только на lg+
			    ═══════════════════════════════════════════════════════ */}
			<Card noPadding className="hidden lg:flex overflow-hidden border-slate-200/60 shadow-sm flex-col">
				<div className="overflow-x-auto custom-scrollbar flex-1 pb-2">
					<table className="w-full text-left border-collapse min-w-[950px]">
						<thead>
							<tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs uppercase font-black tracking-wider">
								<th className="px-4 py-5 w-16">№</th>
								<th className="px-4 py-5 w-32">Клиент</th>
								<th className="px-4 py-5 w-full min-w-[400px]">Товары (Интерактивные)</th>
								<th className="px-4 py-5 w-36 text-center">Статус и Выдача</th>
								<th className="px-4 py-5 w-32 text-center">Действия</th>
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
											<td className="px-4 py-6 align-top">
												<div className="font-black text-slate-800 text-lg">#{((currentPage - 1) * itemsPerPage) + orderIndex + 1}</div>
												<div className="text-[11px] font-bold text-slate-400 mt-1">ID:{order.id}</div>
											</td>

											<td className="px-4 py-6 align-top">
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
																<div className="flex items-center justify-between gap-4">
																	<div className="flex items-center gap-3.5">
																		<div className="w-6 h-6 rounded-full bg-white border border-slate-200 text-primary flex items-center justify-center text-xs font-black shrink-0 shadow-inner">{idx + 1}</div>
																		<div className="font-black text-sm tracking-tight">{item.name} <span className="text-slate-500 font-medium ml-1">×{item.quantity} шт</span></div>

																		<div className="flex flex-col text-xs sm:text-[13px] font-black ml-1 sm:ml-4 border-l-2 border-slate-200/50 pl-4 space-y-1">
																			<div className="flex items-center gap-2 text-slate-500"><PlayCircle size={14} className="text-slate-400" /> {formatDateToRu(order.created_at)}</div>
																			<div className={`flex items-center gap-2 ${getDeadlineStyles(item.deadline)}`}><Flag size={14} /> {formatDateToRu(item.deadline)}</div>
																		</div>

																		<div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-slate-700 ml-4 bg-white/70 px-2.5 py-1.5 rounded-lg border border-slate-100/80 shadow-inner">
																			<User size={14} className="text-slate-400" />
																			{item.responsible_user ? `${item.responsible_user.first_name || item.responsible_user.username}` : 'Не назначен'}
																		</div>
																	</div>

																	<button onClick={() => handleToggleItemStatus(item, order.id)} className={`w-[100px] py-1.5 rounded-lg text-[10px] flex items-center justify-center text-center font-black uppercase tracking-wider active:scale-95 cursor-pointer shrink-0 transition-colors ${currentBadgeStyle}`} title="Изменить статус">
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

											<td className="px-4 py-4 align-middle text-center">
												<div className="flex flex-col items-center justify-center gap-1.5 min-h-[64px] relative">
													{/* Общий статус заказа с учетом просрочки */}
													{order.status === 'ready' ? (
														<span className="w-[100px] inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 uppercase whitespace-nowrap shadow-sm">Готово</span>
													) : isOrderOverdue ? (
														<span className="w-[100px] inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 uppercase animate-pulse whitespace-nowrap shadow-sm">Просрочено</span>
													) : order.status === 'in-progress' ? (
														<span className="w-[100px] inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] font-bold bg-orange-100 text-orange-600 uppercase whitespace-nowrap shadow-sm">В процессе</span>
													) : (
														<span className="w-[100px] inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] font-bold bg-slate-200 text-slate-700 uppercase whitespace-nowrap shadow-sm">Не готов</span>
													)}

													{canIssueOrders && (
														<button
															onClick={() => order.status === 'ready' && handleToggleReceived(order)}
															className={`whitespace-nowrap w-[130px] px-2 py-1.5 rounded-full text-[11px] font-bold transition-all shadow-sm ${order.status === 'ready'
																? (order.is_received
																	? 'bg-emerald-100/50 text-emerald-800 hover:bg-emerald-200 border border-emerald-200/50'
																	: 'bg-rose-200/50 text-rose-700 hover:bg-rose-200 border border-rose-300/30')
																: 'opacity-0 pointer-events-none cursor-default select-none'
																}`}
															tabIndex={order.status === 'ready' ? 0 : -1}
															aria-hidden={order.status !== 'ready'}
														>
															{order.is_received ? 'Клиент получил' : 'Готова к выдачу'}
														</button>
													)}
												</div>
											</td>

											<td className="px-4 py-6 align-top">
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