import { AlertTriangle, Trash2 } from 'lucide-react';
import BaseModal from '../components/ui/BaseModal';
import Button from '../components/ui/Button';

interface ConfirmDeleteModalProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void;
	title: string;
	itemName: string;
}

export default function ConfirmDeleteModal({ isOpen, onClose, onConfirm, title, itemName }: ConfirmDeleteModalProps) {
	return (
		<BaseModal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
			<div className="flex flex-col items-center text-center pb-2">

				{/* Красная иконка предупреждения */}
				<div className="w-20 h-20 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-6 shadow-inner">
					<AlertTriangle size={36} strokeWidth={2.5} />
				</div>

				<p className="text-slate-600 text-base mb-8">
					Вы действительно хотите безвозвратно удалить <br />
					<strong className="text-slate-900 text-lg px-1">«{itemName}»</strong>? <br />
					<span className="text-sm text-slate-400 block mt-2">Это действие нельзя будет отменить.</span>
				</p>

				<div className="flex gap-3 w-full">
					<Button variant="ghost" onClick={onClose} className="flex-1 bg-slate-50 hover:bg-slate-100">
						Отмена
					</Button>
					<Button variant="danger" onClick={onConfirm} icon={<Trash2 size={18} />} className="flex-1">
						Удалить
					</Button>
				</div>
			</div>
		</BaseModal>
	);
}