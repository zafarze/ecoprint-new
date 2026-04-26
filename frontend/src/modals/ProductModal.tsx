// src/modals/ProductModal.tsx — стиль legacy .modal
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
import React, { useEffect, useState } from 'react';

interface ProductModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSave: (productData: any) => void;
	initialData?: any;
}

export default function ProductModal({ isOpen, onClose, onSave, initialData }: ProductModalProps) {
	const [name, setName] = useState('');
	const [category, setCategory] = useState('polygraphy');
	const [icon, setIcon] = useState('fas fa-box');

	useEffect(() => {
		if (!isOpen) return;
		if (initialData) {
			setName(initialData.name || '');
			setCategory(initialData.category || 'polygraphy');
			setIcon(initialData.icon || 'fas fa-box');
		} else {
			setName(''); setCategory('polygraphy'); setIcon('fas fa-box');
		}
	}, [initialData, isOpen]);

	if (!isOpen) return null;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onSave({ name, category, icon });
	};

	return (
		<div className="modal active" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
			<div className="modal-content" style={{ maxWidth: 600 }}>
				<div className="modal-header">
					<div className="modal-header-content">
						<div>
							<h2>{initialData ? 'Редактировать товар' : 'Новый товар'}</h2>
							<div className="modal-header-subtitle">Карточка ассортимента</div>
						</div>
						<button className="close-btn" type="button" onClick={onClose}>&times;</button>
					</div>
				</div>

				<div className="modal-body">
					<form onSubmit={handleSubmit}>
						<div className="form-section">
							<div className="form-group">
								<label>Название товара *</label>
								<input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Например: Визитки 4+4" />
							</div>
							<div className="form-group">
								<label>Категория *</label>
								<div className="custom-select">
									<select value={category} onChange={e => setCategory(e.target.value)}>
										<option value="polygraphy">Полиграфия</option>
										<option value="packaging">Упаковка</option>
										<option value="souvenirs">Сувениры</option>
										<option value="large-format">Широкоформатная печать</option>
									</select>
								</div>
							</div>
							<div className="form-group">
								<label>Иконка (FontAwesome)</label>
								<input type="text" value={icon} onChange={e => setIcon(e.target.value)} placeholder="Например: fas fa-print" />
								<div style={{ marginTop: 8, fontSize: 13, color: '#6b7280' }}>
									Превью: <i className={icon} style={{ marginLeft: 8, fontSize: 18 }}></i>
								</div>
							</div>
						</div>
					</form>
				</div>

				<div className="modal-footer">
					<div className="order-summary"></div>
					<div className="form-actions">
						<button type="button" className="btn-cancel" onClick={onClose}>
							<i className="fas fa-times"></i>Отмена
						</button>
						<button type="button" className="btn-save" onClick={handleSubmit as any}>
							<i className="fas fa-save"></i>Сохранить
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
