import { useState, useEffect } from 'react';
import ProductModal from '../modals/ProductModal';
import ConfirmDeleteModal from '../modals/ConfirmDeleteModal';

export default function ProductManagement() {
	const [products, setProducts] = useState<any[]>([]);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingProduct, setEditingProduct] = useState<any>(null);

	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [productToDelete, setProductToDelete] = useState<any>(null);

	const loadProducts = () => {
		fetch('http://127.0.0.1:8000/api/products/')
			.then(res => res.json())
			.then(data => setProducts(data))
			.catch(err => console.error(err));
	};

	useEffect(() => {
		loadProducts();
	}, []);

	const handleOpenModal = (product = null) => {
		setEditingProduct(product);
		setIsModalOpen(true);
	};

	const handleSaveProduct = async (productData: any) => {
		const url = editingProduct ? `http://127.0.0.1:8000/api/products/${editingProduct.id}/` : 'http://127.0.0.1:8000/api/products/';
		const method = editingProduct ? 'PUT' : 'POST';

		try {
			await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(productData) });
			setIsModalOpen(false);
			loadProducts();
		} catch (e) {
			console.error(e);
		}
	};

	const handleDeleteClick = (product: any) => {
		setProductToDelete(product);
		setIsDeleteModalOpen(true);
	};

	const confirmDelete = async () => {
		if (!productToDelete) return;
		try {
			await fetch(`http://127.0.0.1:8000/api/products/${productToDelete.id}/`, { method: 'DELETE' });
			setIsDeleteModalOpen(false);
			loadProducts();
		} catch (e) {
			console.error(e);
		}
	};

	return (
		<>
			<div className="filters-card" style={{ marginBottom: '20px' }}>
				<div className="filters-header">
					<div className="filters-header-title">
						<i className="fas fa-boxes"></i>
						<span>Ассортимент товаров</span>
					</div>
					<button className="btn btn-content" onClick={() => handleOpenModal()}>
						<i className="fas fa-plus"></i> Добавить товар
					</button>
				</div>
			</div>

			<div className="table-card">
				<table>
					<thead>
						<tr>
							<th>Название</th>
							<th>Категория</th>
							<th>Иконка</th>
							<th>Действия</th>
						</tr>
					</thead>
					<tbody>
						{products.map(p => (
							<tr key={p.id}>
								<td><strong>{p.name}</strong></td>
								<td>{p.category === 'polygraphy' ? 'Полиграфия' : p.category === 'packaging' ? 'Упаковка' : p.category === 'souvenirs' ? 'Сувениры' : 'Широкоформатная печать'}</td>
								<td>
									<i className={p.icon} style={{ fontSize: '18px', color: 'var(--text-color)', marginRight: '10px' }}></i>
									<span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-light)' }}>{p.icon}</span>
								</td>
								<td>
									<div className="actions">
										<button className="icon-btn" onClick={() => handleOpenModal(p)}><i className="fas fa-edit"></i></button>
										<button className="icon-btn delete" onClick={() => handleDeleteClick(p)}><i className="fas fa-trash"></i></button>
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			<ProductModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveProduct} initialData={editingProduct} />
			<ConfirmDeleteModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={confirmDelete} title="Удаление товара" itemName={productToDelete?.name} />
		</>
	);
}