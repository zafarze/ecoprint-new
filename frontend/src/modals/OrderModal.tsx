import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
	Trash2, Plus, Save, User, Package, CheckCircle2,
	LayoutList, X, Clock, ChevronDown, MessageSquare
} from 'lucide-react';
import BaseModal from '../components/ui/BaseModal';
import Button from '../components/ui/Button';
import { Input, Label, Select } from '../components/ui/Form';

interface OrderModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSave: (orderData: any) => void;
	initialData?: any;
}

export default function OrderModal({ isOpen, onClose, onSave, initialData }: OrderModalProps) {
	const [client, setClient] = useState('');
	const [clientPhone, setClientPhone] = useState('');
	const [items, setItems] = useState<any[]>([
		{ id: Date.now(), name: '', quantity: 1, deadline: '', status: 'not-ready', comment: '' }
	]);

	// Новые состояния для функционала
	const [products, setProducts] = useState<any[]>([]);
	const [activeProductDropdown, setActiveProductDropdown] = useState<number | null>(null);
	const [isHistoryOpen, setIsHistoryOpen] = useState(false);

	// Загрузка продуктов для выпадающего списка
	useEffect(() => {
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
		if (isOpen) loadProducts();
	}, [isOpen]);

	useEffect(() => {
		if (initialData) {
			setClient(initialData.client);
			setClientPhone(initialData.client_phone || '');
			setItems(initialData.items?.length ? initialData.items : [{ id: Date.now(), name: '', quantity: 1, deadline: '', status: 'not-ready', comment: '' }]);
		} else {
			setClient('');
			setClientPhone('');
			setItems([{ id: Date.now(), name: '', quantity: 1, deadline: '', status: 'not-ready', comment: '' }]);
			setIsHistoryOpen(false); // Сбрасываем при открытии нового
		}
	}, [initialData, isOpen]);

	const addItem = () => setItems([...items, { id: Date.now(), name: '', quantity: 1, deadline: '', status: 'not-ready', comment: '' }]);
	const removeItem = (id: number) => items.length > 1 && setItems(items.filter(item => item.id !== id));
	const updateItem = (id: number, field: string, value: any) => setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onSave({ client, client_phone: clientPhone, items_write: items });
	};

	const readyCount = items.filter(i => i.status === 'ready').length;

	// Вспомогательная функция для форматирования даты
	const formatDate = (dateStr?: string) => {
		if (!dateStr) return '—';
		return new Date(dateStr).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
	};

	return (
		<BaseModal
			isOpen={isOpen}
			onClose={onClose}
			title={initialData ? `Заказ #${initialData.id}` : 'Новый заказ'}
			maxWidth="max-w-3xl"
		>
			<form onSubmit={handleSubmit} className="space-y-8">

				{/* Секция: Клиент */}
				<div>
					<h3 className="flex items-center gap-2 text-eco-blue font-black mb-4 uppercase tracking-wider text-sm">
						<User size={18} strokeWidth={3} /> Данные заказчика
					</h3>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div>
							<Label>Имя клиента *</Label>
							<Input
								value={client}
								onChange={e => setClient(e.target.value)}
								placeholder="Например: Иван Иванов"
								required
							/>
						</div>
						<div>
							<Label>Телефон</Label>
							<Input
								type="tel"
								value={clientPhone}
								onChange={e => setClientPhone(e.target.value)}
								placeholder="+992 XX XXX XXXX"
							/>
						</div>
					</div>
				</div>

				{/* Секция: Состав заказа */}
				<div>
					<h3 className="flex items-center gap-2 text-eco-pink font-black mb-4 uppercase tracking-wider text-sm">
						<Package size={18} strokeWidth={3} /> Состав заказа
					</h3>

					<div className="space-y-4">
						<AnimatePresence>
							{items.map((item, index) => (
								<motion.div
									key={item.id}
									initial={{ opacity: 0, height: 0, scale: 0.95 }}
									animate={{ opacity: 1, height: 'auto', scale: 1 }}
									exit={{ opacity: 0, height: 0, scale: 0.95, margin: 0 }}
									transition={{ duration: 0.2 }}
									className="bg-slate-50 border border-slate-200 rounded-2xl p-5 relative group"
								>
									<div className="flex justify-between items-center mb-4">
										<span className="bg-white border border-slate-200 text-slate-500 font-black text-xs px-3 py-1 rounded-lg shadow-sm">
											Товар {index + 1}
										</span>
										{items.length > 1 && (
											<button
												type="button"
												onClick={() => removeItem(item.id)}
												className="text-slate-400 hover:text-red-500 flex items-center gap-1 text-xs font-bold transition-colors"
											>
												<Trash2 size={14} /> Убрать
											</button>
										)}
									</div>

									<div className="space-y-4">
										{/* ПУНКТ 3: Выбор типа продукции */}
										<div>
											<Label>Тип продукции *</Label>
											<div className="flex gap-2">
												<Input
													className="flex-1 bg-white"
													value={item.name}
													onChange={e => updateItem(item.id, 'name', e.target.value)}
													placeholder="Введите название или выберите из списка"
													required
												/>
												<Button
													type="button"
													variant={activeProductDropdown === item.id ? "primary" : "outline"}
													onClick={() => setActiveProductDropdown(activeProductDropdown === item.id ? null : item.id)}
													className="shrink-0 bg-white"
													icon={activeProductDropdown === item.id ? <X size={16} /> : <LayoutList size={16} />}
												>
													{activeProductDropdown === item.id ? 'Скрыть список' : 'Из списка'}
												</Button>
											</div>

											{/* Сетка выбора продуктов */}
											{activeProductDropdown === item.id && (
												<div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 p-3 bg-white border border-slate-200 rounded-xl max-h-48 overflow-y-auto">
													{products.length > 0 ? products.map(p => (
														<button
															key={p.id}
															type="button"
															onClick={() => {
																updateItem(item.id, 'name', p.name);
																setActiveProductDropdown(null);
															}}
															className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-100 rounded-lg hover:border-primary hover:text-primary transition-all text-sm font-medium text-left"
														>
															<i className={`${p.icon} text-primary/70`}></i> {p.name}
														</button>
													)) : (
														<div className="col-span-full text-center py-2 text-slate-400 text-sm">Нет доступных товаров</div>
													)}
												</div>
											)}
										</div>

										{/* Детали: Кол-во, Срок (Пункт 4), Статус */}
										<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
											<div>
												<Label>Кол-во *</Label>
												<Input
													type="number"
													min="1"
													value={item.quantity}
													onChange={e => updateItem(item.id, 'quantity', e.target.value)}
													required
												/>
											</div>
											<div>
												<Label>Срок сдачи *</Label>
												<Input
													type="date"
													value={item.deadline}
													onChange={e => updateItem(item.id, 'deadline', e.target.value)}
													required
												/>
											</div>
											<div>
												<Label>Статус товара</Label>
												<Select
													value={item.status}
													onChange={e => updateItem(item.id, 'status', e.target.value)}
													options={[
														{ value: 'not-ready', label: 'Не готов' },
														{ value: 'in-progress', label: 'В процессе' },
														{ value: 'ready', label: 'Готово' },
													]}
												/>
											</div>
										</div>

										{/* ПУНКТ 2: Комментарий */}
										<div>
											<Label className="flex items-center gap-1.5"><MessageSquare size={14} /> Комментарий / Заметка</Label>
											<textarea
												className="w-full min-h-[80px] p-3 mt-1 rounded-xl border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-y text-sm bg-white"
												placeholder="Напр: матовая бумага, 300г/м², проверить макет..."
												value={item.comment || ''}
												onChange={(e) => updateItem(item.id, 'comment', e.target.value)}
											/>
										</div>
									</div>
								</motion.div>
							))}
						</AnimatePresence>
					</div>

					<Button
						type="button"
						variant="outline"
						icon={<Plus size={18} />}
						className="w-full mt-4 border-dashed border-slate-300 bg-slate-50 hover:bg-white"
						onClick={addItem}
					>
						Добавить позицию
					</Button>
				</div>

				{/* ПУНКТ 1: История изменений (показываем только при редактировании) */}
				{initialData && (
					<div className="pt-2 border-t border-slate-100">
						<button
							type="button"
							onClick={() => setIsHistoryOpen(!isHistoryOpen)}
							className="flex items-center justify-between w-full text-left text-slate-600 font-bold hover:text-primary transition-colors py-2"
						>
							<span className="flex items-center gap-2">
								<Clock size={18} /> История изменений
							</span>
							<ChevronDown size={18} className={`transition-transform duration-300 ${isHistoryOpen ? 'rotate-180' : ''}`} />
						</button>

						<AnimatePresence>
							{isHistoryOpen && (
								<motion.div
									initial={{ opacity: 0, height: 0 }}
									animate={{ opacity: 1, height: 'auto' }}
									exit={{ opacity: 0, height: 0 }}
									className="overflow-hidden"
								>
									<div className="mt-4 pl-4 border-l-2 border-slate-200 space-y-4 mb-4">
										{/* Пример вывода истории. Если есть история с бэка: initialData.history.map(...) */}
										<div className="relative">
											<div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-300 border-2 border-white"></div>
											<p className="text-xs text-slate-400 font-bold mb-0.5">
												{formatDate(initialData.created_at)} • Система
											</p>
											<p className="text-sm text-slate-700 font-medium">Заказ создан</p>
										</div>
									</div>
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				)}

				{/* Подвал формы: Итоги и Кнопки */}
				<div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
					<div className="flex gap-4 text-sm font-bold text-slate-500">
						<span className="flex items-center gap-1.5">
							<Package size={16} /> Позиций: <strong className="text-slate-800">{items.length}</strong>
						</span>
						<span className="flex items-center gap-1.5 text-emerald-600">
							<CheckCircle2 size={16} /> Готово: <strong>{readyCount}</strong>
						</span>
					</div>

					<div className="flex w-full sm:w-auto gap-3">
						<Button type="button" variant="ghost" onClick={onClose} className="w-full sm:w-auto">
							Отмена
						</Button>
						<Button type="submit" variant="primary" icon={<Save size={18} />} className="w-full sm:w-auto">
							Сохранить заказ
						</Button>
					</div>
				</div>

			</form>
		</BaseModal>
	);
}