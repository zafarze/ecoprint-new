// src/modals/ConfirmDeleteModal.tsx — стиль legacy .message-modal-content
interface ConfirmDeleteModalProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void;
	title: string;
	itemName: string;
}

export default function ConfirmDeleteModal({ isOpen, onClose, onConfirm, title, itemName }: ConfirmDeleteModalProps) {
	if (!isOpen) return null;
	return (
		<div className="modal active" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
			<div className="modal-content message-modal-content">
				<div className="message-modal-icon">
					<i className="fas fa-exclamation-triangle icon-error"></i>
				</div>
				<h3 style={{ marginBottom: 10 }}>{title}</h3>
				<p style={{ color: '#666', marginBottom: 25, lineHeight: 1.5 }}>
					Вы действительно хотите безвозвратно удалить<br />
					<strong style={{ color: '#1f2937' }}>«{itemName}»</strong>?<br />
					<span style={{ fontSize: 13, color: '#9ca3af', display: 'block', marginTop: 8 }}>
						Это действие нельзя будет отменить.
					</span>
				</p>
				<div className="form-actions" style={{ justifyContent: 'center' }}>
					<button type="button" className="btn-cancel" onClick={onClose}>
						<i className="fas fa-times"></i>Отмена
					</button>
					<button type="button" className="btn-save" onClick={onConfirm} style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
						<i className="fas fa-trash"></i>Удалить
					</button>
				</div>
			</div>
		</div>
	);
}
