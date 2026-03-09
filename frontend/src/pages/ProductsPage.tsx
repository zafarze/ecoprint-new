import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Loader2, PackageSearch, Package } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import ProductModal from '../modals/ProductModal';

// Словарь для красивого отображения категорий с цветами
const categoryConfig: Record<string, { label: string, colorClass: string }> = {
	'polygraphy': { label: 'Полиграфия', colorClass: 'bg-blue-100 text-blue-700 border-blue-200' },
	'packaging': { label: 'Упаковка', colorClass: 'bg-orange-100 text-orange-700 border-orange-200' },
	'souvenirs': { label: 'Сувениры', colorClass: 'bg-pink-100 text-pink-700 border-pink-200' },
	'large-format': { label: 'Широкоформатная печать', colorClass: 'bg-purple-100 text-purple-700 border-purple-200' },
};

export default function ProductsPage() {
	const [products, setProducts] = useState<any[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	// Состояния для модального окна
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingProduct, setEditingProduct] = useState<any>(null);

	const fetchProducts = async () => {
		setIsLoading(true);
		const token = localStorage.getItem('token');
		try {
			const res = await fetch('http://127.0.0.1:8000/api/products/', {
				headers: { 'Authorization': `Bearer ${token}` }
			});
			if (res.ok) {
				const data = await res.json();
				setProducts(data);
			}
		} catch (err) {
			console.error("Ошибка загрузки:", err);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchProducts();
	}, []);

	const openModal = (product = null) => {
		setEditingProduct(product);
		setIsModalOpen(true);
	};

	const handleSaveProduct = async (productData: any) => {
		const token = localStorage.getItem('token');
		const url = editingProduct
			? `http://127.0.0.1:8000/api/products/${editingProduct.id}/`
			: 'http://127.0.0.1:8000/api/products/';
		const method = editingProduct ? 'PUT' : 'POST';

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
				setIsModalOpen(false);
				fetchProducts();
			} else {
				alert("Ошибка при сохранении");
			}
		} catch (err) {
			console.error(err);
		}
	};

	const handleDelete = async (id: number) => {
		if (!window.confirm('Точно удалить этот товар?')) return;

		const token = localStorage.getItem('token');
		try {
			const res = await fetch(`http://127.0.0.1:8000/api/products/${id}/`, {
				method: 'DELETE',
				headers: { 'Authorization': `Bearer ${token}` }
			});
			if (res.ok) fetchProducts();
		} catch (err) {
			console.error("Ошибка удаления:", err);
		}
	};

	return (
		<div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">

			{/* Шапка с кнопкой */}
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
				<div>
					<h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">Ассортимент</h1>
					<p className="text-sm font-bold text-slate-400 mt-1">Управление каталогом продукции</p>
				</div>
				<Button onClick={() => openModal()} icon={<Plus size={18} strokeWidth={3} />}>
					Добавить товар
				</Button>
			</div>

			{/* Таблица */}
			<Card noPadding className="overflow-hidden">
				<div className="overflow-x-auto custom-scrollbar">
					<table className="w-full text-left border-collapse min-w-[600px]">
						<thead>
							<tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 text-xs uppercase font-black tracking-wider">
								<th className="px-6 py-5">Название товара</th>
								<th className="px-6 py-5">Категория</th>
								<th className="px-6 py-5">Иконка</th>
								<th className="px-6 py-5 text-right">Действия</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100">
							{isLoading ? (
								<tr>
									<td colSpan={4} className="py-20 text-center">
										<Loader2 className="mx-auto animate-spin text-primary mb-2" size={32} />
										<p className="text-slate-400 font-bold text-sm">Загрузка каталога...</p>
									</td>
								</tr>
							) : products.length === 0 ? (
								<tr>
									<td colSpan={4} className="py-20 text-center">
										<PackageSearch className="mx-auto text-slate-200 mb-3" size={48} strokeWidth={1.5} />
										<p className="text-slate-500 font-bold">В каталоге пока нет товаров</p>
									</td>
								</tr>
							) : (
								products.map((item) => {
									const category = categoryConfig[item.category] || { label: item.category, colorClass: 'bg-slate-100 text-slate-700' };

									return (
										<tr key={item.id} className="hover:bg-slate-50 transition-colors group">
											<td className="px-6 py-4 font-black text-slate-800">
												<div className="flex items-center gap-3">
													<div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
														<i className={item.icon || 'fas fa-box'}></i>
													</div>
													{item.name}
												</div>
											</td>
											<td className="px-6 py-4">
												<span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider border ${category.colorClass}`}>
													{category.label}
												</span>
											</td>
											<td className="px-6 py-4">
												<span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
													{item.icon || 'нет'}
												</span>
											</td>
											<td className="px-6 py-4 text-right">
												<div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
													<button
														onClick={() => openModal(item)}
														className="p-2 bg-white text-slate-400 hover:text-primary hover:border-primary border border-slate-200 rounded-xl shadow-sm transition-colors"
													>
														<Edit2 size={16} strokeWidth={2.5} />
													</button>
													<button
														onClick={() => handleDelete(item.id)}
														className="p-2 bg-white text-slate-400 hover:text-red-500 hover:border-red-500 border border-slate-200 rounded-xl shadow-sm transition-colors"
													>
														<Trash2 size={16} strokeWidth={2.5} />
													</button>
												</div>
											</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>
			</Card>

			{/* Вызов новой модалки */}
			<ProductModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				onSave={handleSaveProduct}
				initialData={editingProduct}
			/>
		</div>
	);
}