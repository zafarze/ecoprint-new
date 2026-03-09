import { Link } from 'react-router-dom';
import { Users, Bell, Building2, Plug } from 'lucide-react';

export default function SettingsPage() {
	// Конфиг наших разделов настроек
	const settingsCards = [
		{
			path: '/settings/users', icon: Users, color: 'bg-purple-100 text-purple-600',
			title: 'Пользователи', desc: 'Управление доступом и аккаунтами сотрудников.'
		},
		{
			path: '/settings/notifications', icon: Bell, color: 'bg-amber-100 text-amber-600',
			title: 'Уведомления', desc: 'Настройте звуковые и всплывающие оповещения.'
		},
		{
			path: '/settings/company', icon: Building2, color: 'bg-emerald-100 text-emerald-600',
			title: 'Данные компании', desc: 'Название, реквизиты, адреса и контакты.'
		},
		{
			path: '/settings/integrations', icon: Plug, color: 'bg-blue-100 text-blue-600',
			title: 'Интеграции', desc: 'Подключение Telegram-ботов и других сервисов.'
		}
	];

	return (
		<div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
			<div>
				<h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">Настройки</h1>
				<p className="text-sm font-bold text-slate-400 mt-1">Глобальные параметры системы EcoPrint</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
				{settingsCards.map((card, idx) => (
					<Link
						key={idx}
						to={card.path}
						className="group bg-white rounded-3xl p-6 border border-slate-100 shadow-eco-sm hover:shadow-eco-md hover:-translate-y-1 transition-all duration-300 flex items-start gap-5"
					>
						<div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${card.color}`}>
							<card.icon size={28} strokeWidth={2.5} />
						</div>
						<div>
							<h3 className="text-lg font-black text-slate-800 mb-1 group-hover:text-primary transition-colors">
								{card.title}
							</h3>
							<p className="text-sm font-bold text-slate-500 leading-relaxed">
								{card.desc}
							</p>
						</div>
					</Link>
				))}
			</div>
		</div>
	);
}