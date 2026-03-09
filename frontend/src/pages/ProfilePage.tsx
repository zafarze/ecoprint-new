import { useState, useEffect } from 'react';
import { UserCircle, Save, Camera } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Input, Label } from '../components/ui/Form';

export default function ProfilePage() {
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');

	// Достаем имя из localStorage (как ты делал в шапке)
	useEffect(() => {
		const userStr = localStorage.getItem('user');
		if (userStr) {
			const user = JSON.parse(userStr);
			setFirstName(user.first_name || user.username || 'Иван');
			setLastName(user.last_name || 'Иванов');
		}
	}, []);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		alert("Профиль сохранен!");
	};

	return (
		<div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">

			<div>
				<h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
					<UserCircle className="text-primary" size={32} strokeWidth={2.5} />
					Мой профиль
				</h1>
				<p className="text-sm font-bold text-slate-400 mt-1">Управление личными данными</p>
			</div>

			<Card>
				<form onSubmit={handleSubmit} className="space-y-6">

					{/* Аватарка */}
					<div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-100">
						<div className="relative group cursor-pointer">
							<div className="w-28 h-28 rounded-full bg-gradient-eco text-white flex items-center justify-center text-4xl font-black shadow-lg">
								{firstName.charAt(0).toUpperCase()}
							</div>
							{/* Затемнение при наведении */}
							<div className="absolute inset-0 bg-slate-900/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
								<Camera className="text-white" size={24} />
							</div>
						</div>
						<div className="text-center sm:text-left">
							<h3 className="text-lg font-black text-slate-800">Фото профиля</h3>
							<p className="text-sm font-bold text-slate-400 mb-3">PNG, JPG или GIF до 5 MB</p>
							<Button type="button" variant="outline" className="py-2 px-4 text-xs">
								Изменить фото
							</Button>
						</div>
					</div>

					{/* Поля формы */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
						<div>
							<Label>Имя</Label>
							<Input
								value={firstName}
								onChange={e => setFirstName(e.target.value)}
								placeholder="Ваше имя"
							/>
						</div>
						<div>
							<Label>Фамилия</Label>
							<Input
								value={lastName}
								onChange={e => setLastName(e.target.value)}
								placeholder="Ваша фамилия"
							/>
						</div>
					</div>

					<div className="pt-4 flex justify-end">
						<Button type="submit" icon={<Save size={18} />}>
							Сохранить изменения
						</Button>
					</div>

				</form>
			</Card>
		</div>
	);
}