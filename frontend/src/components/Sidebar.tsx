import { NavLink } from 'react-router-dom';

interface SidebarProps {
	isOpen: boolean;
	onClose: () => void;
	isCollapsed: boolean;
	onToggleCollapse: () => void;
}

export default function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }: SidebarProps) {
	const userStr = localStorage.getItem('user');
	const user = userStr && userStr !== 'undefined' ? JSON.parse(userStr) : null;
	const role = user?.role || 'worker';

	const menuItemsData = [
		{ path: '/', icon: 'fa-home', label: 'Главная', allowedRoles: ['superadmin', 'manager', 'worker'], end: true },
		{ path: '/statistics', icon: 'fa-chart-bar', label: 'Статистика', allowedRoles: ['superadmin'] },
		{ path: '/products', icon: 'fa-boxes', label: 'Товары', allowedRoles: ['superadmin', 'manager'] },
		{ path: '/archive', icon: 'fa-archive', label: 'Архив заказов', allowedRoles: ['superadmin', 'manager'] },
		{ path: '/settings', icon: 'fa-cog', label: 'Настройки', allowedRoles: ['superadmin'] },
	];

	const menuItems = menuItemsData.filter(item => item.allowedRoles.includes(role));

	return (
		<nav className={`sidebar ${isOpen ? 'show' : ''}`}>
			<NavLink to="/" end className="sidebar-logo-link" onClick={onClose}>
				<div className="logo">
					<div className="logo-text">
						<span className="eco">Эко</span><span className="print">Принт</span>
					</div>
				</div>
			</NavLink>

			<ul className="sidebar-menu">
				{menuItems.map(item => (
					<li key={item.path}>
						<NavLink
							to={item.path}
							end={item.end}
							onClick={onClose}
							className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}
							title={isCollapsed ? item.label : undefined}
						>
							<i className={`fas ${item.icon}`}></i>
							<span className="menu-text">{item.label}</span>
						</NavLink>
					</li>
				))}
			</ul>

			<button
				className="sidebar-toggle-btn"
				onClick={onToggleCollapse}
				title={isCollapsed ? 'Развернуть' : 'Свернуть'}
			>
				<i className="fas fa-chevron-left"></i>
			</button>
		</nav>
	);
}
