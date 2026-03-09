import React, { useState, useEffect } from 'react';
import { Save, UserCircle } from 'lucide-react';
import BaseModal from '../components/ui/BaseModal';
import Button from '../components/ui/Button';
import { Input, Label } from '../components/ui/Form';

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

	useEffect(() => {
		if (initialData) {
			setUsername(initialData.username || '');
			setFirstName(initialData.first_name || '');
			setLastName(initialData.last_name || '');
			setEmail(initialData.email || '');
		} else {
			setUsername('');
			setFirstName('');
			setLastName('');
			setEmail('');
		}
	}, [initialData, isOpen]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onSave({ username, first_name: firstName, last_name: lastName, email });
	};

	return (
		<BaseModal
			isOpen={isOpen}
			onClose={onClose}
			title={initialData ? 'Редактировать сотрудника' : 'Новый сотрудник'}
			maxWidth="max-w-md"
		>
			<form onSubmit={handleSubmit} className="space-y-5">

				<div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl mb-4">
					<div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shadow-sm">
						<UserCircle size={24} />
					</div>
					<div>
						<p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Учетная запись</p>
						<p className="text-sm font-black text-slate-700">Данные для входа в систему</p>
					</div>
				</div>

				<div>
					<Label>Логин (Username) *</Label>
					<Input value={username} onChange={e => setUsername(e.target.value)} required placeholder="Например: ivan_manager" />
				</div>

				<div className="grid grid-cols-2 gap-4">
					<div>
						<Label>Имя</Label>
						<Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Иван" />
					</div>
					<div>
						<Label>Фамилия</Label>
						<Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Иванов" />
					</div>
				</div>

				<div>
					<Label>Email</Label>
					<Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ivan@ecoprint.tj" />
				</div>

				<div className="pt-4 flex gap-3">
					<Button type="button" variant="ghost" onClick={onClose} className="w-full">Отмена</Button>
					<Button type="submit" variant="primary" icon={<Save size={18} />} className="w-full">Сохранить</Button>
				</div>
			</form>
		</BaseModal>
	);
}