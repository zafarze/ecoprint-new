import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/api';
import PWAInstallButton from './PWAInstallButton';

interface HeaderProps {
	onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
	const [isProfileOpen, setIsProfileOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const navigate = useNavigate();

	const [userData, setUserData] = useState(() => {
		const userStr = localStorage.getItem('user');
		return userStr && userStr !== 'undefined' ? JSON.parse(userStr) : { username: 'A' };
	});

	const [deadlineStats, setDeadlineStats] = useState({ today: 0, tomorrow: 0, overdue: 0 });

	useEffect(() => {
		const fetchDeadlineStats = async () => {
			try {
				const res = await api.get('header-stats/');
				setDeadlineStats(res.data);
			} catch (e) {
				console.error('Ошибка статистики хедера:', e);
			}
		};
		fetchDeadlineStats();
		const interval = setInterval(fetchDeadlineStats, 60000);
		window.addEventListener('orders-updated', fetchDeadlineStats);
		window.addEventListener('sync-updated', fetchDeadlineStats);
		return () => {
			clearInterval(interval);
			window.removeEventListener('orders-updated', fetchDeadlineStats);
			window.removeEventListener('sync-updated', fetchDeadlineStats);
		};
	}, []);

	useEffect(() => {
		const updateProfile = () => {
			const userStr = localStorage.getItem('user');
			if (userStr && userStr !== 'undefined') setUserData(JSON.parse(userStr));
		};
		window.addEventListener('profile-updated', updateProfile);
		return () => window.removeEventListener('profile-updated', updateProfile);
	}, []);

	useEffect(() => {
		const onClick = (e: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
				setIsProfileOpen(false);
			}
		};
		document.addEventListener('mousedown', onClick);
		return () => document.removeEventListener('mousedown', onClick);
	}, []);

	const userInitial = (userData.first_name || userData.username || 'A').charAt(0).toUpperCase();

	const handleLogout = () => {
		localStorage.removeItem('token');
		localStorage.removeItem('user');
		setIsProfileOpen(false);
		navigate('/login');
	};

	const handleSync = async () => {
		const id = toast.loading('Синхронизация данных...');
		try {
			await api.post('sync-sheets/');
			toast.success('Синхронизация успешно выполнена!', { id });
			window.dispatchEvent(new Event('sync-updated'));
		} catch {
			toast.error('Ошибка сети при попытке синхронизации', { id });
		}
	};

	return (
		<header>
			<div className="header-content">
				<div className="header-actions-left">
					<button className="btn icon-btn" id="menuToggleBtn" onClick={onMenuClick} title="Меню">
						<i className="fas fa-bars"></i>
					</button>
					<button className="btn" id="syncBtn" onClick={handleSync}>
						<i className="fas fa-sync"></i>
						<span className="btn-text">Синхронизировать</span>
					</button>

					{deadlineStats.overdue > 0 && (
						<button
							className="deadline-chip deadline-overdue"
							onClick={() => navigate('/?deadline=overdue')}
							title="Показать просроченные заказы"
						>
							<i className="fas fa-exclamation-circle"></i>
							<span>Просрочено: {deadlineStats.overdue}</span>
						</button>
					)}
					<button
						className="deadline-chip deadline-today"
						onClick={() => navigate('/?deadline=today')}
						title="Заказы со сдачей сегодня"
					>
						<i className="fas fa-calendar-day"></i>
						<span>Сегодня: {deadlineStats.today}</span>
					</button>
					<button
						className="deadline-chip deadline-tomorrow"
						onClick={() => navigate('/?deadline=tomorrow')}
						title="Заказы со сдачей завтра"
					>
						<i className="fas fa-clock"></i>
						<span>Завтра: {deadlineStats.tomorrow}</span>
					</button>
				</div>

				<div className="header-actions">
					<PWAInstallButton />
					<button
						className="btn icon-btn"
						id="notificationBtn"
						onClick={() => toast('У вас нет новых уведомлений', { icon: '🔔' })}
						title="Уведомления"
					>
						<i className="fas fa-bell"></i>
					</button>

					<div className="profile-dropdown" ref={dropdownRef}>
						<button className="btn avatar-btn" id="avatarBtn" onClick={() => setIsProfileOpen(v => !v)}>
							{userData.avatar_url ? (
								<img src={userData.avatar_url} alt="" className="header-avatar-img" />
							) : (
								<span style={{ fontWeight: 'bold', fontSize: 18 }}>{userInitial}</span>
							)}
						</button>

						<div className={`dropdown-menu ${isProfileOpen ? 'show' : ''}`} id="profileDropdownMenu">
							<Link to="/profile" className="dropdown-item" onClick={() => setIsProfileOpen(false)}>
								<i className="fas fa-user-circle"></i>
								<span>Мой профиль</span>
							</Link>
							<div className="dropdown-divider"></div>
							<button type="button" onClick={handleLogout} className="dropdown-item logout-btn">
								<i className="fas fa-sign-out-alt"></i>
								<span>Выйти</span>
							</button>
						</div>
					</div>
				</div>
			</div>
		</header>
	);
}
