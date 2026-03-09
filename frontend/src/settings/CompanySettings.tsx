import { useState } from 'react';
import { Building2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Input, Label } from '../components/ui/Form';

export default function CompanySettings() {
	const [companyName, setCompanyName] = useState('EcoPrint');
	const [address, setAddress] = useState('г. Душанбе, ул. Примерная 123');
	const [phone, setPhone] = useState('+992 00 000 0000');

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		console.log("Сохранение данных компании...", { companyName, address, phone });

		// Красивое всплывающее уведомление вместо старого alert!
		toast.success("Данные компании успешно сохранены!");
	};

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
							placeholder="+992 XX XXX XXXX"
						/>
					</div>

					<div className="pt-6 mt-6 border-t border-slate-100 flex justify-end">
						<Button type="submit" icon={<Save size={18} />}>
							Сохранить изменения
						</Button>
					</div>
				</form>
			</Card>
		</div>
	);
}