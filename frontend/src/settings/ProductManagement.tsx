import { useState, useEffect } from 'react';
import { PackageSearch, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../components/ui/Card';
import ProductModal from '../modals/ProductModal';
import ConfirmDeleteModal from '../modals/ConfirmDeleteModal';

export default function ProductManagement() {
	const [products, setProducts] = useState<any[]>([]);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingProduct, setEditingProduct] = useState<any>(null);

	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [productToDelete, setProductToDelete] = useState<any>(null);

	const loadProducts = () => {
		const token = localStorage.getItem('token');
		// ИЗМЕНЕНО: Используем переменную окружения
		fetch(`${import.meta.env.VITE_API_URL}/api/products/`, {
			headers: { 'Authorization': `Bearer ${token}` }
		})
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
		// ИЗМЕНЕНО: Используем переменную окружения
		const url = editingProduct
			? `${import.meta.env.VITE_API_URL}/api/products/${editingProduct.id}/`
			: `${import.meta.env.VITE_API_URL}/api/products/`;
		const method = editingProduct ? 'PUT' : 'POST';
		const token = localStorage.getItem('token');

		try {
			const res = await fetch(url, {
				method,
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token}`
				},
				body: JSON.stringify(productData)
			});

			if (res.ok) {
				toast.success(editingProduct ? 'Товар обновлен' : 'Товар добавлен');
				setIsModalOpen(false);
				loadProducts();
			} else {
				toast.error('Ошибка сохранения');
			}
		} catch (error) {
			console.error(error);
		}
	};

	const handleDeleteClick = (product: any) => {
		setProductToDelete(product);
		setIsDeleteModalOpen(true);
	};

	const confirmDelete = async () => {
		if (!productToDelete) return;
		const token = localStorage.getItem('token');

		try {
			// ИЗМЕНЕНО: Используем переменную окружения
			const res = await fetch(`${import.meta.env.VITE_API_URL}/api/products/${productToDelete.id}/`, {
				method: 'DELETE',
				headers: { 'Authorization': `Bearer ${token}` }
			});

			if (res.ok) {
				toast.success('Товар удален');
				loadProducts();
			} else {
				toast.error('Ошибка при удалении');
			}
		} catch (error) {
			console.error(error);
		} finally {
			setIsDeleteModalOpen(false);
		}
	};

	const getCategoryName = (cat: string) => {
		const categories: any = {
			'polygraphy': 'Полиграфия',
			'packaging': 'Упаковка',
			'souvenirs': 'Сувениры',
			'large-format': 'Широкоформатная печать'
		};
		return categories[cat] || cat;
	};

	return (
		<div className="max-w-5xl animate-in fade-in slide-in-from-bottom-4">
			<div className="flex items-center justify-between mb-6">
				<h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
					<PackageSearch className="text-indigo-500" size={28} strokeWidth={2.5} />
					Справочник товаров
				</h2>
				<button onClick={() => handleOpenModal()} className="bg-gradient-eco text-white px-5 py-2.5 rounded-xl font-bold shadow-md hover:shadow-lg transition-all active:scale-95">
					+ Добавить товар
				</button>
			</div>

			<Card noPadding>
				<div className="overflow-x-auto">
					<table className="w-full text-sm text-left">
						<thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100 uppercase text-xs">
							<tr>
								<th className="px-6 py-4 rounded-tl-3xl">Название</th>
								<th className="px-6 py-4">Категория</th>
								<th className="px-6 py-4">Иконка</th>
								<th className="px-6 py-4 text-right rounded-tr-3xl">Действия</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100">
							{products.map(p => (
								<tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
									<td className="px-6 py-4 font-bold text-slate-800">{p.name}</td>
									<td className="px-6 py-4">
										<span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 border border-slate-200">
											{getCategoryName(p.category)}
										</span>
									</td>
									<td className="px-6 py-4">
										<div className="flex items-center gap-2">
											<i className={`${p.icon} text-primary`}></i>
											<span className="text-xs font-mono text-slate-400">{p.icon}</span>
										</div>
									</td>
									<td className="px-6 py-4 text-right">
										<div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
											<button onClick={() => handleOpenModal(p)} className="p-2 text-slate-400 hover:text-primary bg-white hover:border-primary border border-slate-200 rounded-xl shadow-sm transition-all">
												<Edit2 size={16} />
											</button>
											<button onClick={() => handleDeleteClick(p)} className="p-2 text-slate-400 hover:text-red-500 bg-white hover:border-red-500 border border-slate-200 rounded-xl shadow-sm transition-all">
												<Trash2 size={16} />
											</button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</Card>

			<ProductModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveProduct} initialData={editingProduct} />
			<ConfirmDeleteModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={confirmDelete} title="Удалить товар" itemName={productToDelete?.name || ''} />
		</div>
	);
}