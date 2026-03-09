import { useState } from 'react';
import { BellRing, Save } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

export default function NotificationSettings() {
	const [soundEnabled, setSoundEnabled] = useState(true);
	const [popupEnabled, setPopupEnabled] = useState(true);
	const [dayBefore, setDayBefore] = useState(true);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		alert("Настройки уведомлений сохранены!");
	};

	// Компонент красивого переключателя (Toggle)
	const Toggle = ({ label, checked, onChange }: any) => (
		<div
			className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-slate-100/50 transition-colors cursor-pointer group"
			onClick={() => onChange(!checked)}
		>
			<span className="font-bold text-slate-700 group-hover:text-primary transition-colors">{label}</span>
			<div className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${checked ? 'bg-emerald-500' : 'bg-slate-300'}`}>
				<div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 shadow-sm ${checked ? 'translate-x-6' : 'translate-x-0'}`}></div>
			</div>
		</div>
	);

	return (
		<div className="max-w-2xl animate-in fade-in slide-in-from-bottom-4">
			<h2 className="text-2xl font-black text-slate-800 flex items-center gap-3 mb-6">
				<BellRing className="text-amber-500" size={28} strokeWidth={2.5} />
				Уведомления
			</h2>

			<Card>
				<form onSubmit={handleSubmit} className="space-y-3">
					<Toggle label="Звуковые уведомления" checked={soundEnabled} onChange={setSoundEnabled} />
					<Toggle label="Всплывающие окна" checked={popupEnabled} onChange={setPopupEnabled} />
					<Toggle label="Напоминание за день до дедлайна" checked={dayBefore} onChange={setDayBefore} />

					<div className="pt-6 mt-6 border-t border-slate-100 flex justify-end">
						<Button type="submit" icon={<Save size={18} />}>
							Сохранить настройки
						</Button>
					</div>
				</form>
			</Card>
		</div>
	);
}