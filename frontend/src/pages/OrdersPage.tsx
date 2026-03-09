import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
	Plus, Filter, Search, Edit2, Archive, Loader2, PackageOpen,
	CheckCircle2, Clock, X, Package, PlayCircle, Flag, User,
	MessageSquare, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Form';
import OrderModal from '../modals/OrderModal';
import ConfirmDeleteModal from '../modals/ConfirmDeleteModal'; // Добавили модалку удаления

export default function OrdersPage() {
	const [orders, setOrders] = useState<any[]>([]);
	const [products, setProducts] = useState<any[]>([]);

	// Состояния для фильтров
	const [searchQuery, setSearchQuery] = useState('');
	const [activeStatus, setActiveStatus] = useState<string | null>(null);
	const [activeProduct, setActiveProduct] = useState<string | null>(null);

	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingOrder, setEditingOrder] = useState<any>(null);
	const [isLoading, setIsLoading] = useState(true);

	// Для удаления
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [orderToDelete, setOrderToDelete] = useState<any>(null);

	const navigate = useNavigate();

	const loadOrders = async () => {
		setIsLoading(true);
		const token = localStorage.getItem('token');
		try {
			const res = await fetch('http://127.0.0.1:8000/api/orders/', {
				headers: { 'Authorization': `Bearer ${token}` }
			});
			if (res.ok) setOrders(await res.json());
			else if (res.status === 401) {
				localStorage.removeItem('token');
				navigate('/login');
			}
		} catch (err) {
			console.error("Ошибка загрузки заказов:", err);
		} finally {
			setIsLoading(false);
		}
	};

	const loadProducts = async () => {
		const token = localStorage.getItem('token');
		try {
			const res = await fetch('http://127.0.0.1:8000/api/products/', {
				headers: { 'Authorization': `Bearer ${token}` }
			});
			if (res.ok) setProducts(await res.json());
		} catch (err) {
			console.error("Ошибка загрузки продукции:", err);
		}
	};

	useEffect(() => {
		loadOrders();
		loadProducts();
	}, []);

	const handleOpenModal = (order = null) => {
		setEditingOrder(order);
		setIsModalOpen(true);
	};

	const handleSaveOrder = async (orderData: any) => {
		const url = editingOrder ? `http://127.0.0.1:8000/api/orders/${editingOrder.id}/` : 'http://127.0.0.1:8000/api/orders/';
		const method = editingOrder ? 'PUT' : 'POST';
		const token = localStorage.getItem('token');
		const saveToast = toast.loading('Сохранение заказа...');

		try {
			const res = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
				body: JSON.stringify(orderData)
			});
			if (res.ok) {
				toast.success('Заказ успешно сохранен!', { id: saveToast });
				setIsModalOpen(false);
				loadOrders();
			} else {
				toast.error('Ошибка при сохранении', { id: saveToast });
			}
		} catch (e) {
			toast.error('Ошибка сети', { id: saveToast });
		}
	};

	const handleDeleteClick = (order: any) => {
		setOrderToDelete(order);
		setIsDeleteModalOpen(true);
	};

	const confirmDelete = async () => {
		if (!orderToDelete) return;
		const token = localStorage.getItem('token');
		try {
			await fetch(`http://127.0.0.1:8000/api/orders/${orderToDelete.id}/`, {
				method: 'DELETE',
				headers: { 'Authorization': `Bearer ${token}` }
			});
			toast.success('Заказ удален');
			setIsDeleteModalOpen(false);
			loadOrders();
		} catch (e) {
			toast.error('Ошибка при удалении');
		}
	};

	// Фильтрация
	const filteredOrders = orders.filter(order => {
		const searchLower = searchQuery.toLowerCase();
		const matchesSearch =
			order.client.toLowerCase().includes(searchLower) ||
			order.id.toString().includes(searchLower) ||
			(Array.isArray(order.items) && order.items.some((item: any) => item.name.toLowerCase().includes(searchLower)));
		const matchesStatus = !activeStatus || order.status === activeStatus;
		const matchesProduct = !activeProduct ||
			(Array.isArray(order.items) && order.items.some((item: any) => item.name.toLowerCase().includes(activeProduct.toLowerCase())));
		return matchesSearch && matchesStatus && matchesProduct;
	});

	// Главный статус заказа (в отдельной колонке)
	const MainStatusBadge = ({ status }: { status: string }) => {
		if (status === 'ready') return <span className="px-4 py-2 rounded-full text-xs font-black bg-emerald-100 text-emerald-700 uppercase tracking-widest border border-emerald-200">Готово</span>;
		if (status === 'in-progress') return <span className="px-4 py-2 rounded-full text-xs font-black bg-orange-100 text-orange-600 uppercase tracking-widest border border-orange-200">В процессе</span>;
		return <span className="px-4 py-2 rounded-full text-xs font-black bg-purple-100 text-purple-600 uppercase tracking-widest border border-purple-200">Не готов</span>;
	};

	// Статус отдельного товара (внутри карточки)
	const ItemStatusBadge = ({ status }: { status: string }) => {
		if (status === 'ready') return <span className="px-3 py-1.5 rounded-lg text-[10px] font-black bg-emerald-500 text-white uppercase tracking-wider shadow-sm">Готово</span>;
		if (status === 'in-progress') return <span className="px-3 py-1.5 rounded-lg text-[10px] font-black bg-orange-500 text-white uppercase tracking-wider shadow-sm">В процессе</span>;
		return <span className="px-3 py-1.5 rounded-lg text-[10px] font-black bg-slate-400 text-white uppercase tracking-wider shadow-sm">Не готов</span>;
	};

	// Вспомогательная функция форматирования даты (для вида 02.03.2026)
	const formatDate = (dateStr: string) => {
		if (!dateStr) return '—';
		const d = new Date(dateStr);
		return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
	};

	return (
		<div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">

			{/* Шапка страницы */}
			<div>
				<h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">Заказы в работе</h1>
				<p className="text-sm font-bold text-slate-400 mt-1">Управление текущими задачами производства</p>
			</div>

			{/* Панель фильтров */}
			<Card className="flex flex-col gap-4 shadow-sm border-slate-200/60">
				<div className="flex justify-between items-center">
					<h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
						<Filter size={20} strokeWidth={2.5} className="text-slate-600" /> Фильтры и поиск
					</h2>
					<Button onClick={() => handleOpenModal()} icon={<Plus size={18} strokeWidth={3} />} className="shadow-eco-md">
						Новый заказ
					</Button>
				</div>

				<div className="flex flex-col xl:flex-row gap-3">
					<div className="relative flex-1">
						<Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} strokeWidth={2.5} />
						<Input className="pl-11 rounded-2xl bg-white border-slate-200" placeholder="Поиск по клиенту, номеру или товару..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
					</div>

					<div className="flex items-center gap-2 overflow-x-auto pb-1 xl:pb-0 hide-scrollbar shrink-0">
						<button onClick={() => setActiveStatus(activeStatus === 'ready' ? null : 'ready')} className={`px-4 py-2.5 rounded-2xl text-sm font-bold flex items-center gap-2 transition-all border ${activeStatus === 'ready' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
							<CheckCircle2 size={16} className={activeStatus === 'ready' ? 'text-emerald-500' : 'text-slate-400'} /> Готовые
						</button>
						<button onClick={() => setActiveStatus(activeStatus === 'in-progress' ? null : 'in-progress')} className={`px-4 py-2.5 rounded-2xl text-sm font-bold flex items-center gap-2 transition-all border ${activeStatus === 'in-progress' ? 'bg-orange-50 text-orange-600 border-orange-200 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
							<Loader2 size={16} className={activeStatus === 'in-progress' ? 'text-orange-500 animate-spin' : 'text-slate-400'} /> В процессе
						</button>
						<button onClick={() => setActiveStatus(activeStatus === 'not-ready' ? null : 'not-ready')} className={`px-4 py-2.5 rounded-2xl text-sm font-bold flex items-center gap-2 transition-all border ${activeStatus === 'not-ready' ? 'bg-purple-50 text-purple-600 border-purple-200 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
							<Clock size={16} className={activeStatus === 'not-ready' ? 'text-purple-500' : 'text-slate-400'} /> Не готовые
						</button>

						{(activeStatus || searchQuery || activeProduct) && (
							<button onClick={() => { setActiveStatus(null); setSearchQuery(''); setActiveProduct(null); }} className="w-10 h-10 rounded-full border border-slate-300 border-dashed flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-all shrink-0 ml-1">
								<X size={16} strokeWidth={2.5} />
							</button>
						)}
					</div>
				</div>

				{products.length > 0 && (
					<div className="flex items-center gap-3 pt-4 mt-1 border-t border-slate-100 overflow-hidden">
						<div className="flex items-center gap-1.5 text-sm font-bold text-slate-400 shrink-0 uppercase tracking-wider">
							<Package size={16} /> Продукция:
						</div>
						<div className="flex flex-wrap gap-2 overflow-x-auto pb-1 hide-scrollbar">
							{products.map(p => (
								<button key={p.id} onClick={() => setActiveProduct(activeProduct === p.name ? null : p.name)} className={`px-3 py-1.5 rounded-xl text-[13px] font-bold border flex items-center gap-2 transition-all shrink-0 ${activeProduct === p.name ? 'bg-slate-800 text-white border-slate-800 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-primary/50 hover:bg-slate-50 hover:text-primary'}`}>
									<i className={`${p.icon} text-[12px] opacity-70`}></i> {p.name}
								</button>
							))}
						</div>
					</div>
				)}
			</Card>

			{/* --- НОВАЯ КРУТАЯ ТАБЛИЦА --- */}
			<Card noPadding className="overflow-hidden border-slate-200/60 shadow-sm">
				<div className="overflow-x-auto custom-scrollbar pb-6">
					<table className="w-full text-left border-collapse min-w-[1000px]">
						<thead>
							<tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs uppercase font-black tracking-wider">
								<th className="px-6 py-5 w-24">№ <span className="opacity-50">↓</span></th>
								<th className="px-6 py-5 w-48">Клиент <span className="opacity-50">↓</span></th>
								<th className="px-6 py-5">Товары (в заказе)</th>
								<th className="px-6 py-5 w-40 text-center">Статус заказа <span className="opacity-50">↓</span></th>
								<th className="px-6 py-5 w-40 text-center">Действия</th>
							</tr>
						</thead>
						<tbody className="divide-y-4 divide-slate-50">
							{isLoading ? (
								<tr><td colSpan={5} className="py-20 text-center"><Loader2 className="mx-auto animate-spin text-primary mb-2" size={32} /></td></tr>
							) : (!Array.isArray(filteredOrders) || filteredOrders.length === 0) ? (
								<tr><td colSpan={5} className="py-20 text-center"><PackageOpen className="mx-auto text-slate-200 mb-3" size={48} strokeWidth={1.5} /><p className="text-slate-500 font-bold">Ничего не найдено</p></td></tr>
							) : (
								filteredOrders.map((order, orderIndex) => (
									<tr key={order.id} className="bg-white hover:bg-slate-50/50 transition-colors group">

										{/* Колонка 1: Номер и ID */}
										<td className="px-6 py-6 align-top">
											<div className="font-black text-slate-800 text-lg">#{orderIndex + 1}</div>
											<div className="text-[11px] font-bold text-slate-400 mt-1">ID:{order.id}</div>
										</td>

										{/* Колонка 2: Клиент */}
										<td className="px-6 py-6 align-top">
											<div className="font-bold text-slate-800">{order.client}</div>
											<div className="text-xs font-bold text-slate-500 mt-1 border-b border-dashed border-slate-300 w-max cursor-pointer hover:text-slate-700">
												{order.client_phone || 'клиент'}
											</div>
										</td>

										{/* Колонка 3: Карточки товаров */}
										<td className="px-6 py-6 align-top">
											<div className="flex flex-col gap-3">
												{Array.isArray(order.items) && order.items.map((item: any, idx: number) => {
													// Логика цвета фона карточки (розовый для "в процессе", белый для "готово")
													const isReady = item.status === 'ready';
													const cardBg = isReady ? 'bg-white border-slate-200' : 'bg-rose-50 border-rose-100';

													return (
														<div key={item.id} className={`flex flex-col gap-2 p-3.5 rounded-2xl border shadow-sm transition-all hover:shadow-md ${cardBg}`}>

															<div className="flex flex-wrap items-center justify-between gap-4">
																<div className="flex items-center gap-3">
																	{/* Кружок с номером */}
																	<div className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-black shrink-0 shadow-sm">
																		{idx + 1}
																	</div>

																	{/* Название */}
																	<div className="font-black text-slate-800 text-sm">{item.name}</div>

																	{/* Количество */}
																	<div className="bg-white border border-slate-200 text-slate-600 text-[11px] font-black px-2 py-0.5 rounded shadow-sm">
																		{item.quantity} шт.
																	</div>

																	{/* Даты */}
																	<div className="flex flex-col text-[10px] text-slate-500 font-bold ml-2 sm:ml-4 border-l border-slate-200/60 pl-4">
																		<div className="flex items-center gap-1.5"><PlayCircle size={12} className="text-slate-400" /> {formatDate(item.created_at)}</div>
																		<div className="flex items-center gap-1.5 text-red-500"><Flag size={12} /> {formatDate(item.deadline)}</div>
																	</div>

																	{/* Менеджер */}
																	<div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-slate-600 ml-4">
																		<User size={14} className="text-slate-400" /> Ziyo
																	</div>
																</div>

																{/* Статус отдельного товара */}
																<ItemStatusBadge status={item.status} />
															</div>

															{/* Комментарий */}
															<div className="flex items-start gap-2 text-slate-500 text-xs font-medium pl-9 mt-1">
																<MessageSquare size={14} className="mt-0.5 shrink-0 text-slate-400" />
																<span className="max-w-md leading-relaxed">{item.comment || 'Информацию взять с вотсапа клиента'}</span>
															</div>

														</div>
													);
												})}
											</div>
										</td>

										{/* Колонка 4: Общий Статус заказа */}
										<td className="px-6 py-6 align-top text-center">
											<MainStatusBadge status={order.status} />
										</td>

										{/* Колонка 5: Действия (Круглые кнопки) */}
										<td className="px-6 py-6 align-top">
											<div className="flex justify-center gap-2">
												<button onClick={() => handleOpenModal(order)} className="w-10 h-10 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary hover:bg-primary-50 transition-all" title="Редактировать">
													<Edit2 size={16} strokeWidth={2.5} />
												</button>
												<button className="w-10 h-10 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-400 hover:text-purple-500 hover:border-purple-500 hover:bg-purple-50 transition-all" title="В архив">
													<Archive size={16} strokeWidth={2.5} />
												</button>
												<button onClick={() => handleDeleteClick(order)} className="w-10 h-10 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-500 hover:bg-red-50 transition-all" title="Удалить">
													<Trash2 size={16} strokeWidth={2.5} />
												</button>
											</div>
										</td>

									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</Card>

			{/* Модалки */}
			{isModalOpen && <OrderModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveOrder} initialData={editingOrder} />}
			<ConfirmDeleteModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={confirmDelete} title="Удаление заказа" itemName={`Заказ #${orderToDelete?.id}`} />
		</div>
	);
}