import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Loader2, PackageSearch } from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import ProductModal from '../modals/ProductModal';
import ConfirmDeleteModal from '../modals/ConfirmDeleteModal';

// Словарь для красивого отображения категорий с цветами
const categoryConfig: Record<string, { label: string, colorClass: string }> = {
	'polygraphy': { label: 'Полиграфия', colorClass: 'bg-blue-100 text-blue-700 border-blue-200' },
	'packaging': { label: 'Упаковка', colorClass: 'bg-orange-100 text-orange-700 border-orange-200' },
	'souvenirs': { label: 'Сувениры', colorClass: 'bg-pink-100 text-pink-700 border-pink-200' },
	'large-format': { label: 'Широкоформатная печать', colorClass: 'bg-purple-100 text-purple-700 border-purple-200' },
};

export default function ProductsPage() {
	const navigate = useNavigate();
	const [products, setProducts] = useState<any[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingProduct, setEditingProduct] = useState<any>(null);

	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [productToDelete, setProductToDelete] = useState<any>(null);

	const fetchProductsSilently = async () => {
		const token = localStorage.getItem('token');
		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/api/products/`, {
				headers: { 'Authorization': `Bearer ${token}` }
			});

			if (res.status === 401) {
				localStorage.removeItem('token');
				navigate('/login');
				return;
			}

			if (res.ok) {
				const data = await res.json();
				localStorage.setItem('cached_products', JSON.stringify(data));
				setProducts(data);
			}
		} catch (err) {
			console.error("Ошибка при тихой загрузке:", err);
		}
	};

	const fetchProducts = async () => {
		const cached = localStorage.getItem('cached_products');
		if (cached) {
			setProducts(JSON.parse(cached));
			setIsLoading(false);
		} else {
			setIsLoading(true);
		}

		await fetchProductsSilently();
		setIsLoading(false);
	};

	useEffect(() => {
		fetchProducts();

		const handleSync = () => {
			if (!isModalOpen && !isDeleteModalOpen) {
				fetchProductsSilently();
			}
		};
		window.addEventListener('sync-updated', handleSync);

		return () => window.removeEventListener('sync-updated', handleSync);
	}, [isModalOpen, isDeleteModalOpen]);

	const openModal = (product = null) => {
		setEditingProduct(product);
		setIsModalOpen(true);
	};

	const handleSaveProduct = async (productData: any) => {
		const token = localStorage.getItem('token');
		const url = editingProduct
			? `${import.meta.env.VITE_API_URL}/api/products/${editingProduct.id}/`
			: `${import.meta.env.VITE_API_URL}/api/products/`;
		const method = editingProduct ? 'PUT' : 'POST';
		const saveToast = toast.loading('Сохранение...');

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
				toast.success(editingProduct ? 'Товар успешно обновлен!' : 'Новый товар добавлен!', { id: saveToast });
				setIsModalOpen(false);
				fetchProducts();
			} else {
				toast.error("Ошибка при сохранении", { id: saveToast });
			}
		} catch (err) {
			toast.error("Ошибка сети", { id: saveToast });
		}
	};

	const handleDeleteClick = (product: any) => {
		setProductToDelete(product);
		setIsDeleteModalOpen(true);
	};

	const confirmDelete = async () => {
		if (!productToDelete) return;

		const token = localStorage.getItem('token');
		const deleteToast = toast.loading('Удаление...');

		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/api/products/${productToDelete.id}/`, {
				method: 'DELETE',
				headers: { 'Authorization': `Bearer ${token}` }
			});

			if (res.ok) {
				toast.success('Товар успешно удален', { id: deleteToast });
				setIsDeleteModalOpen(false);
				fetchProducts();
			} else {
				toast.error("Ошибка при удалении", { id: deleteToast });
			}
		} catch (err) {
			toast.error("Ошибка сети", { id: deleteToast });
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

			{/* ── МОБИЛЬНЫЕ КАРТОЧКИ (только < md) ── */}
			<div className="md:hidden">
				{isLoading ? (
					<div className="flex flex-col items-center justify-center py-20 gap-3">
						<Loader2 className="animate-spin text-primary" size={32} />
						<p className="text-slate-400 font-bold text-sm">Загрузка каталога...</p>
					</div>
				) : products.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-20 gap-3">
						<PackageSearch className="text-slate-200" size={48} strokeWidth={1.5} />
						<p className="text-slate-500 font-bold">В каталоге пока нет товаров</p>
					</div>
				) : (
					<div className="grid grid-cols-1 gap-3">
						{products.map((item) => {
							const category = categoryConfig[item.category] || { label: item.category, colorClass: 'bg-slate-100 text-slate-700 border-slate-200' };
							return (
								<Card key={item.id} className="p-4">
									<div className="flex items-start gap-3">
										{/* Иконка товара */}
										<div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
											<i className={`${item.icon || 'fas fa-box'} text-primary text-xl`}></i>
										</div>

										{/* Основная информация */}
										<div className="flex-1 min-w-0">
											<p className="font-black text-slate-800 text-base leading-tight truncate">{item.name}</p>
											<div className="flex flex-wrap items-center gap-2 mt-1.5">
												<span className={`px-2.5 py-0.5 rounded-lg text-xs font-black uppercase tracking-wider border ${category.colorClass}`}>
													{category.label}
												</span>
												{item.icon && (
													<span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-[140px]">
														{item.icon}
													</span>
												)}
											</div>
										</div>

										{/* Кнопки действий — всегда видны на мобильном */}
										<div className="flex gap-2 flex-shrink-0">
											<button
												onClick={() => openModal(item)}
												className="p-2.5 bg-white text-slate-400 hover:text-primary hover:border-primary border border-slate-200 rounded-xl shadow-sm transition-colors active:scale-95"
												title="Редактировать"
											>
												<Edit2 size={16} strokeWidth={2.5} />
											</button>
											<button
												onClick={() => handleDeleteClick(item)}
												className="p-2.5 bg-white text-slate-400 hover:text-red-500 hover:border-red-500 border border-slate-200 rounded-xl shadow-sm transition-colors active:scale-95"
												title="Удалить"
											>
												<Trash2 size={16} strokeWidth={2.5} />
											</button>
										</div>
									</div>
								</Card>
							);
						})}
					</div>
				)}
			</div>

			{/* ── ДЕСКТОПНАЯ ТАБЛИЦА (только ≥ md) ── */}
			<Card noPadding className="overflow-hidden hidden md:block">
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
													<div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
														<i className={`${item.icon || 'fas fa-box'} text-primary`}></i>
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
														title="Редактировать"
													>
														<Edit2 size={16} strokeWidth={2.5} />
													</button>
													<button
														onClick={() => handleDeleteClick(item)}
														className="p-2 bg-white text-slate-400 hover:text-red-500 hover:border-red-500 border border-slate-200 rounded-xl shadow-sm transition-colors"
														title="Удалить"
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

			{/* Модалка редактирования/создания товара */}
			<ProductModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				onSave={handleSaveProduct}
				initialData={editingProduct}
			/>

			{/* Модалка подтверждения удаления */}
			<ConfirmDeleteModal
				isOpen={isDeleteModalOpen}
				onClose={() => setIsDeleteModalOpen(false)}
				onConfirm={confirmDelete}
				title="Удаление товара"
				itemName={productToDelete?.name || ''}
			/>
		</div>
	);
}