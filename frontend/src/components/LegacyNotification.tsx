// src/components/LegacyNotification.tsx — bottom-right toast в стиле EcoPrint_old
import { useEffect, useRef, useState } from 'react';
import { subscribeNotification, type NotifyPayload } from '../utils/notification';

const ICON_BY_TYPE: Record<string, string> = {
	success: 'fas fa-check-circle',
	warning: 'fas fa-exclamation-triangle',
	error: 'fas fa-times-circle',
	info: 'fas fa-info-circle',
};

export default function LegacyNotification() {
	const [current, setCurrent] = useState<NotifyPayload | null>(null);
	const [show, setShow] = useState(false);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		return subscribeNotification(payload => {
			if (timerRef.current) clearTimeout(timerRef.current);
			setCurrent(payload);
			// rAF чтобы анимация transform отыграла после монтирования
			requestAnimationFrame(() => setShow(true));
			timerRef.current = setTimeout(() => setShow(false), 5000);
		});
	}, []);

	useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

	const handleClose = () => {
		setShow(false);
		if (timerRef.current) clearTimeout(timerRef.current);
	};

	if (!current) return null;

	const iconCls = ICON_BY_TYPE[current.type] || ICON_BY_TYPE.info;

	return (
		<div
			className={`notification ${show ? 'show' : ''} ${current.type}`}
			id="notification"
			style={{ display: 'flex' }}
		>
			<div className="notification-icon" style={{ flexShrink: 0 }}>
				<i className={iconCls}></i>
			</div>
			<div className="notification-content" style={{ flex: 1 }}>
				<div className="notification-title" style={{ fontWeight: 600, marginBottom: 4 }}>
					{current.title}
				</div>
				<div className="notification-message" style={{ color: '#6b7280', fontSize: 14, whiteSpace: 'pre-wrap' }}>
					{current.message}
				</div>
			</div>
			<button className="notification-close" onClick={handleClose} title="Закрыть" style={{ flexShrink: 0 }}>
				<i className="fas fa-times"></i>
			</button>
		</div>
	);
}
