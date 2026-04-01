import { useState, useEffect } from 'react';
import { UserPlus, Edit2, Trash2, Users, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/api';
import Card from '../components/ui/Card';
import UserModal from '../modals/UserModal';
import ConfirmDeleteModal from '../modals/ConfirmDeleteModal';

const ROLE_LABELS: Record<string, string> = {
	superadmin: 'Супер Админ',
	manager: 'Менеджер',
	worker: 'Работник',
};

export default function UserManagement() {
	const [users, setUsers] = useState<any[]>([]);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingUser, setEditingUser] = useState<any>(null);

	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [userToDelete, setUserToDelete] = useState<any>(null);

	const loadUsers = async () => {
		try {
			const res = await api.get('/users/');
			setUsers(res.data);
		} catch (err) {
			console.error("Ошибка загрузки пользователей:", err);
			toast.error("Не удалось загрузить сотрудников");
		}
	};

	useEffect(() => { loadUsers(); }, []);

	const handleOpenModal = (user = null) => {
		setEditingUser(user);
		setIsModalOpen(true);
	};

	const handleSaveUser = async (userData: any) => {
		try {
			if (editingUser) {
				await api.put(`/users/${editingUser.id}/`, userData);
				toast.success('Пользователь успешно обновлен!');
			} else {
				await api.post('/users/', userData);
				toast.success('Сотрудник создан! Стартовый пароль: 123456', { duration: 5000 });
			}
			setIsModalOpen(false);
			loadUsers();
		} catch (error: any) {
			console.error(error);
			const errorMsg = error.response?.data?.username ? 'Такой логин уже существует' : 'Ошибка сохранения данных';
			toast.error(errorMsg);
		}
	};

	const handleDeleteClick = (user: any) => {
		setUserToDelete(user);
		setIsDeleteModalOpen(true);
	};

	const confirmDelete = async () => {
		if (!userToDelete) return;
		try {
			await api.delete(`/users/${userToDelete.id}/`);
			toast.success('Доступ сотрудника закрыт (отключен)');
			loadUsers();
		} catch (error) {
			console.error(error);
			toast.error('Ошибка при удалении');
		} finally {
			setIsDeleteModalOpen(false);
			setUserToDelete(null);
		}
	};

	return (
		<div className="max-w-5xl animate-in fade-in slide-in-from-bottom-4">
			<div className="flex items-center justify-between mb-6">
				<h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
					<Users className="text-purple-500" size={28} strokeWidth={2.5} />
					Сотрудники
				</h2>
				<button onClick={() => handleOpenModal()} className="bg-gradient-eco text-white px-5 py-2.5 rounded-xl font-bold shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-2">
					<UserPlus size={18} /> Добавить
				</button>
			</div>

			<Card noPadding>
				<div className="overflow-x-auto">
					<table className="w-full text-sm text-left">
						<thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100 uppercase text-xs">
							<tr>
								<th className="px-6 py-4 rounded-tl-3xl">Сотрудник</th>
								<th className="px-6 py-4">Логин</th>
								<th className="px-6 py-4">Email</th>
								<th className="px-6 py-4 text-center">Роль</th>
								<th className="px-6 py-4 text-right rounded-tr-3xl">Действия</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100">
							{users.map(u => (
								<tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
									<td className="px-6 py-4">
										<div className="flex items-center gap-3">
											<div className="w-10 h-10 rounded-full bg-gradient-eco flex items-center justify-center text-white font-black text-sm shadow-sm">
												{(u.first_name?.[0] || u.username[0]).toUpperCase()}
											</div>
											<div>
												<p className="font-bold text-slate-800">{u.first_name} {u.last_name}</p>
											</div>
										</div>
									</td>
									<td className="px-6 py-4 font-mono text-xs font-bold text-slate-500">@{u.username}</td>
									<td className="px-6 py-4 font-bold text-slate-600">{u.email || '—'}</td>
									<td className="px-6 py-4 text-center">
										<span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 border border-slate-200 inline-flex items-center gap-1">
											<ShieldAlert size={12} /> {ROLE_LABELS[u.role] || 'Работник'}
										</span>
									</td>
									<td className="px-6 py-4 text-right">
										<div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
											<button onClick={() => handleOpenModal(u)} className="p-2 text-slate-400 hover:text-primary bg-white hover:border-primary border border-slate-200 rounded-xl shadow-sm transition-all">
												<Edit2 size={16} />
											</button>
											<button onClick={() => handleDeleteClick(u)} className="p-2 text-slate-400 hover:text-red-500 bg-white hover:border-red-500 border border-slate-200 rounded-xl shadow-sm transition-all">
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

			<UserModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveUser} initialData={editingUser} />
			<ConfirmDeleteModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={confirmDelete} title="Деактивировать сотрудника?" itemName={userToDelete?.username || ''} />
		</div>
	);
}