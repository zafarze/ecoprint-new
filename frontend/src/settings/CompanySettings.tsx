import { useState, useEffect } from 'react';
import { Building2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Input, Label } from '../components/ui/Form';

export default function CompanySettings() {
	const [companyName, setCompanyName] = useState('');
	const [address, setAddress] = useState('');
	const [phone, setPhone] = useState('');
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);

	// Загружаем настройки при открытии страницы
	useEffect(() => {
		const fetchSettings = async () => {
			const token = localStorage.getItem('token');
			try {
				// ИЗМЕНЕНО: Используем переменную окружения
				const res = await fetch(`${import.meta.env.VITE_API_URL}/api/settings/company/`, {
					headers: { 'Authorization': `Bearer ${token}` }
				});
				if (res.ok) {
					const data = await res.json();
					setCompanyName(data.company_name || '');
					setAddress(data.address || '');
					setPhone(data.phone || '');
				}
			} catch (error) {
				console.error('Ошибка загрузки данных компании:', error);
			} finally {
				setIsLoading(false);
			}
		};
		fetchSettings();
	}, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSaving(true);
		const token = localStorage.getItem('token');

		try {
			// ИЗМЕНЕНО: Используем переменную окружения
			const res = await fetch(`${import.meta.env.VITE_API_URL}/api/settings/company/`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token}`
				},
				body: JSON.stringify({
					company_name: companyName,
					address: address,
					phone: phone
				})
			});

			if (res.ok) {
				toast.success("Данные компании успешно сохранены!");
			} else {
				toast.error("Ошибка при сохранении данных.");
			}
		} catch (error) {
			toast.error("Ошибка соединения с сервером.");
		} finally {
			setIsSaving(false);
		}
	};

	if (isLoading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>;

	return (
		<div className="max-w-2xl animate-in fade-in slide-in-from-bottom-4">
			<h2 className="text-2xl font-black text-slate-800 flex items-center gap-3 mb-6">
				<Building2 className="text-emerald-500" size={28} strokeWidth={2.5} />
				Профиль компании
			</h2>

			<Card>
				<form onSubmit={handleSubmit} className="space-y-5">
					<div>
						<Label>Название компании</Label>
						<Input
							value={companyName}
							onChange={e => setCompanyName(e.target.value)}
							placeholder="Например: ООО ЭкоПринт"
						/>
					</div>

					<div>
						<Label>Юридический / Фактический адрес</Label>
						<Input
							value={address}
							onChange={e => setAddress(e.target.value)}
							placeholder="Полный адрес"
						/>
					</div>

					<div>
						<Label>Контактный телефон</Label>
						<Input
							value={phone}
							onChange={e => setPhone(e.target.value)}
							placeholder="+992 00 000 0000"
						/>
					</div>

					<div className="pt-4 flex justify-end">
						<Button type="submit" isLoading={isSaving}>Сохранить изменения</Button>
					</div>
				</form>
			</Card>
		</div>
	);
}