import { useState, useEffect } from 'react';
import { UserPlus, Edit2, Trash2, Users, ShieldAlert } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import UserModal from '../modals/UserModal';
import ConfirmDeleteModal from '../modals/ConfirmDeleteModal';

export default function UserManagement() {
	const [users, setUsers] = useState<any[]>([]);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingUser, setEditingUser] = useState<any>(null);

	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [userToDelete, setUserToDelete] = useState<any>(null);

	const loadUsers = () => {
		fetch('http://127.0.0.1:8000/api/users/')
			.then(res => res.json())
			.then(data => setUsers(data))
			.catch(err => console.error(err));
	};

	useEffect(() => { loadUsers(); }, []);

	const handleOpenModal = (user = null) => {
		setEditingUser(user);
		setIsModalOpen(true);
	};

	const handleSaveUser = async (userData: any) => {
		console.log("Сохранение пользователя:", userData);
		setIsModalOpen(false);
	};

	const handleDeleteClick = (user: any) => {
		setUserToDelete(user);
		setIsDeleteModalOpen(true);
	};

	const confirmDelete = () => {
		console.log("Удаляем:", userToDelete);
		setIsDeleteModalOpen(false);
	};

	return (
		<div className="max-w-4xl animate-in fade-in slide-in-from-bottom-4">

			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
				<h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
					<Users className="text-purple-500" size={28} strokeWidth={2.5} />
					Сотрудники
				</h2>
				<Button onClick={() => handleOpenModal()} icon={<UserPlus size={18} />}>
					Добавить
				</Button>
			</div>

			<Card noPadding className="overflow-hidden">
				<div className="overflow-x-auto custom-scrollbar">
					<table className="w-full text-left border-collapse">
						<thead>
							<tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 text-xs uppercase font-black tracking-wider">
								<th className="px-6 py-5">Пользователь</th>
								<th className="px-6 py-5">Email</th>
								<th className="px-6 py-5 text-center">Роль</th>
								<th className="px-6 py-5 text-right">Действия</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100">
							{users.map(u => (
								<tr key={u.id} className="hover:bg-slate-50 transition-colors group">
									<td className="px-6 py-4">
										<div className="flex items-center gap-3">
											<div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 text-purple-700 font-black flex items-center justify-center">
												{u.username.charAt(0).toUpperCase()}
											</div>
											<div>
												<div className="font-black text-slate-800">{u.username}</div>
												<div className="text-xs font-bold text-slate-400">{u.first_name} {u.last_name}</div>
											</div>
										</div>
									</td>
									<td className="px-6 py-4 font-bold text-slate-600">{u.email || '—'}</td>
									<td className="px-6 py-4 text-center">
										<span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 border border-slate-200 inline-flex items-center gap-1">
											<ShieldAlert size={12} /> Менеджер
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
			<ConfirmDeleteModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={confirmDelete} title="Удалить сотрудника?" itemName={userToDelete?.username} />
		</div>
	);
}