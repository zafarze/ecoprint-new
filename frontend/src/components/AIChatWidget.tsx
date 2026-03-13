import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Bot, User, Trash2 } from 'lucide-react';

// 🔥 Импортируем наш новый api
import api from '../api/api';

interface Message {
	id: number;
	text: string;
	sender: 'user' | 'bot';
}

const INITIAL_MESSAGE: Message = {
	id: 1,
	text: 'Привет! Я твой ИИ-помощник EcoPrint. Я вижу все заказы в базе. Спроси меня: **"Сколько заказов в работе?"** 🤖',
	sender: 'bot'
};

export default function AIChatWidget() {
	const [isOpen, setIsOpen] = useState(false);
	const [inputText, setInputText] = useState('');
	const [isTyping, setIsTyping] = useState(false);

	const [messages, setMessages] = useState<Message[]>(() => {
		const saved = localStorage.getItem('eco_ai_chat_history');
		if (saved) {
			try {
				return JSON.parse(saved);
			} catch (e) {
				console.error('Ошибка парсинга истории чата', e);
			}
		}
		return [INITIAL_MESSAGE];
	});

	const messagesEndRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		localStorage.setItem('eco_ai_chat_history', JSON.stringify(messages));
	}, [messages]);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages, isTyping, isOpen]);

	const sendMessage = async (e?: React.FormEvent) => {
		e?.preventDefault();
		if (!inputText.trim()) return;

		const userText = inputText.trim();

		// Сообщение пользователя
		const newUserMsg: Message = { id: Date.now(), text: userText, sender: 'user' };
		setMessages(prev => [...prev, newUserMsg]);
		setInputText('');
		setIsTyping(true);

		// 🔥 Обновленная отправка запроса через api.ts
		try {
			// Токен и базовый URL подставляются автоматически!
			const res = await api.post('ai-chat/', { message: userText });

			const newBotMsg: Message = {
				id: Date.now(),
				text: res.data.answer || 'Извините, я не понял ответ.',
				sender: 'bot'
			};
			setMessages(prev => [...prev, newBotMsg]);

		} catch (error: any) {
			// Обработка ошибок через axios
			const serverError = error.response?.data?.error || 'Что-то пошло не так на сервере 😔';
			const isNetworkError = !error.response; // Если нет ответа от сервера вообще

			const errorMsg: Message = {
				id: Date.now(),
				text: isNetworkError ? '**Сбой сети.** Проверьте подключение к серверу. 📡' : `**Ошибка:** ${serverError}`,
				sender: 'bot'
			};
			setMessages(prev => [...prev, errorMsg]);
		} finally {
			setIsTyping(false);
		}
	};

	const clearHistory = () => {
		setMessages([INITIAL_MESSAGE]);
		localStorage.removeItem('eco_ai_chat_history');
	};

	const renderMessageText = (text: string) => {
		const parts = text.split(/(\*\*.*?\*\*)/g);
		return parts.map((part, i) => {
			if (part.startsWith('**') && part.endsWith('**')) {
				return <strong key={i} className="font-black text-slate-800">{part.slice(2, -2)}</strong>;
			}
			return <React.Fragment key={i}>{part}</React.Fragment>;
		});
	};

	return (
		<div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
			<AnimatePresence>
				{isOpen && (
					<motion.div
						initial={{ opacity: 0, y: 20, scale: 0.95 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 20, scale: 0.95 }}
						transition={{ duration: 0.2 }}
						className="bg-white w-[340px] sm:w-[380px] h-[500px] rounded-[2rem] shadow-2xl border border-slate-100 flex flex-col overflow-hidden mb-4"
					>
						<div className="bg-gradient-eco p-4 text-white flex justify-between items-center shadow-md z-10">
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-inner">
									<Bot size={24} className="text-white" />
								</div>
								<div>
									<h3 className="font-black text-base leading-tight">EcoPrint AI</h3>
									<p className="text-xs text-white/80 font-bold flex items-center gap-1.5 mt-0.5">
										<span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
										В сети
									</p>
								</div>
							</div>
							<div className="flex items-center gap-1">
								<button
									onClick={clearHistory}
									className="p-2 bg-white/10 hover:bg-white/20 hover:text-red-200 rounded-xl transition-colors"
									title="Очистить историю"
								>
									<Trash2 size={18} />
								</button>
								<button
									onClick={() => setIsOpen(false)}
									className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
								>
									<X size={20} />
								</button>
							</div>
						</div>

						<div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50 custom-scrollbar">
							{messages.map((msg) => (
								<motion.div
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									key={msg.id}
									className={`flex gap-3 max-w-[85%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
								>
									<div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-sm ${msg.sender === 'user' ? 'bg-primary/10 text-primary' : 'bg-gradient-eco text-white'
										}`}>
										{msg.sender === 'user' ? <User size={14} /> : <Bot size={14} />}
									</div>
									<div className={`p-3.5 text-sm font-bold shadow-sm whitespace-pre-wrap ${msg.sender === 'user'
										? 'bg-primary text-white rounded-2xl rounded-tr-sm'
										: 'bg-white border border-slate-100 text-slate-600 rounded-2xl rounded-tl-sm'
										}`}>
										{renderMessageText(msg.text)}
									</div>
								</motion.div>
							))}

							{isTyping && (
								<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 max-w-[85%]">
									<div className="w-8 h-8 rounded-full bg-gradient-eco text-white flex items-center justify-center shrink-0 mt-1 shadow-sm">
										<Bot size={14} />
									</div>
									<div className="p-4 bg-white border border-slate-100 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1.5">
										<span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
										<span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
										<span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
									</div>
								</motion.div>
							)}
							<div ref={messagesEndRef} />
						</div>

						<div className="p-4 bg-white border-t border-slate-100">
							<form onSubmit={sendMessage} className="relative flex items-center">
								<input
									type="text"
									value={inputText}
									onChange={(e) => setInputText(e.target.value)}
									placeholder="Спросите ИИ-помощника..."
									className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-bold rounded-xl py-3 pl-4 pr-12 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
								/>
								<button
									type="submit"
									disabled={!inputText.trim() || isTyping}
									className="absolute right-2 p-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:hover:bg-primary transition-colors"
								>
									<Send size={16} className={inputText.trim() ? 'translate-x-0.5 -translate-y-0.5' : ''} />
								</button>
							</form>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			<motion.button
				whileHover={{ scale: 1.05 }}
				whileTap={{ scale: 0.95 }}
				onClick={() => setIsOpen(!isOpen)}
				className={`w-16 h-16 rounded-full text-white shadow-xl flex items-center justify-center transition-colors duration-300 relative z-50 ${isOpen ? 'bg-slate-800 hover:bg-slate-700' : 'bg-gradient-eco hover:shadow-primary/40'
					}`}
			>
				<AnimatePresence mode="wait">
					{isOpen ? (
						<motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
							<X size={28} strokeWidth={2.5} />
						</motion.div>
					) : (
						<motion.div key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
							<MessageSquare size={28} strokeWidth={2.5} />
						</motion.div>
					)}
				</AnimatePresence>

				{!isOpen && (
					<span className="absolute top-0 right-0 w-4 h-4 bg-red-500 border-2 border-white rounded-full animate-pulse"></span>
				)}
			</motion.button>
		</div>
	);
}