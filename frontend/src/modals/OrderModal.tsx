// src/modals/OrderModal.tsx
import React, { useState, useEffect } from 'react';
import {
	Trash2, Plus, Save, User, Package, CheckCircle2,
	LayoutList, History, MessageSquare, Briefcase, ChevronDown
} from 'lucide-react';
import BaseModal from '../components/ui/BaseModal';
import Button from '../components/ui/Button';
import { Input, Label, Select } from '../components/ui/Form';
import api from '../api/api';

interface OrderModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSave: (orderData: any) => void;
	initialData?: any;
}

export default function OrderModal({ isOpen, onClose, onSave, initialData }: OrderModalProps) {
	// 🔥 Состояние для скрытия/раскрытия истории
	const [isHistoryOpen, setIsHistoryOpen] = useState(false);

	// 🛠 ПУНКТ 4b: Получаем текущего пользователя и его имя
	const getCurrentUser = () => {
		const userStr = localStorage.getItem('user');
		if (userStr) {
			try { return JSON.parse(userStr); } catch (e) { return null; }
		}
		return null;
	};
	const currentUser = getCurrentUser();

	const [client, setClient] = useState('');
	const [clientPhone, setClientPhone] = useState('');
	const [items, setItems] = useState<any[]>([
		{ id: Date.now(), name: '', quantity: 1, deadline: '', status: 'not-ready', comment: '', responsible_user_id: currentUser?.id || '' }
	]);

	const [products, setProducts] = useState<any[]>([]);
	const [activeProductDropdown, setActiveProductDropdown] = useState<number | null>(null);

	useEffect(() => {
		const loadData = async () => {
			try {
				const resProd = await api.get('products/');
				setProducts(resProd.data);
			} catch (err) {
				console.error("Ошибка загрузки справочников:", err);
			}
		};

		if (isOpen) loadData();
	}, [isOpen]);

	useEffect(() => {
		if (initialData) {
			setClient(initialData.client);
			setClientPhone(initialData.client_phone || '');

			setItems(initialData.items?.length ? initialData.items.map((i: any) => ({
				...i,
				// Если это редактирование старого заказа, сохраняем его старого исполнителя. 
				// Если его нет - ставим текущего.
				responsible_user_id: i.responsible_user?.id || currentUser?.id || ''
			})) : [{ id: Date.now(), name: '', quantity: 1, deadline: '', status: 'not-ready', comment: '', responsible_user_id: currentUser?.id || '' }]);

		} else {
			setClient(''); setClientPhone('');
			setItems([{ id: Date.now(), name: '', quantity: 1, deadline: '', status: 'not-ready', comment: '', responsible_user_id: currentUser?.id || '' }]);
		}
	}, [initialData, isOpen]);

	const addItem = () => setItems([...items, { id: Date.now(), name: '', quantity: 1, deadline: '', status: 'not-ready', comment: '', responsible_user_id: currentUser?.id || '' }]);
	const removeItem = (id: number) => items.length > 1 && setItems(items.filter(item => item.id !== id));
	const updateItem = (id: number, field: string, value: any) => setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const cleanedItems = items.map(item => {
			const { id, responsible_user, ...rest } = item;
			return id > 1000000000000 ? rest : { id, ...rest };
		});
		onSave({ client, client_phone: clientPhone, items_write: cleanedItems });
	};

	const readyCount = items.filter(i => i.status === 'ready').length;

	const formatDate = (dateStr?: string) => {
		if (!dateStr) return '—';
		return new Date(dateStr).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
	};

	// 🛠 ПУНКТ 4: Название как на макете
	const modalTitle = initialData ? 'Редактировать заказ' : 'Новый заказ';

	return (
		<BaseModal isOpen={isOpen} onClose={onClose} title={modalTitle} maxWidth="max-w-4xl">

			{/* Подзаголовок по макету */}
			<p className="px-6 pb-4 text-sm font-bold text-slate-400 border-b border-slate-100 -mt-2">
				{initialData ? 'Измените информацию о заказе' : 'Заполните информацию о заказе'}
			</p>

			<form onSubmit={handleSubmit} className="space-y-6 mt-4">

				<div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm mx-1">
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

				<div className="mx-1">
					<h3 className="flex items-center gap-2 text-eco-pink font-black mb-4 text-lg pl-2">
						<Briefcase size={22} strokeWidth={2.5} /> Товары и услуги
					</h3>

					<div className="space-y-5">
						{items.map((item, index) => (
							<div key={item.id} className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 relative">

								<div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100">
									{/* 🛠 ПУНКТ 4a: Слово "Товар" вместо "Позиция" */}
									<div className="bg-gradient-eco text-white px-4 py-1.5 rounded-full text-sm font-black flex items-center gap-2 shadow-sm">
										<Package size={16} /> Товар {index + 1}
									</div>
									{items.length > 1 && (
										<button type="button" onClick={() => removeItem(item.id)} className="text-slate-400 hover:text-red-500 flex items-center gap-1.5 text-xs font-bold transition-colors bg-slate-50 px-3 py-1.5 rounded-lg">
											<Trash2 size={14} /> Убрать
										</button>
									)}
								</div>

								<div className="space-y-4">
									<div>
										<Label>Тип продукции *</Label>
										<div className="flex gap-2">
											<Input className="flex-1" value={item.name} onChange={e => updateItem(item.id, 'name', e.target.value)} placeholder="Бумажные пакеты / Визитки..." required />
											<Button type="button" variant={activeProductDropdown === item.id ? "primary" : "outline"} onClick={() => setActiveProductDropdown(activeProductDropdown === item.id ? null : item.id)} className="shrink-0" icon={<LayoutList size={16} />}>Выбрать из списка</Button>
										</div>
										{activeProductDropdown === item.id && (
											<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl max-h-48 overflow-y-auto">
												{products.map(p => (
													<button key={p.id} type="button" onClick={() => { updateItem(item.id, 'name', p.name); setActiveProductDropdown(null); }} className="flex items-center gap-2 p-2 bg-white border border-slate-100 rounded-lg hover:border-primary hover:text-primary hover:shadow-sm text-sm font-medium text-left transition-all">
														<i className={`${p.icon} text-slate-400 group-hover:text-primary`}></i> {p.name}
													</button>
												))}
											</div>
										)}
									</div>

									<div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
										<div className="col-span-1">
											<Label>Количество *</Label>
											<Input type="number" min="1" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', e.target.value)} required />
										</div>

										{/* 🛠 ПУНКТ 4b: Поле "Создатель" вместо "Исполнитель" (Заблокировано) */}
										<div className="col-span-1">
											<Label>Создатель</Label>
											<div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-500 flex items-center gap-2 cursor-not-allowed">
												<User size={16} />
												{/* Если заказ старый, показываем кто его создал, иначе имя текущего пользователя */}
												<span className="truncate">{item.responsible_user?.first_name || item.responsible_user?.username || currentUser?.first_name || currentUser?.username || 'Сотрудник'}</span>
											</div>
										</div>

										<div className="col-span-1">
											<Label>Срок сдачи *</Label>
											<Input type="date" value={item.deadline} onChange={e => updateItem(item.id, 'deadline', e.target.value)} required />
										</div>
										<div className="col-span-1">
											<Label>Статус товара</Label>
											<Select value={item.status} onChange={e => updateItem(item.id, 'status', e.target.value)} options={[
												{ value: 'not-ready', label: 'Не готов' }, { value: 'in-progress', label: 'В процессе' }, { value: 'ready', label: 'Готово' }
											]} />
										</div>
									</div>

									<div>
										<Label className="flex items-center gap-1.5 mt-2"><MessageSquare size={14} /> Комментарий / Заметка</Label>
										<textarea className="w-full min-h-[80px] p-3 mt-1 rounded-xl border-2 border-slate-100 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none resize-y text-sm font-medium bg-slate-50 focus:bg-white transition-all" placeholder="Добавьте особенности или пожелания клиента..." value={item.comment || ''} onChange={(e) => updateItem(item.id, 'comment', e.target.value)} />
									</div>
								</div>
							</div>
						))}
					</div>

					<Button type="button" variant="outline" icon={<Plus size={18} />} className="w-full mt-4 border-dashed border-slate-300 bg-slate-50 hover:bg-white text-slate-600 hover:text-primary" onClick={addItem}>Добавить товары в заказ</Button>
				</div>

				{/* 🛠 ПУНКТ 4c: История Изменений (РАСКЛАДНАЯ) */}
				{initialData && initialData.history && initialData.history.length > 0 && (
					<div className="mx-1 mt-8 mb-4 bg-slate-50/50 rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
						<button
							type="button"
							onClick={() => setIsHistoryOpen(!isHistoryOpen)}
							className="w-full flex items-center justify-between p-4 hover:bg-slate-100 transition-colors"
						>
							<div className="flex items-center gap-2 text-slate-700 font-black text-sm uppercase tracking-wider">
								<History size={18} className="text-slate-500" /> История изменений ({initialData.history.length})
							</div>
							<ChevronDown
								size={20}
								className={`text-slate-400 transition-transform duration-300 ${isHistoryOpen ? 'rotate-180' : ''}`}
							/>
						</button>

						{isHistoryOpen && (
							<div className="p-5 border-t border-slate-200 bg-slate-50/30">
								<div className="pl-4 border-l-2 border-slate-200 space-y-5">
									{initialData.history.map((entry: any, idx: number) => (
										<div key={idx} className="relative">
											<div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-slate-300 border-[3px] border-slate-50 shadow-sm"></div>
											<p className="text-xs text-slate-400 font-bold mb-1">
												{formatDate(entry.created_at_formatted || entry.created_at)} • <span className="text-primary">{entry.user_name || 'Система'}</span>
											</p>
											<p className="text-sm text-slate-700 font-medium bg-white p-3 rounded-xl border border-slate-200 shadow-sm inline-block">
												{entry.message}
											</p>
										</div>
									))}
								</div>
							</div>
						)}
					</div>
				)}

				<div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50 -mx-6 -mb-6 p-6 rounded-b-[2rem]">
					<div className="flex gap-4 text-sm font-bold text-slate-500 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
						<span className="flex items-center gap-1.5"><Package size={16} /> Товаров: <strong className="text-slate-800">{items.length}</strong></span>
						<span className="flex items-center gap-1.5 text-emerald-600"><CheckCircle2 size={16} /> Готово: <strong>{readyCount}</strong></span>
					</div>

					<div className="flex w-full sm:w-auto gap-3">
						<Button type="button" variant="ghost" onClick={onClose} className="w-full sm:w-auto bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 shadow-sm">Отмена</Button>
						<Button type="submit" variant="primary" icon={<Save size={18} />} className="w-full sm:w-auto shadow-md">Сохранить заказ</Button>
					</div>
				</div>

			</form>
		</BaseModal>
	);
}