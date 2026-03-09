import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface BaseModalProps {
	isOpen: boolean;
	onClose: () => void;
	title: string;
	children: React.ReactNode;
	maxWidth?: string;
}

export default function BaseModal({ isOpen, onClose, title, children, maxWidth = 'max-w-2xl' }: BaseModalProps) {
	// Закрытие по Escape
	useEffect(() => {
		const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
		if (isOpen) window.addEventListener('keydown', handleEsc);
		return () => window.removeEventListener('keydown', handleEsc);
	}, [isOpen, onClose]);

	return (
		<AnimatePresence>
			{isOpen && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
					{/* Темный фон (Backdrop) */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={onClose}
						className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
					/>

					{/* Само окно */}
					<motion.div
						initial={{ opacity: 0, scale: 0.95, y: 20 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.95, y: 20 }}
						transition={{ type: 'spring', duration: 0.5, bounce: 0.3 }}
						className={`relative w-full ${maxWidth} bg-white rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden`}
					>
						{/* Шапка модалки */}
						<div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
							<h2 className="text-xl font-black text-slate-800">{title}</h2>
							<button
								onClick={onClose}
								className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
							>
								<X size={20} strokeWidth={2.5} />
							</button>
						</div>

						{/* Контент модалки (скроллится, если большой) */}
						<div className="p-6 overflow-y-auto custom-scrollbar">
							{children}
						</div>
					</motion.div>
				</div>
			)}
		</AnimatePresence>
	);
}