// src/pages/OrdersPage.tsx — точ-в-точ дизайн EcoPrint_old, сохранена фича "Готов к выдаче"
/* eslint-disable @typescript-eslint/no-explicit-any, prefer-const */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/api';
import OrderModal from '../modals/OrderModal';
import ConfirmDeleteModal from '../modals/ConfirmDeleteModal';
import { playIfEnabled } from '../utils/sound';
import { showNotification, isPopupEnabled } from '../utils/notification';

const STATUS_TEXT: Record<string, string> = {
	'ready': 'Готов',
	'in-progress': 'В процессе',
	'not-ready': 'Не готов',
};

const getLocalDateStr = (offsetDays = 0) => {
	const d = new Date();
	d.setDate(d.getDate() + offsetDays);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatDateRu = (s?: string) => {
	if (!s) return '—';
	const d = new Date(s);
	if (isNaN(d.getTime())) return '—';
	return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
};

const getDaysUntilDeadline = (deadline?: string) => {
	if (!deadline) return 9999;
	const d = new Date(deadline); d.setHours(0, 0, 0, 0);
	const today = new Date(); today.setHours(0, 0, 0, 0);
	return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

type SortField = 'id' | 'client' | 'status' | 'default';
type SortDir = 'asc' | 'desc';

export default function OrdersPage() {
	const userStr = localStorage.getItem('user');
	const user = userStr && userStr !== 'undefined' ? JSON.parse(userStr) : null;
	const userRole = user?.role || 'worker';
	const isSuperuser = userRole === 'superadmin';
	const canIssueOrders = userRole === 'manager' || userRole === 'superadmin' || userRole === 'admin';
	const CACHE_KEY = `cached_orders_${user?.id || 'guest'}`;

	const [orders, setOrders] = useState<any[]>([]);
	const [allProducts, setAllProducts] = useState<any[]>([]);
	const [searchParams, setSearchParams] = useSearchParams();
	const deadlineFilter = searchParams.get('deadline');

	const [searchQuery, setSearchQuery] = useState('');
	const [activeStatuses, setActiveStatuses] = useState<Set<string>>(new Set());
	const [activeProducts, setActiveProducts] = useState<Set<string>>(new Set());
	const [sort, setSort] = useState<{ field: SortField; dir: SortDir }>({ field: 'default', dir: 'asc' });

	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingOrder, setEditingOrder] = useState<any>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [orderToDelete, setOrderToDelete] = useState<any>(null);

	const pendingItemIds = useRef<Set<number>>(new Set());
	const fetchOrdersSilentlyRef = useRef<() => Promise<void>>(() => Promise.resolve());
	const isModalOpenRef = useRef(false);

	useEffect(() => { isModalOpenRef.current = isModalOpen || isDeleteModalOpen; }, [isModalOpen, isDeleteModalOpen]);

	// Track which urgent items already shown (avoid spam)
	const notifiedUrgentRef = useRef<Set<string>>(new Set());

	// Проверка дедлайнов: показываем legacy-уведомление о товарах со сроком сегодня/завтра/просрочено.
	// Запускается каждые 5 минут + при каждом обновлении списка заказов.
	useEffect(() => {
		const checkUrgent = () => {
			if (!isPopupEnabled()) return;
			if (!Array.isArray(orders) || orders.length === 0) return;

			const todayStr = getLocalDateStr(0);
			const tomorrowStr = getLocalDateStr(1);

			const overdue: string[] = [];
			const dueToday: string[] = [];
			const dueTomorrow: string[] = [];

			orders.forEach(o => {
				if (o.is_archived) return;
				(o.items || []).forEach((i: any) => {
					if (i.status === 'ready' || !i.deadline) return;
					const key = `${i.deadline < todayStr ? 'overdue' : i.deadline}-${o.id}-${i.id}`;
					if (notifiedUrgentRef.current.has(key)) return;

					if (i.deadline < todayStr) {
						overdue.push(`№${o.id} (${o.client}) — "${i.name}"`);
						notifiedUrgentRef.current.add(key);
					} else if (i.deadline === todayStr) {
						dueToday.push(`№${o.id} (${o.client}) — "${i.name}"`);
						notifiedUrgentRef.current.add(key);
					} else if (i.deadline === tomorrowStr) {
						dueTomorrow.push(`№${o.id} (${o.client}) — "${i.name}"`);
						notifiedUrgentRef.current.add(key);
					}
				});
			});

			if (overdue.length > 0) {
				showNotification('Просроченные заказы!', overdue.join('\n'), 'error');
				playIfEnabled();
			} else if (dueToday.length > 0) {
				showNotification('Внимание! Срок сдачи сегодня', dueToday.join('\n'), 'warning');
				playIfEnabled();
			} else if (dueTomorrow.length > 0) {
				showNotification('Завтра срок сдачи', dueTomorrow.join('\n'), 'info');
				playIfEnabled();
			}
		};

		checkUrgent();
		const interval = setInterval(checkUrgent, 5 * 60 * 1000); // каждые 5 минут
		return () => clearInterval(interval);
	}, [orders]);

	const notifyHeader = () => window.dispatchEvent(new Event('orders-updated'));

	// Уведомить все браузеры об изменении (Firebase RTDB push, < 1 сек)
	const broadcastChange = () => {
		import('../firebase').then(({ notifyAllClients }) => notifyAllClients()).catch(() => { });
	};

	const fetchProducts = async () => {
		try {
			const res = await api.get('products/');
			setAllProducts(res.data);
		} catch (err) { console.error('Ошибка загрузки продукции:', err); }
	};

	const fetchOrdersSilently = async () => {
		try {
			const res = await api.get('orders/?is_archived=false');
			const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
			if (pendingItemIds.current.size > 0) {
				setOrders(prev => {
					const pendingMap = new Map<number, string>();
					prev.forEach(o => o.items?.forEach((i: any) => {
						if (pendingItemIds.current.has(i.id)) pendingMap.set(i.id, i.status);
					}));
					const merged = data.map((o: any) => ({
						...o,
						items: o.items?.map((i: any) => pendingMap.has(i.id) ? { ...i, status: pendingMap.get(i.id) } : i),
					}));
					localStorage.setItem(CACHE_KEY, JSON.stringify(merged));
					return merged;
				});
			} else {
				localStorage.setItem(CACHE_KEY, JSON.stringify(data));
				setOrders(data);
			}
		} catch (err) { console.error('Ошибка при загрузке заказов:', err); }
	};
	fetchOrdersSilentlyRef.current = fetchOrdersSilently;

	const loadOrders = async () => {
		const cached = localStorage.getItem(CACHE_KEY);
		if (cached) { setOrders(JSON.parse(cached)); setIsLoading(false); }
		else setIsLoading(true);
		await fetchOrdersSilently();
		setIsLoading(false);
		api.post('orders/trigger_auto_archive/').catch(err => console.error('Авто-архивация:', err));
	};

	useEffect(() => {
		loadOrders();
		fetchProducts();

		const doFetch = () => { if (!isModalOpenRef.current) fetchOrdersSilentlyRef.current(); };

		let unsubscribeFb: (() => void) | null = null;
		(async () => {
			try {
				const { subscribeToSync } = await import('../firebase');
				unsubscribeFb = subscribeToSync(doFetch);
			} catch { /* ok */ }
		})();

		let timerId: ReturnType<typeof setTimeout>;
		const poll = () => { doFetch(); timerId = setTimeout(poll, 3000); };
		timerId = setTimeout(poll, 3000);

		const onVisible = () => { if (document.visibilityState === 'visible') doFetch(); };
		document.addEventListener('visibilitychange', onVisible);
		window.addEventListener('focus', onVisible);
		window.addEventListener('sync-updated', doFetch);

		return () => {
			unsubscribeFb?.();
			clearTimeout(timerId);
			document.removeEventListener('visibilitychange', onVisible);
			window.removeEventListener('focus', onVisible);
			window.removeEventListener('sync-updated', doFetch);
		};
	}, []);

	const handleToggleItemStatus = async (item: any, orderId: number) => {
		const previousOrders = [...orders];
		const nextStatus: Record<string, string> = { 'not-ready': 'in-progress', 'in-progress': 'ready', 'ready': 'not-ready' };
		const newStatus = nextStatus[item.status];
		if (!newStatus) return;

		const newOrders = orders.map(o => {
			if (o.id !== orderId) return o;
			const updatedItems = o.items.map((i: any) => i.id === item.id ? { ...i, status: newStatus } : i);
			const allReady = updatedItems.every((i: any) => i.status === 'ready');
			const allNot = updatedItems.every((i: any) => i.status === 'not-ready');
			let s = 'in-progress';
			if (allReady) s = 'ready'; else if (allNot) s = 'not-ready';
			return { ...o, items: updatedItems, status: s };
		});
		setOrders(newOrders);
		localStorage.setItem(CACHE_KEY, JSON.stringify(newOrders));
		pendingItemIds.current.add(item.id);

		// Звук уведомления (если включён в настройках)
		playIfEnabled();

		try {
			await api.patch(`items/${item.id}/`, { status: newStatus });
			pendingItemIds.current.delete(item.id);
			broadcastChange();
			fetchOrdersSilentlyRef.current();
			notifyHeader();
		} catch {
			pendingItemIds.current.delete(item.id);
			setOrders(previousOrders);
			localStorage.setItem(CACHE_KEY, JSON.stringify(previousOrders));
			toast.error('Ошибка сохранения. Данные возвращены назад.');
		}
	};

	const handleToggleReceived = async (order: any) => {
		const previousOrders = [...orders];
		const newVal = !order.is_received;
		const newOrders = orders.map(o => o.id === order.id ? { ...o, is_received: newVal } : o);
		setOrders(newOrders);
		localStorage.setItem(CACHE_KEY, JSON.stringify(newOrders));
		try {
			await api.patch(`orders/${order.id}/`, { is_received: newVal });
			toast.success(newVal ? 'Заказ выдан!' : 'Отметка о выдаче снята');
			broadcastChange();
			notifyHeader();
		} catch {
			setOrders(previousOrders);
			localStorage.setItem(CACHE_KEY, JSON.stringify(previousOrders));
			toast.error('Ошибка сети. Действие отменено.');
		}
	};

	const handleSaveOrder = async (orderData: any) => {
		const t = toast.loading('Сохранение...');
		setIsModalOpen(false);
		const fakeId = Date.now();
		const isCreating = !editingOrder;

		if (isCreating) {
			const fake = {
				id: fakeId,
				client: orderData.client,
				client_phone: orderData.client_phone,
				status: 'in-progress',
				is_received: false,
				created_at: new Date().toISOString(),
				items: (orderData.items_write || []).map((i: any, idx: number) => ({
					id: fakeId + idx, name: i.name || '...', quantity: i.quantity || 1,
					deadline: i.deadline, status: i.status || 'not-ready', comment: i.comment || '',
					responsible_user: { first_name: 'Сохранение...' },
				})),
			};
			const next = [fake, ...orders];
			setOrders(next); localStorage.setItem(CACHE_KEY, JSON.stringify(next));
		}

		try {
			let saved: any;
			if (editingOrder) {
				const res = await api.put(`orders/${editingOrder.id}/`, orderData);
				saved = res.data;
				const next = orders.map(o => o.id === saved.id ? saved : o);
				setOrders(next); localStorage.setItem(CACHE_KEY, JSON.stringify(next));
			} else {
				const res = await api.post('orders/', orderData);
				saved = res.data;
				setOrders(prev => {
					const next = prev.map(o => o.id === fakeId ? saved : o);
					localStorage.setItem(CACHE_KEY, JSON.stringify(next));
					return next;
				});
			}
			toast.success('Успешно!', { id: t });
			broadcastChange();
			notifyHeader();
		} catch {
			toast.error('Ошибка сети. Действие отменено.', { id: t });
			if (isCreating) {
				setOrders(prev => {
					const next = prev.filter(o => o.id !== fakeId);
					localStorage.setItem(CACHE_KEY, JSON.stringify(next));
					return next;
				});
			}
			fetchOrdersSilently();
		}
	};

	const handleArchiveOrder = async (orderId: number) => {
		const previous = [...orders];
		const next = orders.filter(o => o.id !== orderId);
		setOrders(next); localStorage.setItem(CACHE_KEY, JSON.stringify(next));
		toast.success('Заказ отправлен в архив');
		try { await api.post(`orders/${orderId}/archive/`); broadcastChange(); notifyHeader(); }
		catch { setOrders(previous); localStorage.setItem(CACHE_KEY, JSON.stringify(previous)); toast.error('Ошибка сети. Заказ возвращен.'); }
	};

	const confirmDelete = async () => {
		if (!orderToDelete) return;
		const previous = [...orders];
		const targetId = orderToDelete.id;
		const next = orders.filter(o => o.id !== targetId);
		setOrders(next); localStorage.setItem(CACHE_KEY, JSON.stringify(next));
		setIsDeleteModalOpen(false);
		toast.success('Удалено');
		try { await api.delete(`orders/${targetId}/`); broadcastChange(); notifyHeader(); }
		catch { setOrders(previous); localStorage.setItem(CACHE_KEY, JSON.stringify(previous)); toast.error('Ошибка при удалении'); }
	};

	// Активные продукты по факту наличия в заказах
	const dynamicProducts = useMemo(() => {
		const activeNames = new Set(orders.flatMap(o => o.items?.map((i: any) => i.name?.toLowerCase().trim()) || []));
		return allProducts.filter(p => activeNames.has(p.name.toLowerCase().trim()));
	}, [orders, allProducts]);

	// Фильтры + сортировка (по образцу app.js)
	const visibleOrders = useMemo(() => {
		const todayStr = getLocalDateStr(0);
		const tomorrowStr = getLocalDateStr(1);
		const term = searchQuery.toLowerCase();

		let res = orders.filter(o => {
			const phoneMatch = o.client_phone ? o.client_phone.toLowerCase().includes(term) : false;
			const matchSearch = !term ||
				o.client.toLowerCase().includes(term) ||
				String(o.id).includes(term) || phoneMatch ||
				(Array.isArray(o.items) && o.items.some((i: any) => i.name.toLowerCase().includes(term)));

			let matchStatus = true;
			if (activeStatuses.size > 0) matchStatus = activeStatuses.has(o.status);

			let matchProduct = true;
			if (activeProducts.size > 0) {
				matchProduct = Array.isArray(o.items) && o.items.some((i: any) =>
					Array.from(activeProducts).some(p => i.name.toLowerCase() === p.toLowerCase()));
			}

			let matchDeadline = true;
			if (deadlineFilter === 'today') matchDeadline = o.items?.some((i: any) => i.deadline === todayStr && i.status !== 'ready');
			else if (deadlineFilter === 'tomorrow') matchDeadline = o.items?.some((i: any) => i.deadline === tomorrowStr && i.status !== 'ready');
			else if (deadlineFilter === 'overdue') matchDeadline = o.items?.some((i: any) => i.deadline && i.deadline < todayStr && i.status !== 'ready');

			return matchSearch && matchStatus && matchProduct && matchDeadline;
		});

		const earliestDeadline = (o: any) => {
			if (!o.items?.length) return Number.MAX_SAFE_INTEGER;
			return Math.min(...o.items.map((i: any) => i.deadline ? new Date(i.deadline).getTime() : Number.MAX_SAFE_INTEGER));
		};

		if (sort.field !== 'default') {
			res.sort((a, b) => {
				let va: any, vb: any;
				if (sort.field === 'status') {
					const w: Record<string, number> = { 'in-progress': 1, 'not-ready': 2, 'ready': 3 };
					va = w[a.status] || 99; vb = w[b.status] || 99;
				} else if (sort.field === 'client') {
					va = a.client.toLowerCase(); vb = b.client.toLowerCase();
				} else { va = a.id; vb = b.id; }
				if (va < vb) return sort.dir === 'asc' ? -1 : 1;
				if (va > vb) return sort.dir === 'asc' ? 1 : -1;
				return 0;
			});
		} else {
			res.sort((a, b) => {
				const readyA = a.status === 'ready', readyB = b.status === 'ready';
				if (readyA && !readyB) return 1;
				if (!readyA && readyB) return -1;
				const dA = earliestDeadline(a), dB = earliestDeadline(b);
				if (dA !== dB) return dA - dB;
				const w: Record<string, number> = { 'in-progress': 1, 'not-ready': 2, 'ready': 3 };
				return (w[a.status] || 99) - (w[b.status] || 99);
			});
		}
		return res;
	}, [orders, searchQuery, activeStatuses, activeProducts, deadlineFilter, sort]);

	const toggleStatusChip = (s: string) => {
		setActiveStatuses(prev => {
			const next = new Set(prev);
			if (next.has(s)) next.delete(s); else next.add(s);
			return next;
		});
	};
	const toggleProductChip = (name: string) => {
		setActiveProducts(prev => {
			const next = new Set(prev);
			if (next.has(name)) next.delete(name); else next.add(name);
			return next;
		});
	};
	const resetFilters = () => {
		setSearchQuery('');
		setActiveStatuses(new Set());
		setActiveProducts(new Set());
		if (deadlineFilter) setSearchParams({});
	};

	const onSort = (field: SortField) => {
		setSort(prev => prev.field === field && prev.dir === 'asc' ? { field, dir: 'desc' } : { field, dir: 'asc' });
	};
	const sortIcon = (field: SortField) => {
		if (sort.field !== field) return 'fa-sort';
		return sort.dir === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
	};

	return (
		<div className="container">
			<div className="main-content">

				{/* === Карточка фильтров === */}
				<div className="filters-card">
					<div className="filters-header">
						<div className="filters-header-title">
							<i className="fas fa-filter"></i>
							<span> Фильтры и поиск</span>
						</div>
						<div className="filters-header-actions">
							<button
								className="btn btn-content"
								id="addOrderBtn"
								onClick={() => { setEditingOrder(null); setIsModalOpen(true); }}
							>
								<i className="fas fa-plus"></i> <span>Новый заказ</span>
							</button>
						</div>
					</div>

					<div className="filter-row-primary">
						<div className="search-box">
							<i className="fas fa-search"></i>
							<input
								type="text"
								id="searchInput"
								placeholder="Поиск по клиенту, номеру или товару..."
								value={searchQuery}
								onChange={e => setSearchQuery(e.target.value)}
							/>
						</div>

						<div className="status-filters-group">
							<button
								className={`filter-chip-status ${activeStatuses.has('ready') ? 'active' : ''}`}
								id="showReadyBtn"
								title="Показать готовые"
								onClick={() => toggleStatusChip('ready')}
							>
								<i className="fas fa-check-circle"></i> Готовые
							</button>
							<button
								className={`filter-chip-status ${activeStatuses.has('in-progress') ? 'active' : ''}`}
								id="showInProgressBtn"
								title="Показать в работе"
								onClick={() => toggleStatusChip('in-progress')}
							>
								<i className="fas fa-spinner"></i> В процессе
							</button>
							<button
								className={`filter-chip-status ${activeStatuses.has('not-ready') ? 'active' : ''}`}
								id="showNotReadyBtn"
								title="Показать не готовые"
								onClick={() => toggleStatusChip('not-ready')}
							>
								<i className="fas fa-clock"></i> Не готовые
							</button>
							<button
								className="filter-chip-reset"
								id="resetFiltersBtn"
								title="Сбросить все фильтры"
								onClick={resetFilters}
							>
								<i className="fas fa-times"></i>
							</button>
						</div>
					</div>

					<div className="filter-row-secondary">
						<div className="filter-label">
							<i className="fas fa-boxes"></i> Продукция:
						</div>
						<div className="product-filter-container" id="productFilterContainer">
							{dynamicProducts.length === 0 ? (
								<span style={{ color: '#9ca3af', fontSize: '0.9em', padding: '5px' }}>
									Нет активных категорий
								</span>
							) : (
								dynamicProducts.map((p: any) => (
									<div
										key={p.id}
										className={`product-chip ${activeProducts.has(p.name) ? 'active' : ''}`}
										onClick={() => toggleProductChip(p.name)}
									>
										{p.icon && <i className={p.icon}></i>} {p.name}
									</div>
								))
							)}
						</div>
					</div>
				</div>

				{/* === МОБИЛЬНЫЕ КАРТОЧКИ (скрыты на >= 992px через CSS) === */}
				<div className="mobile-orders-list">
					{visibleOrders.length === 0 && !isLoading && (
						<div className="empty-state">
							<i className="fas fa-inbox"></i>
							<h3>Нет заказов для отображения</h3>
						</div>
					)}
					{visibleOrders.map((order, idx) => {
						const sortedItems = [...(order.items || [])].sort((a: any, b: any) => a.id - b.id);
						const isOverdue = (order.items || []).some((i: any) =>
							i.status !== 'ready' && i.deadline && i.deadline < getLocalDateStr(0));

						const cardClass = order.status === 'ready'
							? 'moc-card moc-ready'
							: isOverdue ? 'moc-card moc-overdue'
								: order.status === 'in-progress' ? 'moc-card moc-progress' : 'moc-card moc-pending';

						return (
							<div key={order.id} className={cardClass}>
								<div className="moc-header">
									<div className="moc-num-circle">#{idx + 1}</div>
									<div className="moc-client-info">
										<div className="moc-client-name">{order.client}</div>
										<div className="moc-client-id">ID:{order.id}</div>
										{order.client_phone && (
											<a className="phone-link" href={`tel:${order.client_phone}`}
												onClick={(e) => { e.preventDefault(); navigator.clipboard.writeText(order.client_phone); toast.success('Телефон скопирован'); }}>
												<i className="fas fa-phone"></i> {order.client_phone}
											</a>
										)}
									</div>
									<div className="moc-header-right">
										<span className={`status-badge status-${order.status}`}>{STATUS_TEXT[order.status]}</span>
										<div className="moc-actions">
											<button className="icon-btn" title="Редактировать"
												onClick={() => { setEditingOrder(order); setIsModalOpen(true); }}>
												<i className="fas fa-edit"></i>
											</button>
											<button className="icon-btn" title="В архив"
												onClick={() => handleArchiveOrder(order.id)}>
												<i className="fas fa-archive"></i>
											</button>
											{isSuperuser && (
												<button className="icon-btn delete" title="Удалить"
													onClick={() => { setOrderToDelete(order); setIsDeleteModalOpen(true); }}>
													<i className="fas fa-trash"></i>
												</button>
											)}
										</div>
									</div>
								</div>

								<div className="moc-items">
									{sortedItems.map((item: any, i: number) => {
										const days = getDaysUntilDeadline(item.deadline);
										let urgency = '';
										if (days <= 0) urgency = 'item-very-urgent';
										else if (days === 1) urgency = 'item-urgent';
										const respUser = item.responsible_user;
										const respName = respUser
											? ((respUser.first_name || respUser.last_name)
												? `${respUser.first_name || ''} ${respUser.last_name || ''}`.trim()
												: respUser.username)
											: 'Не назначен';

										return (
											<div key={item.id} className={`moc-item ${urgency}`}>
												<div className="moc-item-num">{i + 1}</div>
												<div className="moc-item-body">
													<div className="moc-item-name-row">
														<span className="moc-item-name">{item.name}</span>
														<span className="moc-item-qty">{item.quantity} шт.</span>
													</div>
													<div className="moc-item-meta">
														<div><i className="fas fa-play-circle" style={{ color: '#9ca3af' }}></i> {formatDateRu(order.created_at)}</div>
														<div className={days <= 0 ? 'moc-deadline-overdue' : days === 1 ? 'moc-deadline-soon' : ''}>
															<i className="fas fa-flag-checkered" style={{ color: '#ef4444' }}></i> {formatDateRu(item.deadline)}
														</div>
														<div><i className="fas fa-user" style={{ color: '#6b7280' }}></i> {respName}</div>
													</div>
													{item.comment && (
														<div className="moc-item-comment">
															<i className="fas fa-comment-alt"></i>
															<span>{item.comment}</span>
														</div>
													)}
												</div>
												<button
													className={`item-status ${item.status} moc-status-btn`}
													onClick={() => handleToggleItemStatus(item, order.id)}
												>
													{STATUS_TEXT[item.status]}
												</button>
											</div>
										);
									})}
								</div>

								{canIssueOrders && (
									<button
										className={`moc-issue-btn ${order.is_received ? 'received' : ''}`}
										onClick={() => handleToggleReceived(order)}
									>
										<i className={`fas ${order.is_received ? 'fa-check-double' : 'fa-box-open'}`}></i>
										{order.is_received ? 'Клиент получил' : 'Выдать клиенту'}
									</button>
								)}
							</div>
						);
					})}
				</div>

				{/* === ТАБЛИЦА (десктоп, скрыта на <992px через CSS) === */}
				<div className="table-card desktop-only-table">
					<table id="ordersTable">
						<thead>
							<tr>
								<th style={{ width: '5%', cursor: 'pointer' }} className="sortable" onClick={() => onSort('id')}>
									№ <i className={`fas ${sortIcon('id')}`}></i>
								</th>
								<th style={{ width: '15%', cursor: 'pointer' }} className="sortable" onClick={() => onSort('client')}>
									Клиент <i className={`fas ${sortIcon('client')}`}></i>
								</th>
								<th style={{ width: '45%' }}>Товары (в заказе)</th>
								<th style={{ width: '20%', cursor: 'pointer' }} className="sortable" onClick={() => onSort('status')}>
									Статус заказа <i className={`fas ${sortIcon('status')}`}></i>
								</th>
								<th style={{ width: '15%', textAlign: 'right' }}>Действия</th>
							</tr>
						</thead>
						<tbody id="ordersTableBody">
							{visibleOrders.map((order, idx) => {
								// Порядок товаров фиксированный (по id), не меняется при смене статуса
								const sortedItems = [...(order.items || [])].sort((a: any, b: any) => a.id - b.id);

								const isRec = !!order.is_received;
								const recClass = isRec ? 'received-true' : 'received-false';
								const recIcon = isRec ? 'fa-check-double' : 'fa-hand-holding';

								return (
									<tr key={order.id}>
										<td>
											<span style={{ fontWeight: 'bold', color: '#6b7280' }}>#{idx + 1}</span>
											<div style={{ fontSize: 10, color: '#9ca3af' }}>ID:{order.id}</div>
										</td>

										<td>
											<strong
												className="copy-client"
												style={{ cursor: 'pointer', borderBottom: '1px dashed #ccc' }}
												title="Нажмите, чтобы скопировать"
												onClick={() => { navigator.clipboard.writeText(order.client); toast.success(`Клиент "${order.client}" скопирован`); }}
											>
												{order.client}
											</strong>
											{order.client_phone && (
												<div style={{ marginTop: 6 }}>
													<a
														className="phone-link"
														href={`tel:${order.client_phone}`}
														onClick={(e) => { e.preventDefault(); navigator.clipboard.writeText(order.client_phone); toast.success('Телефон скопирован'); }}
													>
														<i className="fas fa-phone"></i> {order.client_phone}
													</a>
												</div>
											)}
										</td>

										<td className="items-cell">
											<div className="items-container">
												{sortedItems.map((item: any, i: number) => {
													let urgencyClass = '';
													const days = getDaysUntilDeadline(item.deadline);
													// Цвет карточки зависит только от дедлайна, статус не влияет
													if (days <= 0) urgencyClass = 'item-very-urgent';
													else if (days === 1) urgencyClass = 'item-urgent';
													const respUser = item.responsible_user;
													const respName = respUser
														? ((respUser.first_name || respUser.last_name)
															? `${respUser.first_name || ''} ${respUser.last_name || ''}`.trim()
															: respUser.username)
														: 'Не назначен';

													return (
														<div key={item.id} className={`item-row-card ${urgencyClass}`}>
															<span className="item-number">{i + 1}</span>
															<div className="item-content-row">
																<span className="item-name">{item.name}</span>
																<span className="item-quantity">{item.quantity} шт.</span>

																<div className="item-deadline" title="Дата создания / Срок сдачи" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
																	<div><i className="fas fa-play-circle" style={{ color: '#9ca3af' }}></i> {formatDateRu(order.created_at)}</div>
																	<div><i className="fas fa-flag-checkered" style={{ color: '#ef4444' }}></i> {formatDateRu(item.deadline)}</div>
																</div>

																<div className="item-creator">
																	<i className="fas fa-user"></i>
																	<span>{respName}</span>
																</div>
															</div>

															<span
																className={`item-status ${item.status}`}
																title="Нажмите, чтобы изменить статус"
																onClick={() => handleToggleItemStatus(item, order.id)}
															>
																{STATUS_TEXT[item.status] || 'Статус'}
															</span>

															{item.comment && (
																<div className="item-comment-display">
																	<i className="fas fa-comment-alt"></i>
																	<div>{item.comment}</div>
																</div>
															)}
														</div>
													);
												})}
											</div>
										</td>

										<td style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
											<span className={`status-badge status-${order.status}`}>{STATUS_TEXT[order.status] || order.status}</span>
											{canIssueOrders && (
												<button
													className={`received-btn ${recClass}`}
													style={{ width: 'auto', minWidth: 130 }}
													title={isRec ? 'Клиент получил (нажмите чтобы отменить)' : 'Отметить как получен'}
													onClick={() => handleToggleReceived(order)}
												>
													<i className={`fas ${recIcon}`}></i>
													{isRec ? 'Получен' : 'Готов к выдаче'}
												</button>
											)}
										</td>

										<td>
											<div className="actions">
												<button className="icon-btn edit-btn" title="Редактировать" onClick={() => { setEditingOrder(order); setIsModalOpen(true); }}>
													<i className="fas fa-edit"></i>
												</button>
												<button className="icon-btn archive-btn" title="Архивировать" onClick={() => handleArchiveOrder(order.id)}>
													<i className="fas fa-archive"></i>
												</button>
												{isSuperuser && (
													<button className="icon-btn delete delete-btn" title="Удалить" onClick={() => { setOrderToDelete(order); setIsDeleteModalOpen(true); }}>
														<i className="fas fa-trash"></i>
													</button>
												)}
											</div>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>

					{!isLoading && visibleOrders.length === 0 && (
						<div className="empty-state" id="emptyState">
							<i className="fas fa-inbox"></i>
							<h3>Нет заказов для отображения</h3>
							<p>Создайте новый заказ, чтобы начать работу</p>
						</div>
					)}
					{isLoading && (
						<div className="empty-state">
							<i className="fas fa-spinner fa-spin"></i>
							<h3>Загрузка...</h3>
						</div>
					)}
				</div>
			</div>

			{isModalOpen && (
				<OrderModal
					isOpen={isModalOpen}
					onClose={() => setIsModalOpen(false)}
					onSave={handleSaveOrder}
					initialData={editingOrder}
				/>
			)}
			<ConfirmDeleteModal
				isOpen={isDeleteModalOpen}
				onClose={() => setIsDeleteModalOpen(false)}
				onConfirm={confirmDelete}
				title="Удаление заказа"
				itemName={`Заказ #${orderToDelete?.id || ''}`}
			/>
		</div>
	);
}
