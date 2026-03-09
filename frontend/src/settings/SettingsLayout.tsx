import { Outlet, useLocation, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import SettingsPage from '../pages/SettingsPage';

export default function SettingsLayout() {
	const location = useLocation();
	const isRootSettings = location.pathname === '/settings' || location.pathname === '/settings/';

	return (
		<div className="w-full max-w-5xl mx-auto">
			{/* Кнопка "Назад" плавно появляется, если мы внутри подраздела */}
			{!isRootSettings && (
				<div className="mb-6 animate-in fade-in slide-in-from-left-4">
					<Link
						to="/settings"
						className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-primary bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all active:scale-95"
					>
						<ArrowLeft size={16} strokeWidth={2.5} /> Назад к настройкам
					</Link>
				</div>
			)}

			{/* Роутинг */}
			{isRootSettings ? <SettingsPage /> : <Outlet />}
		</div>
	);
}