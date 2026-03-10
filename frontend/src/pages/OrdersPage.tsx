// src/pages/OrdersPage.tsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
	Plus, Search, Edit2, Archive, Loader2, PackageOpen,
	X, PlayCircle, Flag, User,
	MessageSquare, Trash2, CheckSquare, Square, ChevronLeft, ChevronRight, Copy, Phone
} from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Form';
import OrderModal from '../modals/OrderModal';
import ConfirmDeleteModal from '../modals/ConfirmDeleteModal';

export default function OrdersPage() {
	const [orders, setOrders] = useState<any[]>([]);

	// Фильтры
	const [searchQuery, setSearchQuery] = useState('');
	const [activeStatus, setActiveStatus] = useState<string | null>(null);
	const [activeProduct, setActiveProduct] = useState<string | null>(null);

	// Пагинация
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 30;

	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingOrder, setEditingOrder] = useState<any>(null);
	const [isLoading, setIsLoading] = useState(true);

	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [orderToDelete, setOrderToDelete] = useState<any>(null);

	const navigate = useNavigate();
	const isModalOpenRef = useRef(false);
	isModalOpenRef.current = isModalOpen || isDeleteModalOpen;

	useEffect(() => { setCurrentPage(1); }, [searchQuery, activeStatus, activeProduct]);

	// === 1. ЗАГРУЗКА И АВТООБНОВЛЕНИЕ ===
	const fetchOrdersSilently = async () => {
		const token = localStorage.getItem('token');
		if (!token) return;
		try {
			const res = await fetch('http://127.0.0.1:8000/api/orders/?is_archived=false', { headers: { 'Authorization': `Bearer ${token}` } });
			if (res.ok) setOrders(await res.json());
		} catch (err) { }
	};

	const loadOrders = async () => {
		setIsLoading(true);
		const token = localStorage.getItem('token');
		if (!token) { navigate('/login'); return; }
		await fetchOrdersSilently();
		setIsLoading(false);
	};

	// === 2. ДЕЙСТВИЯ ===
	const handleToggleItemStatus = async (item: any, orderId: number) => {
		const nextStatusMap: Record<string, string> = { 'not-ready': 'in-progress', 'in-progress': 'ready', 'ready': 'not-ready' };
		const newStatus = nextStatusMap[item.status];

		setOrders(prev => prev.map(o => o.id === orderId ? { ...o, items: o.items.map((i: any) => i.id === item.id ? { ...i, status: newStatus } : i) } : o));
		try {
			const token = localStorage.getItem('token');
			await fetch(`http://127.0.0.1:8000/api/items/${item.id}/`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
				body: JSON.stringify({ status: newStatus })
			});
			fetchOrdersSilently();
		} catch (e) { toast.error('Ошибка изменения статуса'); loadOrders(); }
	};

	const handleToggleReceived = async (order: any) => {
		const newVal = !order.is_received;
		setOrders(prev => prev.map(o => o.id === order.id ? { ...o, is_received: newVal } : o));
		try {
			const token = localStorage.getItem('token');
			await fetch(`http://127.0.0.1:8000/api/orders/${order.id}/`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
				body: JSON.stringify({ is_received: newVal })
			});
			toast.success(newVal ? 'Заказ выдан!' : 'Отметка о выдаче снята');
		} catch (e) { toast.error('Ошибка сети'); loadOrders(); }
	};

	const handleSaveOrder = async (orderData: any) => {
		const url = editingOrder ? `http://127.0.0.1:8000/api/orders/${editingOrder.id}/` : 'http://127.0.0.1:8000/api/orders/';
		const method = editingOrder ? 'PUT' : 'POST';
		const token = localStorage.getItem('token');
		const saveToast = toast.loading('Сохранение...');
		try {
			const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(orderData) });
			if (res.ok) { toast.success('Успешно!', { id: saveToast }); setIsModalOpen(false); loadOrders(); }
			else { toast.error('Ошибка сохранения', { id: saveToast }); }
		} catch (e) { toast.error('Ошибка сети', { id: saveToast }); }
	};

	const handleArchiveOrder = async (orderId: number) => {
		const token = localStorage.getItem('token');
		try { await fetch(`http://127.0.0.1:8000/api/orders/${orderId}/archive/`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } }); toast.success('В архиве'); loadOrders(); } catch (e) { }
	};

	const confirmDelete = async () => {
		if (!orderToDelete) return;
		const token = localStorage.getItem('token');
		try { await fetch(`http://127.0.0.1:8000/api/orders/${orderToDelete.id}/`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }); toast.success('Удалено'); setIsDeleteModalOpen(false); loadOrders(); } catch (e) { }
	};

	// === ФИЛЬТРЫ И УТИЛИТЫ ===
	const getDeadlineStyles = (dateStr: string) => {
		if (!dateStr) return 'text-slate-400';
		const today = new Date(); today.setHours(0, 0, 0, 0);
		const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
		const deadline = new Date(dateStr); deadline.setHours(0, 0, 0, 0);

		if (deadline < today) return 'text-red-700 font-black animate-pulse';
		if (deadline.getTime() === today.getTime()) return 'text-red-600 font-black';
		if (deadline.getTime() === tomorrow.getTime()) return 'text-orange-600 font-black';
		return 'text-slate-600';
	};

	// ФОРМАТИРОВАНИЕ ДАТЫ СОЗДАНИЯ (ИСПРАВЛЕНИЕ INVALID DATE)
	const formatCreationDate = (dateStr: string) => {
		if (!dateStr) return '—';
		return new Date(dateStr).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
	};

	// КОПИРОВАНИЕ ИМЕНИ В БУФЕР
	const copyToClipboard = (text: string) => {
		navigator.clipboard.writeText(text);
		toast.success('Имя клиента скопировано!');
	};

	const filteredOrders = orders.filter(order => {
		const searchLower = searchQuery.toLowerCase();
		const matchesSearch = order.client.toLowerCase().includes(searchLower) || order.id.toString().includes(searchLower) || (Array.isArray(order.items) && order.items.some((item: any) => item.name.toLowerCase().includes(searchLower)));
		const matchesStatus = !activeStatus || order.status === activeStatus;
		const matchesProduct = !activeProduct || (Array.isArray(order.items) && order.items.some((item: any) => item.name.toLowerCase().includes(activeProduct.toLowerCase())));
		return matchesSearch && matchesStatus && matchesProduct;
	});

	const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
	const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

	return (
		<div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
			<div className="flex justify-between items-end gap-4">
				<div>
					<h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">Заказы в работе</h1>
					<p className="text-sm font-bold text-slate-400 mt-1">Автообновление включено • Изменяй статусы товаров в 1 клик</p>
				</div>
				<Button onClick={() => { setEditingOrder(null); setIsModalOpen(true); }} icon={<Plus size={18} strokeWidth={3} />} className="shrink-0">Новый заказ</Button>
			</div>

			<Card className="flex flex-col gap-4 shadow-sm border-slate-200/60">
				<div className="flex flex-col xl:flex-row gap-3">
					<div className="relative flex-1">
						<Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} strokeWidth={2.5} />
						<Input className="pl-11 rounded-2xl bg-white border-slate-200" placeholder="Поиск по клиенту, номеру или товару..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
					</div>
					<div className="flex items-center gap-2 overflow-x-auto pb-1 xl:pb-0 hide-scrollbar shrink-0">
						<button onClick={() => setActiveStatus(activeStatus === 'ready' ? null : 'ready')} className={`px-4 py-2.5 rounded-2xl text-sm font-bold flex items-center gap-2 transition-all border ${activeStatus === 'ready' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>Готовые</button>
						<button onClick={() => setActiveStatus(activeStatus === 'in-progress' ? null : 'in-progress')} className={`px-4 py-2.5 rounded-2xl text-sm font-bold flex items-center gap-2 transition-all border ${activeStatus === 'in-progress' ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>В процессе</button>
						<button onClick={() => setActiveStatus(activeStatus === 'not-ready' ? null : 'not-ready')} className={`px-4 py-2.5 rounded-2xl text-sm font-bold flex items-center gap-2 transition-all border ${activeStatus === 'not-ready' ? 'bg-purple-50 text-purple-600 border-purple-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>Не готовые</button>
						{(activeStatus || searchQuery || activeProduct) && (
							<button onClick={() => { setActiveStatus(null); setSearchQuery(''); setActiveProduct(null); }} className="w-10 h-10 rounded-full border border-slate-300 border-dashed flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 shrink-0"><X size={16} strokeWidth={2.5} /></button>
						)}
					</div>
				</div>
			</Card>

			<Card noPadding className="overflow-hidden border-slate-200/60 shadow-sm flex flex-col">
				<div className="overflow-x-auto custom-scrollbar flex-1 pb-2">
					<table className="w-full text-left border-collapse min-w-[1100px]">
						<thead>
							<tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs uppercase font-black tracking-wider">
								{/* ИЗМЕНИЛИ ШИРИНУ КОЛОНОК */}
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
								<tr><td colSpan={5} className="py-20 text-center"><PackageOpen className="mx-auto text-slate-200" size={48} /></td></tr>
							) : (
								paginatedOrders.map((order, orderIndex) => (
									<tr key={order.id} className="bg-white hover:bg-slate-50/30 transition-colors group">
										<td className="px-6 py-6 align-top">
											<div className="font-black text-slate-800 text-lg">#{((currentPage - 1) * itemsPerPage) + orderIndex + 1}</div>
											<div className="text-[11px] font-bold text-slate-400 mt-1">ID:{order.id}</div>
										</td>

										{/* ИНТЕРАКТИВНЫЙ КЛИЕНТ (КОПИРОВАНИЕ И ЗВОНОК) */}
										<td className="px-6 py-6 align-top">
											<div
												onClick={() => copyToClipboard(order.client)}
												className="font-bold text-slate-800 cursor-pointer hover:text-primary transition-colors flex items-center gap-1.5 group/client"
												title="Нажмите, чтобы скопировать"
											>
												{order.client} <Copy size={12} className="opacity-0 group-hover/client:opacity-100 transition-opacity" />
											</div>
											<div className="text-xs font-bold text-slate-500 mt-1.5">
												{order.client_phone ? (
													<a href={`tel:${order.client_phone}`} className="hover:text-primary hover:underline transition-colors flex items-center gap-1.5 w-max">
														<Phone size={12} /> {order.client_phone}
													</a>
												) : '—'}
											</div>
										</td>

										<td className="px-6 py-6 align-top">
											<div className="flex flex-col gap-3.5">
												{Array.isArray(order.items) && order.items.map((item: any, idx: number) => {
													const cardStylesMap: Record<string, string> = {
														'ready': 'bg-emerald-50/50 border-emerald-100 text-emerald-950',
														'in-progress': 'bg-orange-50/50 border-orange-100 text-orange-950',
														'not-ready': 'bg-slate-100/70 border-slate-200 text-slate-900'
													};
													const currentCardStyle = cardStylesMap[item.status];
													const badgeStyles: Record<string, string> = {
														'ready': 'bg-emerald-500 text-white hover:bg-emerald-600',
														'in-progress': 'bg-orange-500 text-white hover:bg-orange-600',
														'not-ready': 'bg-slate-300 text-slate-700 hover:bg-slate-400'
													};
													const badgeLabels: Record<string, string> = { 'ready': 'Готово', 'in-progress': 'В процессе', 'not-ready': 'Не готов' };

													return (
														<div key={item.id} className={`flex flex-col gap-2.5 p-4 rounded-2xl border transition-all duration-300 ${currentCardStyle}`}>
															<div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
																<div className="flex items-center gap-3.5">
																	<div className="w-6 h-6 rounded-full bg-white border border-slate-200 text-primary flex items-center justify-center text-xs font-black shrink-0 shadow-inner">{idx + 1}</div>
																	<div className="font-black text-sm tracking-tight">{item.name} <span className="text-slate-500 font-medium ml-1">x{item.quantity}</span></div>

																	<div className="flex flex-col text-[10px] font-bold ml-1 sm:ml-2 border-l border-slate-200 pl-3.5 space-y-0.5">
																		{/* ИСПРАВЛЕННАЯ ДАТА СОЗДАНИЯ (Берем из самого заказа) */}
																		<div className="flex items-center gap-1.5 text-slate-500"><PlayCircle size={12} /> {formatCreationDate(order.created_at)}</div>
																		<div className={`flex items-center gap-1.5 ${getDeadlineStyles(item.deadline)}`}><Flag size={12} /> {item.deadline ? new Date(item.deadline).toLocaleDateString() : '—'}</div>
																	</div>

																	<div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-slate-700 ml-4 bg-white/70 px-2.5 py-1.5 rounded-lg border border-slate-100/80 shadow-inner">
																		<User size={14} className="text-slate-400" />
																		{item.responsible_user ? `${item.responsible_user.first_name || item.responsible_user.username}` : 'Не назначен'}
																	</div>
																</div>

																<button onClick={() => handleToggleItemStatus(item, order.id)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm transition-all active:scale-95 cursor-pointer shrink-0 ${badgeStyles[item.status]}`} title="Изменить статус">
																	{badgeLabels[item.status]}
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
											{order.status === 'ready' ? <span className="px-4 py-2 rounded-full text-xs font-black bg-emerald-100 text-emerald-700 uppercase">Готово</span> :
												order.status === 'in-progress' ? <span className="px-4 py-2 rounded-full text-xs font-black bg-orange-100 text-orange-600 uppercase">В процессе</span> :
													<span className="px-4 py-2 rounded-full text-xs font-black bg-purple-100 text-purple-600 uppercase">Не готов</span>}

											<button onClick={() => handleToggleReceived(order)} className={`w-full max-w-[140px] flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all border ${order.is_received ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'}`}>
												{order.is_received ? <><CheckSquare size={14} /> Выдан</> : <><Square size={14} /> В офисе</>}
											</button>
										</td>

										<td className="px-6 py-6 align-top">
											<div className="flex justify-center gap-2">
												<button onClick={() => { setEditingOrder(order); setIsModalOpen(true); }} className="w-10 h-10 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary transition-all"><Edit2 size={16} /></button>
												<button onClick={() => handleArchiveOrder(order.id)} className="w-10 h-10 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-400 hover:text-purple-500 hover:border-purple-500 transition-all"><Archive size={16} /></button>
												<button onClick={() => { setOrderToDelete(order); setIsDeleteModalOpen(true); }} className="w-10 h-10 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-500 transition-all"><Trash2 size={16} /></button>
											</div>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>

				{totalPages > 1 && (
					<div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
						<p className="text-sm font-bold text-slate-500">Показаны {((currentPage - 1) * itemsPerPage) + 1} – {Math.min(currentPage * itemsPerPage, filteredOrders.length)} из {filteredOrders.length}</p>
						<div className="flex items-center gap-2">
							<button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-50 hover:bg-slate-100 transition-all"><ChevronLeft size={18} /></button>
							<div className="flex gap-1">
								{Array.from({ length: totalPages }).map((_, i) => (
									<button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-9 h-9 rounded-xl text-sm font-black transition-all ${currentPage === i + 1 ? 'bg-primary text-white shadow-md shadow-primary/30' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>{i + 1}</button>
								))}
							</div>
							<button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-50 hover:bg-slate-100 transition-all"><ChevronRight size={18} /></button>
						</div>
					</div>
				)}
			</Card>

			{isModalOpen && <OrderModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveOrder} initialData={editingOrder} />}
			<ConfirmDeleteModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={confirmDelete} title="Удаление заказа" itemName={`Заказ #${orderToDelete?.id}`} />
		</div>
	);
}