// src/pages/ArchivePage.tsx — точ-в-точ archive.html
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api/api';

const formatDate = (s?: string) => {
	if (!s) return '—';
	const d = new Date(s);
	if (isNaN(d.getTime())) return '—';
	return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
};

export default function ArchivePage() {
	const [archivedOrders, setArchivedOrders] = useState<any[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	const userStr = localStorage.getItem('user');
	const user = userStr && userStr !== 'undefined' ? JSON.parse(userStr) : null;
	const isSuperuser = user?.role === 'superadmin';

	const fetchSilent = async () => {
		try {
			const res = await api.get('orders/?is_archived=true');
			const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
			localStorage.setItem('cached_archive', JSON.stringify(data));
			setArchivedOrders(data);
		} catch (err) { console.error('Загрузка архива:', err); }
	};

	const fetchArchive = async () => {
		const cached = localStorage.getItem('cached_archive');
		if (cached) { setArchivedOrders(JSON.parse(cached)); setIsLoading(false); }
		else setIsLoading(true);
		await fetchSilent();
		setIsLoading(false);
	};

	useEffect(() => {
		fetchArchive();
		const handler = () => fetchSilent();
		window.addEventListener('sync-updated', handler);
		return () => window.removeEventListener('sync-updated', handler);
	}, []);

	const broadcast = () => {
		import('../firebase').then(({ notifyAllClients }) => notifyAllClients()).catch(() => { });
	};

	const handleRestore = async (id: number) => {
		if (!window.confirm('Восстановить заказ и вернуть его в работу?')) return;
		const t = toast.loading('Восстановление...');
		try {
			await api.post(`orders/${id}/unarchive/`);
			toast.success('Заказ возвращён в работу!', { id: t });
			fetchArchive();
			broadcast();
			window.dispatchEvent(new Event('orders-updated'));
		} catch { toast.error('Ошибка при восстановлении', { id: t }); }
	};

	const handleDelete = async (id: number) => {
		if (!window.confirm('Удалить заказ из архива безвозвратно?')) return;
		try {
			await api.delete(`orders/${id}/`);
			toast.success('Удалено');
			fetchArchive();
			broadcast();
		} catch { toast.error('Ошибка при удалении'); }
	};

	return (
		<div className="container">
			<div className="main-content">

				<div className="filters-card" style={{ marginBottom: 20 }}>
					<div className="filters-header-title">
						<i className="fas fa-archive"></i>
						<span> Архив заказов</span>
					</div>
				</div>

				<div className="table-card">
					<table id="archiveTable">
						<thead>
							<tr>
								<th style={{ width: '5%' }}>№</th>
								<th style={{ width: '15%' }}>Клиент</th>
								<th style={{ width: '60%' }}>Состав (архивированные товары)</th>
								<th style={{ width: '10%' }}>Статус</th>
								<th style={{ width: '10%' }}>Действия</th>
							</tr>
						</thead>
						<tbody id="archiveTableBody">
							{archivedOrders.map((order, idx) => (
								<tr key={order.id}>
									<td>
										<span style={{ fontWeight: 'bold', color: '#6b7280' }}>#{idx + 1}</span>
										<div style={{ fontSize: 10, color: '#9ca3af' }}>ID:{order.id}</div>
									</td>
									<td><strong>{order.client}</strong></td>
									<td className="items-cell">
										<div className="items-container">
											{Array.isArray(order.items) && order.items.map((item: any, i: number) => (
												<div key={item.id} className="item-row-card">
													<span className="item-number">{i + 1}</span>
													<div className="item-content-row">
														<span className="item-name">{item.name}</span>
														<span className="item-quantity">{item.quantity} шт.</span>
														<div className="item-deadline" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
															<div><i className="fas fa-flag-checkered" style={{ color: '#ef4444' }}></i> {formatDate(item.deadline)}</div>
														</div>
													</div>
												</div>
											))}
										</div>
									</td>
									<td>
										<span className="status-badge status-ready">В архиве</span>
									</td>
									<td>
										<div className="actions">
											<button className="icon-btn" title="Восстановить" onClick={() => handleRestore(order.id)}>
												<i className="fas fa-undo"></i>
											</button>
											{isSuperuser && (
												<button className="icon-btn delete" title="Удалить безвозвратно" onClick={() => handleDelete(order.id)}>
													<i className="fas fa-trash"></i>
												</button>
											)}
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>

					{!isLoading && archivedOrders.length === 0 && (
						<div className="empty-state" id="archiveEmptyState">
							<i className="fas fa-box-open"></i>
							<h3>Архив пуст</h3>
							<p>Заказы, которые вы архивируете на главной странице, появятся здесь.</p>
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
		</div>
	);
}
