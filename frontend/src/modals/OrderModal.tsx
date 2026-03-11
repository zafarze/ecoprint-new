// src/modals/OrderModal.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
	Trash2, Plus, Save, User, Package, CheckCircle2,
	LayoutList, Clock, ChevronDown, MessageSquare
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
	// Получаем ID текущего авторизованного пользователя
	const getCurrentUserId = () => {
		const userStr = localStorage.getItem('user');
		if (userStr) {
			try { return JSON.parse(userStr).id; } catch (e) { return ''; }
		}
		return '';
	};

	const [client, setClient] = useState('');
	const [clientPhone, setClientPhone] = useState('');
	const [items, setItems] = useState<any[]>([
		{ id: Date.now(), name: '', quantity: 1, deadline: '', status: 'not-ready', comment: '', responsible_user_id: getCurrentUserId() }
	]);

	const [products, setProducts] = useState<any[]>([]);
	const [users, setUsers] = useState<any[]>([]); // Состояние для сотрудников
	const [activeProductDropdown, setActiveProductDropdown] = useState<number | null>(null);
	const [isHistoryOpen, setIsHistoryOpen] = useState(false);

	// Параллельная загрузка товаров и сотрудников
	useEffect(() => {
		const loadData = async () => {
			const token = localStorage.getItem('token');
			const baseUrl = import.meta.env.VITE_API_URL; // Берем URL из окружения!
			try {
				const [resProd, resUsers] = await Promise.all([
					fetch(`${baseUrl}/api/products/`, { headers: { 'Authorization': `Bearer ${token}` } }),
					fetch(`${baseUrl}/api/users/`, { headers: { 'Authorization': `Bearer ${token}` } })
				]);
				if (resProd.ok) setProducts(await resProd.json());
				if (resUsers.ok) setUsers(await resUsers.json());
			} catch (err) { console.error("Ошибка загрузки справочников:", err); }
		};
		if (isOpen) loadData();
	}, [isOpen]);

	useEffect(() => {
		if (initialData) {
			setClient(initialData.client);
			setClientPhone(initialData.client_phone || '');
			// Извлекаем responsible_user_id из вложенного объекта responsible_user (если он есть)
			setItems(initialData.items?.length ? initialData.items.map((i: any) => ({
				...i,
				responsible_user_id: i.responsible_user?.id || ''
			})) : [{ id: Date.now(), name: '', quantity: 1, deadline: '', status: 'not-ready', comment: '', responsible_user_id: getCurrentUserId() }]);
		} else {
			setClient(''); setClientPhone('');
			// При создании нового заказа автоматически ставим текущего юзера
			setItems([{ id: Date.now(), name: '', quantity: 1, deadline: '', status: 'not-ready', comment: '', responsible_user_id: getCurrentUserId() }]);
			setIsHistoryOpen(false);
		}
	}, [initialData, isOpen]);

	// При добавлении позиции тоже автоматически ставим текущего юзера
	const addItem = () => setItems([...items, { id: Date.now(), name: '', quantity: 1, deadline: '', status: 'not-ready', comment: '', responsible_user_id: getCurrentUserId() }]);

	const removeItem = (id: number) => items.length > 1 && setItems(items.filter(item => item.id !== id));
	const updateItem = (id: number, field: string, value: any) => setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		// Очищаем временные ID (от Date.now) перед отправкой на бэкенд
		const cleanedItems = items.map(item => {
			const { id, responsible_user, ...rest } = item;
			// Если ID большой (создан на фронте), удаляем его. Бэкенд сам создаст.
			return id > 1000000000000 ? rest : { id, ...rest };
		});
		onSave({ client, client_phone: clientPhone, items_write: cleanedItems });
	};

	const readyCount = items.filter(i => i.status === 'ready').length;

	const formatDate = (dateStr?: string) => {
		if (!dateStr) return '—';
		return new Date(dateStr).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
	};

	return (
		<BaseModal isOpen={isOpen} onClose={onClose} title={initialData ? `Заказ #${initialData.id}` : 'Новый заказ'} maxWidth="max-w-4xl">
			<form onSubmit={handleSubmit} className="space-y-8">

				{/* Секция: Клиент */}
				<div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
					<h3 className="flex items-center gap-2 text-eco-blue font-black mb-4 uppercase tracking-wider text-sm">
						<User size={18} strokeWidth={3} /> Данные заказчика
					</h3>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div>
							<Label>Имя клиента *</Label>
							<Input value={client} onChange={e => setClient(e.target.value)} placeholder="Например: Иван Иванов" required />
						</div>
						<div>
							<Label>Телефон</Label>
							<Input type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="+992 XX XXX XXXX" />
						</div>
					</div>
				</div>

				{/* Секция: Состав заказа */}
				<div>
					<h3 className="flex items-center gap-2 text-eco-pink font-black mb-4 uppercase tracking-wider text-sm pl-2">
						<Package size={18} strokeWidth={3} /> Состав заказа
					</h3>

					<div className="space-y-4">
						<AnimatePresence>
							{items.map((item, index) => (
								<motion.div key={item.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 relative">
									<div className="flex justify-between items-center mb-4">
										<span className="bg-white border border-slate-200 text-slate-500 font-black text-xs px-3 py-1 rounded-lg shadow-sm">Позиция {index + 1}</span>
										{items.length > 1 && (<button type="button" onClick={() => removeItem(item.id)} className="text-slate-400 hover:text-red-500 flex items-center gap-1 text-xs font-bold transition-colors"><Trash2 size={14} /> Убрать</button>)}
									</div>

									<div className="space-y-4">
										<div>
											<Label>Название / Тип продукции *</Label>
											<div className="flex gap-2">
												<Input className="flex-1 bg-white" value={item.name} onChange={e => updateItem(item.id, 'name', e.target.value)} placeholder="Введите или выберите из списка" required />
												<Button type="button" variant={activeProductDropdown === item.id ? "primary" : "outline"} onClick={() => setActiveProductDropdown(activeProductDropdown === item.id ? null : item.id)} className="shrink-0 bg-white" icon={<LayoutList size={16} />}>Шаблоны</Button>
											</div>
											{activeProductDropdown === item.id && (
												<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 p-3 bg-white border border-slate-200 rounded-xl max-h-48 overflow-y-auto">
													{products.map(p => (
														<button key={p.id} type="button" onClick={() => { updateItem(item.id, 'name', p.name); setActiveProductDropdown(null); }} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg hover:text-primary hover:bg-primary/5 text-sm font-medium text-left transition-all">
															<i className={`${p.icon} text-primary/70`}></i> {p.name}
														</button>
													))}
												</div>
											)}
										</div>

										<div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
											<div className="col-span-1">
												<Label>Кол-во *</Label>
												<Input type="number" min="1" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', e.target.value)} required />
											</div>
											<div className="col-span-1">
												<Label>Срок *</Label>
												<Input type="date" value={item.deadline} onChange={e => updateItem(item.id, 'deadline', e.target.value)} required />
											</div>
											<div className="col-span-1">
												<Label>Статус</Label>
												<Select value={item.status} onChange={e => updateItem(item.id, 'status', e.target.value)} options={[
													{ value: 'not-ready', label: 'Не готов' }, { value: 'in-progress', label: 'В процессе' }, { value: 'ready', label: 'Готово' }
												]} />
											</div>
											<div className="col-span-1">
												<Label>Исполнитель</Label>
												<Select
													value={item.responsible_user_id}
													onChange={e => updateItem(item.id, 'responsible_user_id', e.target.value)}
													options={[
														{ value: '', label: 'Не назначен' },
														...users.map(u => ({ value: u.id, label: `${u.first_name || u.username}` }))
													]}
												/>
											</div>
										</div>

										<div>
											<Label className="flex items-center gap-1.5"><MessageSquare size={14} /> Заметка</Label>
											<textarea className="w-full min-h-[60px] p-3 mt-1 rounded-xl border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-y text-sm bg-white" placeholder="Особенности заказа..." value={item.comment || ''} onChange={(e) => updateItem(item.id, 'comment', e.target.value)} />
										</div>
									</div>
								</motion.div>
							))}
						</AnimatePresence>
					</div>

					<Button type="button" variant="outline" icon={<Plus size={18} />} className="w-full mt-4 border-dashed border-slate-300 bg-slate-50 hover:bg-white text-slate-500" onClick={addItem}>Добавить еще позицию</Button>
				</div>

				{initialData && initialData.history && initialData.history.length > 0 && (
					<div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
						<button type="button" onClick={() => setIsHistoryOpen(!isHistoryOpen)} className="flex items-center justify-between w-full text-left text-slate-700 font-black hover:text-primary transition-colors">
							<span className="flex items-center gap-2"><Clock size={18} /> История изменений заказа</span>
							<ChevronDown size={18} className={`transition-transform duration-300 ${isHistoryOpen ? 'rotate-180' : ''}`} />
						</button>

						<AnimatePresence>
							{isHistoryOpen && (
								<motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
									<div className="mt-6 pl-4 border-l-2 border-slate-200 space-y-5 mb-2">
										{initialData.history.map((entry: any, idx: number) => (
											<div key={idx} className="relative">
												<div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-300 border-2 border-white"></div>
												<p className="text-xs text-slate-400 font-bold mb-1">{formatDate(entry.created_at_formatted || entry.created_at)} • <span className="text-primary">{entry.user_name || 'Система'}</span></p>
												<p className="text-sm text-slate-700 font-medium bg-slate-50 p-2.5 rounded-lg border border-slate-100 inline-block">{entry.message}</p>
											</div>
										))}
									</div>
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				)}

				{/* Подвал формы */}
				<div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
					<div className="flex gap-4 text-sm font-bold text-slate-500">
						<span className="flex items-center gap-1.5"><Package size={16} /> Позиций: <strong className="text-slate-800">{items.length}</strong></span>
						<span className="flex items-center gap-1.5 text-emerald-600"><CheckCircle2 size={16} /> Готово: <strong>{readyCount}</strong></span>
					</div>

					<div className="flex w-full sm:w-auto gap-3">
						<Button type="button" variant="ghost" onClick={onClose} className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200">Отмена</Button>
						<Button type="submit" variant="primary" icon={<Save size={18} />} className="w-full sm:w-auto">Сохранить</Button>
					</div>
				</div>

			</form>
		</BaseModal>
	);
}