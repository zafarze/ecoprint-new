import { useState, useEffect } from 'react';
import { Archive, Search, RotateCcw, Calendar, Loader2, PackageOpen, History } from 'lucide-react';
import toast from 'react-hot-toast'; // 🔥 ДОБАВИЛИ ИМПОРТ TOAST
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Form';

import api from '../api/api';

export default function ArchivePage() {
	const [archivedOrders, setArchivedOrders] = useState<any[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState('');

	const fetchArchive = async () => {
		setIsLoading(true);
		try {
			const res = await api.get('orders/?is_archived=true');
			const data = res.data;
			const ordersArray = Array.isArray(data) ? data : (data.results || []);
			setArchivedOrders(ordersArray);
		} catch (err) {
			console.error("Ошибка сети при загрузке архива:", err);
			toast.error("Не удалось загрузить архив"); // 🔥 Уведомление об ошибке
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchArchive();
	}, []);

	const handleRestore = async (id: number) => {
		if (!window.confirm('Восстановить заказ и вернуть его в работу?')) return;

		const restoreToast = toast.loading('Восстановление...');
		try {
			// 🔥 Вызываем команду восстановления
			await api.post(`orders/${id}/unarchive/`);
			toast.success('Заказ успешно возвращен в работу!', { id: restoreToast });
			fetchArchive();
			window.dispatchEvent(new Event('orders-updated'));
		} catch (err) {
			console.error("Ошибка при восстановлении:", err);
			toast.error("Ошибка при восстановлении заказа", { id: restoreToast });
		}
	};

	const formatDate = (dateString: string) => {
		if (!dateString) return 'Нет срока';
		const date = new Date(dateString);
		return date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });
	};

	const filteredOrders = archivedOrders.filter(order =>
		order.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
		order.id.toString().includes(searchQuery)
	);

	return (
		<div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
			{/* Шапка страницы */}
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
				<div>
					<h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
						<History className="text-primary" size={32} strokeWidth={2.5} />
						Архив заказов
					</h1>
					<p className="text-sm font-bold text-slate-400 mt-1">История завершенных задач и отмененных проектов</p>
				</div>
			</div>

			{/* Панель поиска */}
			<Card className="flex flex-col sm:flex-row gap-4 items-center justify-between">
				<div className="relative w-full sm:w-96">
					<Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} strokeWidth={2.5} />
					<Input
						className="pl-11"
						placeholder="Поиск по клиенту или номеру заказа..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</div>
			</Card>

			{/* Таблица архива */}
			<Card noPadding className="overflow-hidden">
				<div className="overflow-x-auto custom-scrollbar">
					<table className="w-full text-left border-collapse min-w-[800px]">
						<thead>
							<tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 text-xs uppercase font-black tracking-wider">
								<th className="px-6 py-5 w-16">№</th>
								<th className="px-6 py-5">Клиент</th>
								<th className="px-6 py-5 w-5/12">Детали заказа</th>
								<th className="px-6 py-5 w-32 text-center">Статус</th>
								<th className="px-6 py-5 w-32 text-right">Действия</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100">
							{isLoading ? (
								<tr>
									<td colSpan={5} className="py-20 text-center">
										<Loader2 className="mx-auto animate-spin text-primary mb-2" size={32} />
										<p className="text-slate-400 font-bold text-sm">Поднимаем архивы...</p>
									</td>
								</tr>
							) : filteredOrders.length === 0 ? (
								<tr>
									<td colSpan={5} className="py-20 text-center">
										<PackageOpen className="mx-auto text-slate-200 mb-3" size={48} strokeWidth={1.5} />
										<p className="text-slate-500 font-bold">Архив пуст или ничего не найдено.</p>
									</td>
								</tr>
							) : (
								filteredOrders.map((order) => (
									<tr key={order.id} className="hover:bg-slate-50 transition-colors group opacity-80 hover:opacity-100">
										<td className="px-6 py-4 font-black text-slate-500">#{order.id}</td>
										<td className="px-6 py-4">
											<div className="font-bold text-slate-700">{order.client}</div>
										</td>
										<td className="px-6 py-4">
											<div className="flex flex-col gap-2">
												{Array.isArray(order.items) && order.items.map((item: any) => (
													<div key={item.id} className="flex items-center justify-between bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm">
														<div className="flex flex-col">
															<span className="text-sm font-bold text-slate-700">{item.name}</span>
															<span className="text-xs font-bold text-primary flex items-center gap-1 mt-0.5">
																<Archive size={10} /> {item.quantity} шт
															</span>
														</div>
														<div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md">
															<Calendar size={12} />
															{formatDate(item.deadline)}
														</div>
													</div>
												))}
											</div>
										</td>
										<td className="px-6 py-4 text-center">
											<span className="px-3 py-1 rounded-full text-[10px] font-black bg-slate-100 text-slate-500 uppercase tracking-widest border border-slate-200">
												В архиве
											</span>
										</td>
										<td className="px-6 py-4 text-right">
											<Button
												variant="outline"
												onClick={() => handleRestore(order.id)}
												className="text-xs py-1.5 px-3 hover:text-primary hover:border-primary opacity-0 group-hover:opacity-100 transition-all duration-200"
												title="Вернуть в работу"
												icon={<RotateCcw size={14} />}
											>
												Восстановить
											</Button>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</Card>
		</div>
	);
}