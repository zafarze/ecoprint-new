import { useState } from 'react';
import { Send, Save, MessageSquare } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Input, Label } from '../components/ui/Form';

export default function IntegrationsSettings() {
	const [botToken, setBotToken] = useState('');
	const [chatId, setChatId] = useState('');

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		alert("Интеграция с Telegram сохранена!");
	};

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
							placeholder="Например: 123456789"
						/>
						<p className="text-xs font-bold text-slate-400 mt-2 flex items-center gap-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
							<MessageSquare size={14} className="text-primary" />
							Чтобы узнать свой Chat ID, напишите @userinfobot в Telegram.
						</p>
					</div>

					<div className="pt-6 mt-6 border-t border-slate-100 flex justify-end">
						<Button type="submit" icon={<Save size={18} />}>
							Сохранить интеграцию
						</Button>
					</div>
				</form>
			</Card>
		</div>
	);
}