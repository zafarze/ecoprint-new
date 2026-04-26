// src/settings/UserManagement.tsx — точ-в-точ user_list.html
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api/api';
import UserModal from '../modals/UserModal';
import ConfirmDeleteModal from '../modals/ConfirmDeleteModal';

const ROLE_BADGE: Record<string, { cls: string; label: string }> = {
	superadmin: { cls: 'status-ready', label: 'Админ' },
	manager: { cls: 'status-in-progress', label: 'Менеджер' },
	worker: { cls: 'status-not-ready', label: 'Работник' },
};

export default function UserManagement() {
	const [users, setUsers] = useState<any[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingUser, setEditingUser] = useState<any>(null);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [userToDelete, setUserToDelete] = useState<any>(null);

	const meStr = localStorage.getItem('user');
	const me = meStr && meStr !== 'undefined' ? JSON.parse(meStr) : null;

	const loadUsers = async () => {
		setIsLoading(true);
		try {
			const res = await api.get('users/');
			setUsers(res.data || []);
		} catch (err) {
			console.error(err);
			toast.error('Не удалось загрузить сотрудников');
		} finally { setIsLoading(false); }
	};
	useEffect(() => { loadUsers(); }, []);

	const handleSaveUser = async (data: any) => {
		try {
			if (editingUser) {
				await api.put(`users/${editingUser.id}/`, data);
				toast.success('Пользователь обновлён');
			} else {
				await api.post('users/', data);
				toast.success('Сотрудник создан! Стартовый пароль: 123456', { duration: 5000 });
			}
			setIsModalOpen(false);
			loadUsers();
		} catch (e: any) {
			const msg = e.response?.data?.username ? 'Такой логин уже существует' : 'Ошибка сохранения';
			toast.error(msg);
		}
	};

	const confirmDelete = async () => {
		if (!userToDelete) return;
		try {
			await api.delete(`users/${userToDelete.id}/`);
			toast.success('Сотрудник удалён');
			loadUsers();
		} catch { toast.error('Ошибка при удалении'); }
		finally { setIsDeleteModalOpen(false); setUserToDelete(null); }
	};

	return (
		<div className="container">
			<div className="main-content">

				<div className="filters-card" style={{ marginBottom: 20 }}>
					<div className="filters-header">
						<div className="filters-header-title">
							<i className="fas fa-users-cog"></i>
							<span> Список пользователей</span>
						</div>
						<button className="btn btn-content" onClick={() => { setEditingUser(null); setIsModalOpen(true); }}>
							<i className="fas fa-user-plus"></i> Создать пользователя
						</button>
					</div>
				</div>

				<div className="table-card">
					<table id="userTable">
						<thead>
							<tr>
								<th>Логин (username)</th>
								<th>ФИО</th>
								<th>Email</th>
								<th>Статус</th>
								<th>Действия</th>
							</tr>
						</thead>
						<tbody id="userTableBody">
							{isLoading && (
								<tr><td colSpan={5} style={{ textAlign: 'center', padding: 30, color: '#6c757d' }}>Загрузка...</td></tr>
							)}
							{!isLoading && users.map(u => {
								const badge = ROLE_BADGE[u.role] || ROLE_BADGE.worker;
								const isMe = me?.id === u.id;
								return (
									<tr key={u.id}>
										<td><strong>{u.username}</strong></td>
										<td>{u.first_name} {u.last_name}</td>
										<td>{u.email || '—'}</td>
										<td><span className={`status-badge ${badge.cls}`}>{badge.label}</span></td>
										<td>
											<div className="actions">
												<button className="icon-btn" title="Редактировать" onClick={() => { setEditingUser(u); setIsModalOpen(true); }}>
													<i className="fas fa-edit"></i>
												</button>
												{!isMe && (
													<button className="icon-btn delete" title="Удалить" onClick={() => { setUserToDelete(u); setIsDeleteModalOpen(true); }}>
														<i className="fas fa-trash"></i>
													</button>
												)}
											</div>
										</td>
									</tr>
								);
							})}
							{!isLoading && users.length === 0 && (
								<tr><td colSpan={5} style={{ textAlign: 'center', padding: 30, color: '#6c757d' }}>Нет пользователей</td></tr>
							)}
						</tbody>
					</table>
				</div>
			</div>

			<UserModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveUser} initialData={editingUser} />
			<ConfirmDeleteModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={confirmDelete} title="Удаление пользователя" itemName={userToDelete?.username || ''} />
		</div>
	);
}
