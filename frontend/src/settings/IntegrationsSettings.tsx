import { useState, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Input, Label } from '../components/ui/Form';

export default function IntegrationsSettings() {
	const [botToken, setBotToken] = useState('');
	const [chatId, setChatId] = useState('');
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		const fetchSettings = async () => {
			const token = localStorage.getItem('token');
			try {
				// ИЗМЕНЕНО: Используем переменную окружения
				const res = await fetch(`${import.meta.env.VITE_API_URL}/api/settings/telegram/`, {
					headers: { 'Authorization': `Bearer ${token}` }
				});
				if (res.ok) {
					const data = await res.json();
					setBotToken(data.bot_token || '');
					setChatId(data.chat_id || '');
				}
			} catch (error) {
				console.error('Ошибка загрузки настроек Telegram:', error);
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
			const res = await fetch(`${import.meta.env.VITE_API_URL}/api/settings/telegram/`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token}`
				},
				body: JSON.stringify({ bot_token: botToken, chat_id: chatId })
			});

			if (res.ok) {
				toast.success("Интеграция с Telegram сохранена!");
			} else {
				toast.error("Ошибка при сохранении.");
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
				<Send className="text-blue-500" size={28} strokeWidth={2.5} />
				Интеграция с Telegram
			</h2>

			<Card>
				<form onSubmit={handleSubmit} className="space-y-5">
					<div>
						<Label>Token Telegram-бота</Label>
						<Input
							type="password"
							value={botToken}
							onChange={e => setBotToken(e.target.value)}
							placeholder="123456789:ABCdefGHIjkl..."
						/>
					</div>

					<div>
						<Label>Chat ID</Label>
						<Input
							type="text"
							value={chatId}
							onChange={e => setChatId(e.target.value)}
							placeholder="Например: -100123456789"
						/>
						<p className="text-xs font-bold text-slate-400 mt-2 flex items-center gap-1.5 border-l-2 border-slate-200 pl-3">
							ID группы, куда бот будет присылать уведомления о новых заказах.
						</p>
					</div>

					<div className="pt-4 flex justify-end">
						<Button type="submit" isLoading={isSaving}>Сохранить интеграцию</Button>
					</div>
				</form>
			</Card>
		</div>
	);
}