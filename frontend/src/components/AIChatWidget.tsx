// src/components/AIChatWidget.tsx — точ-в-точ chat.css
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useState } from 'react';
import api from '../api/api';

interface Message { id: number; text: string; sender: 'user' | 'bot'; }

const INITIAL: Message = {
	id: 1,
	text: 'Привет! Я твой ИИ-помощник. Я вижу все заказы в базе. Спроси меня: "Сколько заказов в работе?". 🤖',
	sender: 'bot',
};

export default function AIChatWidget() {
	const [isOpen, setIsOpen] = useState(false);
	const [inputText, setInputText] = useState('');
	const [isTyping, setIsTyping] = useState(false);
	const [messages, setMessages] = useState<Message[]>(() => {
		const saved = localStorage.getItem('eco_ai_chat_history');
		if (saved) { try { return JSON.parse(saved); } catch { /* */ } }
		return [INITIAL];
	});
	const bodyRef = useRef<HTMLDivElement>(null);

	useEffect(() => { localStorage.setItem('eco_ai_chat_history', JSON.stringify(messages)); }, [messages]);
	useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight; }, [messages, isTyping, isOpen]);

	const send = async (e?: React.FormEvent) => {
		e?.preventDefault();
		const text = inputText.trim();
		if (!text) return;
		setMessages(prev => [...prev, { id: Date.now(), text, sender: 'user' }]);
		setInputText('');
		setIsTyping(true);
		try {
			const res = await api.post('ai-chat/', { message: text });
			setMessages(prev => [...prev, { id: Date.now(), text: res.data.answer || 'Извините, ответа нет.', sender: 'bot' }]);
		} catch (err: any) {
			const isNet = !err.response;
			const msg = isNet ? 'Сбой сети. Проверьте подключение.' : (err.response?.data?.error || 'Что-то пошло не так на сервере.');
			setMessages(prev => [...prev, { id: Date.now(), text: msg, sender: 'bot' }]);
		} finally { setIsTyping(false); }
	};

	return (
		<>
			<button className="chat-toggle-btn" id="chatToggleBtn" onClick={() => setIsOpen(v => !v)} title="ИИ-помощник">
				<i className={`fas ${isOpen ? 'fa-times' : 'fa-robot'}`}></i>
			</button>

			<div className={`chat-widget ${isOpen ? 'active' : ''}`} id="chatWidget">
				<div className="chat-header">
					<i className="fas fa-robot"></i>
					<span>EcoPrint AI Помощник</span>
				</div>

				<div className="chat-body" id="chatBody" ref={bodyRef}>
					{messages.map(m => (
						<div key={m.id} className={`message ${m.sender}`}>{m.text}</div>
					))}

					{isTyping && (
						<div className="typing-indicator" style={{ display: 'flex' }}>
							<span></span><span></span><span></span>
						</div>
					)}
				</div>

				<form className="chat-footer" onSubmit={send}>
					<input
						type="text"
						className="chat-input"
						id="chatInput"
						placeholder="Задай вопрос..."
						value={inputText}
						onChange={e => setInputText(e.target.value)}
					/>
					<button type="submit" className="chat-send-btn" id="chatSendBtn" disabled={!inputText.trim() || isTyping}>
						<i className="fas fa-paper-plane"></i>
					</button>
				</form>
			</div>
		</>
	);
}
