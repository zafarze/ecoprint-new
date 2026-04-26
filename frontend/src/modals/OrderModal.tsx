// src/modals/OrderModal.tsx — точ-в-точ дизайн EcoPrint_old (index.html #orderModal)
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/api';

interface OrderModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSave: (orderData: any) => void;
	initialData?: any;
}

const todayStr = () => new Date().toISOString().split('T')[0];

const newItem = (currentUserId?: number | string) => ({
	id: Date.now() + Math.random(),
	name: '',
	quantity: 1,
	deadline: todayStr(),
	status: 'not-ready',
	comment: '',
	responsible_user_id: currentUserId || '',
	responsible_user: undefined as any,
});

export default function OrderModal({ isOpen, onClose, onSave, initialData }: OrderModalProps) {
	const userStr = localStorage.getItem('user');
	const currentUser = userStr && userStr !== 'undefined' ? JSON.parse(userStr) : null;

	const [client, setClient] = useState('');
	const [clientPhone, setClientPhone] = useState('');
	const [items, setItems] = useState<any[]>([newItem(currentUser?.id)]);
	const [products, setProducts] = useState<any[]>([]);
	const [users, setUsers] = useState<any[]>([]);
	const [openSuggestionsFor, setOpenSuggestionsFor] = useState<number | string | null>(null);
	const [isHistoryOpen, setIsHistoryOpen] = useState(false);

	useEffect(() => {
		if (!isOpen) return;
		(async () => {
			try {
				const [pRes, uRes] = await Promise.all([api.get('products/'), api.get('users/')]);
				setProducts(pRes.data || []);
				setUsers(uRes.data || []);
			} catch (e) { console.error('Загрузка справочников:', e); }
		})();
	}, [isOpen]);

	useEffect(() => {
		if (!isOpen) return;
		if (initialData) {
			setClient(initialData.client || '');
			setClientPhone(initialData.client_phone || '');
			setItems((initialData.items?.length ? initialData.items : [newItem(currentUser?.id)]).map((i: any) => ({
				...i,
				responsible_user_id: i.responsible_user?.id || currentUser?.id || '',
			})));
		} else {
			setClient(''); setClientPhone('');
			setItems([newItem(currentUser?.id)]);
		}
		setIsHistoryOpen(false);
		setOpenSuggestionsFor(null);
	}, [initialData, isOpen]);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen) onClose(); };
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [isOpen, onClose]);

	const addItem = () => setItems(prev => [...prev, newItem(currentUser?.id)]);
	const removeItem = (id: number | string) => setItems(prev => prev.length > 1 ? prev.filter(i => i.id !== id) : prev);
	const updateItem = (id: number | string, field: string, value: any) =>
		setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));

	const readyCount = useMemo(() => items.filter(i => i.status === 'ready').length, [items]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!client.trim()) { alert('Укажите клиента'); return; }
		if (items.some(i => !i.name.trim() || !i.deadline)) { alert('Заполните все обязательные поля (*)'); return; }

		const cleanedItems = items.map(item => {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { id, responsible_user, ...rest } = item;
			return typeof id === 'number' && id < 1000000000000 ? { id, ...rest } : rest;
		});
		onSave({ client, client_phone: clientPhone, items_write: cleanedItems });
	};

	if (!isOpen) return null;

	return (
		<div className="modal active" id="orderModal" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
			<div className="modal-content">

				<div className="modal-header">
					<div className="modal-header-content">
						<div>
							<h2 id="modalTitle">{initialData ? 'Редактировать заказ' : 'Новый заказ'}</h2>
							<div className="modal-header-subtitle">Заполните информацию о заказе</div>
						</div>
						<button className="close-btn" id="closeModalBtn" type="button" onClick={onClose}>&times;</button>
					</div>
				</div>

				<div className="modal-body">
					<form id="orderForm" onSubmit={handleSubmit}>

						<div className="form-section">
							<div className="form-section-header">
								<div className="form-section-icon"><i className="fas fa-user"></i></div>
								<div>
									<div className="form-section-title">Информация о заказе</div>
									<div className="form-section-subtitle">Укажите данные заказчика</div>
								</div>
							</div>

							<div className="form-group">
								<label htmlFor="clientName">Имя клиента *</label>
								<input
									type="text" id="clientName" placeholder="Введите имя клиента"
									required value={client} onChange={e => setClient(e.target.value)}
								/>
							</div>
							<div className="form-group">
								<label htmlFor="clientPhone">Телефон</label>
								<input
									type="tel" id="clientPhone" placeholder="+992 00 000 0000"
									value={clientPhone} onChange={e => setClientPhone(e.target.value)}
								/>
							</div>
						</div>

						<div className="form-section">
							<div className="form-section-header">
								<div className="form-section-icon"><i className="fas fa-box"></i></div>
								<div>
									<div className="form-section-title">Товары и услуги</div>
									<div className="form-section-subtitle">Добавьте товары в заказ</div>
								</div>
							</div>

							<div className="items-form-container" id="itemsFormContainer">
								{items.map((item, idx) => (
									<div className="item-form-card" key={item.id}>
										<div className="item-form-header">
											<span className="item-number-badge">
												<i className="fas fa-cube"></i>
												Товар <span className="item-number">{idx + 1}</span>
											</span>
											{items.length > 1 && (
												<button type="button" className="remove-item-btn" onClick={() => removeItem(item.id)} title="Удалить">
													<i className="fas fa-times"></i>
												</button>
											)}
										</div>

										<div className="product-type-section">
											<div className="product-type-label">Тип продукции *</div>
											<div className="product-input-group">
												<input
													type="text"
													className="product-name-input"
													placeholder="Введите название или выберите из списка"
													required
													value={item.name}
													onChange={e => updateItem(item.id, 'name', e.target.value)}
												/>
												<button
													type="button"
													className="product-type-btn"
													onClick={() => setOpenSuggestionsFor(openSuggestionsFor === item.id ? null : item.id)}
												>
													<i className={`fas ${openSuggestionsFor === item.id ? 'fa-times' : 'fa-list'}`}></i>
													{openSuggestionsFor === item.id ? ' Скрыть список' : ' Выбрать из списка'}
												</button>
											</div>
											{openSuggestionsFor === item.id && (
												<div className="product-suggestions" style={{ display: 'grid' }}>
													{products.map(p => (
														<div
															key={p.id}
															className="product-suggestion"
															onClick={() => { updateItem(item.id, 'name', p.name); setOpenSuggestionsFor(null); }}
														>
															<i className={p.icon || 'fas fa-box'}></i>
															<span>{p.name}</span>
														</div>
													))}
												</div>
											)}
										</div>

										<div className="item-form-grid-3">
											<div className="form-group">
												<label>Количество *</label>
												<input
													type="number" className="item-quantity" min={1} required
													value={item.quantity}
													onChange={e => updateItem(item.id, 'quantity', e.target.value)}
												/>
											</div>
											<div className="form-group">
												<label>Создатель</label>
												<div className="custom-select" style={{ width: '100%' }}>
													<select
														className="item-responsible-user"
														value={item.responsible_user_id || ''}
														onChange={e => updateItem(item.id, 'responsible_user_id', e.target.value)}
														disabled
													>
														{users.length === 0 ? (
															<option value="">— Загрузка... —</option>
														) : (
															users.map(u => {
																const display = (u.first_name || u.last_name)
																	? `${u.first_name || ''} ${u.last_name || ''}`.trim()
																	: u.username;
																return <option key={u.id} value={u.id}>{display}</option>;
															})
														)}
													</select>
												</div>
											</div>
											<div className="form-group">
												<label>Срок сдачи *</label>
												<input
													type="date" className="item-deadline-input" required
													min={todayStr()}
													value={item.deadline}
													onChange={e => updateItem(item.id, 'deadline', e.target.value)}
												/>
											</div>
											<div className="form-group">
												<label>Статус товара</label>
												<div className="custom-select" style={{ width: '100%' }}>
													<select
														className="item-status-select"
														value={item.status}
														onChange={e => updateItem(item.id, 'status', e.target.value)}
													>
														<option value="not-ready">Не готов</option>
														<option value="in-progress">В процессе</option>
														<option value="ready">Готов</option>
													</select>
												</div>
											</div>
										</div>

										<div className="form-group" style={{ marginTop: 10 }}>
											<label>Комментарий / Заметка</label>
											<textarea
												className="item-comment"
												placeholder="Напр: матовая бумага, 300г/м², проверить макет..."
												value={item.comment || ''}
												onChange={e => updateItem(item.id, 'comment', e.target.value)}
											/>
										</div>
									</div>
								))}
							</div>

							<div className="add-item-section">
								<button type="button" className="add-item-btn" onClick={addItem}>
									<i className="fas fa-plus-circle"></i>
									Добавить еще товар
								</button>
							</div>
						</div>
					</form>
				</div>

				{/* История изменений */}
				<div className="history-section" style={{ marginTop: 10, borderTop: '1px solid #eee', padding: '15px 20px' }}>
					<h4
						style={{ fontSize: '0.9rem', color: '#666', marginBottom: 10, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
						onClick={() => setIsHistoryOpen(v => !v)}
					>
						<i className="fas fa-history" style={{ marginRight: 8 }}></i> История изменений
						<i
							className="fas fa-chevron-down"
							style={{ fontSize: '0.8em', marginLeft: 'auto', transition: 'transform 0.3s', transform: isHistoryOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
						></i>
					</h4>
					{isHistoryOpen && (
						<div
							id="historyContainer"
							style={{ display: 'block', maxHeight: 150, overflowY: 'auto', fontSize: '0.85rem', background: '#f9fafb', padding: 10, borderRadius: 6, border: '1px solid #e5e7eb' }}
						>
							{initialData?.history?.length ? (
								initialData.history.map((rec: any, i: number) => (
									<div key={i} style={{ marginBottom: 8, borderBottom: '1px solid #e0e0e0', paddingBottom: 4 }}>
										<div style={{ color: '#6b7280', fontSize: '0.75rem', marginBottom: 2 }}>
											<i className="far fa-clock"></i> {rec.created_at_formatted || rec.created_at} • <strong>{rec.user_name || 'Система'}</strong>
										</div>
										<div style={{ color: '#374151' }}>{rec.message}</div>
									</div>
								))
							) : (
								<div style={{ color: '#9ca3af', fontStyle: 'italic', textAlign: 'center' }}>
									{initialData ? 'История изменений пуста' : 'Новый заказ (история появится после сохранения)'}
								</div>
							)}
						</div>
					)}
				</div>

				<div className="modal-footer">
					<div className="order-summary">
						<div className="summary-item">
							<i className="fas fa-cube"></i>
							<span>Товаров: <strong id="itemsCount">{items.length}</strong></span>
						</div>
						<div className="summary-item">
							<i className="fas fa-check-circle"></i>
							<span>Готово: <strong id="readyCount">{readyCount}</strong></span>
						</div>
					</div>
					<div className="form-actions">
						<button type="button" className="btn-cancel" id="cancelBtn" onClick={onClose}>
							<i className="fas fa-times"></i>Отмена
						</button>
						<button type="button" className="btn-save" id="saveBtn" onClick={handleSubmit as any}>
							<i className="fas fa-save"></i>Сохранить заказ
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
