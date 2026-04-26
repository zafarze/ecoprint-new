// src/modals/UserModal.tsx — стиль legacy .modal
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
import React, { useEffect, useState } from 'react';

interface UserModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSave: (userData: any) => void;
	initialData?: any;
}

export default function UserModal({ isOpen, onClose, onSave, initialData }: UserModalProps) {
	const [username, setUsername] = useState('');
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [email, setEmail] = useState('');
	const [role, setRole] = useState('worker');
	const [password, setPassword] = useState('');

	useEffect(() => {
		if (!isOpen) return;
		if (initialData) {
			setUsername(initialData.username || '');
			setFirstName(initialData.first_name || '');
			setLastName(initialData.last_name || '');
			setEmail(initialData.email || '');
			setRole(initialData.role || 'worker');
			setPassword('');
		} else {
			setUsername(''); setFirstName(''); setLastName('');
			setEmail(''); setRole('worker'); setPassword('');
		}
	}, [initialData, isOpen]);

	if (!isOpen) return null;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const data: any = { username, first_name: firstName, last_name: lastName, email, role };
		if (password) data.password = password;
		onSave(data);
	};

	return (
		<div className="modal active" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
			<div className="modal-content" style={{ maxWidth: 600 }}>
				<div className="modal-header">
					<div className="modal-header-content">
						<div>
							<h2>{initialData ? 'Редактировать сотрудника' : 'Новый сотрудник'}</h2>
							<div className="modal-header-subtitle">Учётная запись и доступ</div>
						</div>
						<button className="close-btn" type="button" onClick={onClose}>&times;</button>
					</div>
				</div>

				<div className="modal-body">
					<form onSubmit={handleSubmit}>
						<div className="form-section">
							<div className="form-group">
								<label>Логин (Username) *</label>
								<input type="text" required value={username} onChange={e => setUsername(e.target.value)} placeholder="Например: ivan_manager" />
							</div>
							<div className="form-group">
								<label>{initialData ? 'Новый пароль' : 'Пароль'}</label>
								<input
									type="password"
									value={password}
									onChange={e => setPassword(e.target.value)}
									placeholder={initialData ? 'Оставьте пустым, если не хотите менять' : 'Если пусто, пароль будет 123456'}
								/>
							</div>
							<div className="form-grid-2">
								<div className="form-group">
									<label>Имя</label>
									<input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Иван" />
								</div>
								<div className="form-group">
									<label>Фамилия</label>
									<input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Иванов" />
								</div>
							</div>
							<div className="form-group">
								<label>Email</label>
								<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ivan@ecoprint.tj" />
							</div>
							<div className="form-group">
								<label>Роль в системе *</label>
								<div className="custom-select">
									<select value={role} onChange={e => setRole(e.target.value)} required>
										<option value="worker">Работник (Только Главная)</option>
										<option value="manager">Менеджер (Главная, Товары, Архив)</option>
										<option value="superadmin">Супер Админ (Полный доступ)</option>
									</select>
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
