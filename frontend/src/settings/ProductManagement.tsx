// src/settings/ProductManagement.tsx — точ-в-точ product_list.html
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api/api';
import ProductModal from '../modals/ProductModal';
import ConfirmDeleteModal from '../modals/ConfirmDeleteModal';

const CATEGORY: Record<string, string> = {
	'polygraphy': 'Полиграфия',
	'packaging': 'Упаковка',
	'souvenirs': 'Сувениры',
	'large-format': 'Широкоформатная печать',
};

export default function ProductManagement() {
	const [products, setProducts] = useState<any[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingProduct, setEditingProduct] = useState<any>(null);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [productToDelete, setProductToDelete] = useState<any>(null);

	const load = async () => {
		setIsLoading(true);
		try { const res = await api.get('products/'); setProducts(res.data || []); }
		catch { toast.error('Ошибка загрузки товаров'); }
		finally { setIsLoading(false); }
	};
	useEffect(() => { load(); }, []);

	const handleSave = async (data: any) => {
		try {
			if (editingProduct) await api.put(`products/${editingProduct.id}/`, data);
			else await api.post('products/', data);
			toast.success(editingProduct ? 'Товар обновлён' : 'Товар добавлен');
			setIsModalOpen(false);
			load();
		} catch { toast.error('Ошибка сохранения'); }
	};

	const confirmDelete = async () => {
		if (!productToDelete) return;
		try { await api.delete(`products/${productToDelete.id}/`); toast.success('Товар удалён'); load(); }
		catch { toast.error('Ошибка при удалении'); }
		finally { setIsDeleteModalOpen(false); setProductToDelete(null); }
	};

	return (
		<div className="container">
			<div className="main-content">

				<div className="filters-card" style={{ marginBottom: 20 }}>
					<div className="filters-header">
						<div className="filters-header-title">
							<i className="fas fa-boxes"></i>
							<span> Ассортимент товаров</span>
						</div>
						<button className="btn btn-content" onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}>
							<i className="fas fa-plus"></i> Добавить товар
						</button>
					</div>
				</div>

				<div className="table-card">
					<table id="productTable">
						<thead>
							<tr>
								<th style={{ width: '5%' }}>№</th>
								<th>Название товара</th>
								<th>Категория</th>
								<th>Иконка</th>
								<th>Действия</th>
							</tr>
						</thead>
						<tbody id="productTableBody">
							{isLoading && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30, color: '#6c757d' }}>Загрузка...</td></tr>}
							{!isLoading && products.map((p, idx) => (
								<tr key={p.id}>
									<td>
										<span style={{ fontWeight: 'bold', color: '#6b7280' }}>#{idx + 1}</span>
									</td>
									<td><strong>{p.name}</strong></td>
									<td>{CATEGORY[p.category] || p.category}</td>
									<td>
										<i className={p.icon} style={{ fontSize: 18, color: '#2c3e50' }}></i>{' '}
										<span style={{ fontFamily: 'monospace', fontSize: 12, color: '#6c757d' }}>{p.icon}</span>
									</td>
									<td>
										<div className="actions">
											<button className="icon-btn" title="Редактировать" onClick={() => { setEditingProduct(p); setIsModalOpen(true); }}>
												<i className="fas fa-edit"></i>
											</button>
											<button className="icon-btn delete" title="Удалить" onClick={() => { setProductToDelete(p); setIsDeleteModalOpen(true); }}>
												<i className="fas fa-trash"></i>
											</button>
										</div>
									</td>
								</tr>
							))}
							{!isLoading && products.length === 0 && (
								<tr><td colSpan={5} style={{ textAlign: 'center', padding: 30, color: '#6c757d' }}>
									Вы ещё не добавили ни одного товара в ассортимент.
								</td></tr>
							)}
						</tbody>
					</table>
				</div>
			</div>

			<ProductModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} initialData={editingProduct} />
			<ConfirmDeleteModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={confirmDelete} title="Удаление товара" itemName={productToDelete?.name || ''} />
		</div>
	);
}
