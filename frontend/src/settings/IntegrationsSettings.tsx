// src/settings/IntegrationsSettings.tsx — точ-в-точ integrations.html
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/api';

export default function IntegrationsSettings() {
	const [botToken, setBotToken] = useState('');
	const [chatId, setChatId] = useState('');
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [isTesting, setIsTesting] = useState(false);

	const handleTest = async () => {
		setIsTesting(true);
		const t = toast.loading('Отправляю тестовое сообщение...');
		try {
			const res = await api.post('settings/telegram/test/');
			if (res.data?.ok) toast.success('✅ Тестовое сообщение отправлено в Telegram!', { id: t });
			else toast.error(res.data?.error || 'Ошибка отправки', { id: t });
		} catch (err: unknown) {
			const e = err as { response?: { data?: { error?: string } } };
			toast.error(e.response?.data?.error || 'Ошибка сети', { id: t });
		} finally { setIsTesting(false); }
	};

	useEffect(() => {
		(async () => {
			try {
				const res = await api.get('settings/telegram/');
				setBotToken(res.data.bot_token || '');
				setChatId(res.data.chat_id || '');
			} catch (e) { console.error(e); }
			finally { setIsLoading(false); }
		})();
	}, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSaving(true);
		try {
			await api.put('settings/telegram/', { bot_token: botToken, chat_id: chatId });
			toast.success('Интеграция с Telegram сохранена!');
		} catch { toast.error('Ошибка при сохранении.'); }
		finally { setIsSaving(false); }
	};

	if (isLoading) return <div className="container"><div className="empty-state"><i className="fas fa-spinner fa-spin"></i><h3>Загрузка...</h3></div></div>;

	return (
		<div className="container">
			<div className="main-content">
				<form className="filters-card" style={{ margin: '20px 0' }} onSubmit={handleSubmit}>
					<div className="filters-header-title" style={{ marginBottom: 25 }}>
						<i className="fab fa-telegram-plane"></i>
						<span> Интеграция с Telegram</span>
					</div>

					<div className="form-group">
						<label>Token Telegram-бота:</label>
						<input type="password" value={botToken} onChange={e => setBotToken(e.target.value)} placeholder="123456789:ABCdefGHIjkl..." />
					</div>
					<div className="form-group">
						<label>Chat ID:</label>
						<input type="text" value={chatId} onChange={e => setChatId(e.target.value)} placeholder="Например: -100123456789" />
						<ul className="help-text">
							<li>Чтобы узнать свой Chat ID, напишите <strong>@userinfobot</strong> в Telegram, и он вам его пришлёт.</li>
						</ul>
					</div>

					<div className="form-actions" style={{ marginTop: 20, borderTop: '1px solid var(--border-color)', paddingTop: 20, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
						<button type="submit" className="btn btn-content" disabled={isSaving}>
							<i className="fas fa-save"></i> {isSaving ? 'Сохранение...' : 'Сохранить настройки'}
						</button>
						<button
							type="button"
							className="btn"
							onClick={handleTest}
							disabled={isTesting}
							style={{ background: '#3b82f6', color: 'white', border: 'none' }}
						>
							<i className="fab fa-telegram-plane"></i> {isTesting ? 'Отправка...' : 'Тестовое сообщение'}
						</button>
						<Link to="/settings" className="btn" style={{ background: 'white', color: 'var(--text-color)', border: '1px solid var(--border-color)' }}>
							Назад к настройкам
						</Link>
					</div>
				</form>
			</div>
		</div>
	);
}
