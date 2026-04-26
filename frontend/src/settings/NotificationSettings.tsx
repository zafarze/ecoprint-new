// src/settings/NotificationSettings.tsx — точ-в-точ notification_settings.html
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/api';

export default function NotificationSettings() {
	const [soundEnabled, setSoundEnabled] = useState(true);
	const [popupEnabled, setPopupEnabled] = useState(true);
	const [dayBefore, setDayBefore] = useState(true);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		(async () => {
			try {
				const res = await api.get('settings/notifications/');
				setSoundEnabled(!!res.data.sound_notifications);
				setPopupEnabled(!!res.data.popup_notifications);
				setDayBefore(!!res.data.day_before_notifications);
				localStorage.setItem('notify_settings', JSON.stringify({
					sound: res.data.sound_notifications,
					popup: res.data.popup_notifications,
				}));
			} catch (e) { console.error(e); }
			finally { setIsLoading(false); }
		})();
	}, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSaving(true);
		try {
			await api.post('settings/notifications/', {
				sound_notifications: soundEnabled,
				popup_notifications: popupEnabled,
				day_before_notifications: dayBefore,
			});
			localStorage.setItem('notify_settings', JSON.stringify({ sound: soundEnabled, popup: popupEnabled }));
			toast.success('Настройки уведомлений сохранены!');
		} catch { toast.error('Не удалось сохранить настройки'); }
		finally { setIsSaving(false); }
	};

	if (isLoading) return <div className="container"><div className="empty-state"><i className="fas fa-spinner fa-spin"></i><h3>Загрузка...</h3></div></div>;

	return (
		<div className="container">
			<div className="main-content">
				<form className="filters-card" style={{ margin: '20px 0' }} onSubmit={handleSubmit}>
					<div className="filters-header-title" style={{ marginBottom: 25 }}>
						<i className="fas fa-bell"></i>
						<span> Настройки уведомлений</span>
					</div>

					<div className="setting-item">
						<span className="setting-label">Звуковые уведомления</span>
						<label className="toggle-switch">
							<input type="checkbox" checked={soundEnabled} onChange={e => setSoundEnabled(e.target.checked)} />
							<span className="toggle-slider"></span>
						</label>
					</div>
					<div className="setting-item">
						<span className="setting-label">Всплывающие уведомления</span>
						<label className="toggle-switch">
							<input type="checkbox" checked={popupEnabled} onChange={e => setPopupEnabled(e.target.checked)} />
							<span className="toggle-slider"></span>
						</label>
					</div>
					<div className="setting-item">
						<span className="setting-label">Уведомления за день до срока</span>
						<label className="toggle-switch">
							<input type="checkbox" checked={dayBefore} onChange={e => setDayBefore(e.target.checked)} />
							<span className="toggle-slider"></span>
						</label>
					</div>

					<div className="form-actions" style={{ marginTop: 20, borderTop: '1px solid var(--border-color)', paddingTop: 20 }}>
						<button type="submit" className="btn btn-content" disabled={isSaving}>
							<i className="fas fa-save"></i> {isSaving ? 'Сохранение...' : 'Сохранить настройки'}
						</button>
						<Link to="/settings" className="btn" style={{ marginLeft: 15, background: 'white', color: 'var(--text-color)', border: '1px solid var(--border-color)' }}>
							Назад к настройкам
						</Link>
					</div>
				</form>
			</div>
		</div>
	);
}
