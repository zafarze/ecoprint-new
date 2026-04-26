// src/pages/SettingsPage.tsx — точ-в-точ EcoPrint_old/templates/settings_page.html
import { Link } from 'react-router-dom';

export default function SettingsPage() {
	return (
		<div className="container">
			<div className="main-content">

				<div className="filters-card" style={{ marginBottom: 20 }}>
					<div className="filters-header-title">
						<i className="fas fa-cogs"></i>
						<span> Настройки приложения</span>
					</div>
				</div>

				<div className="settings-grid">

					<Link to="/settings/users" className="settings-card">
						<div className="settings-card-icon" style={{ background: 'linear-gradient(135deg, #ec4899, #0088cc)' }}>
							<i className="fas fa-users-cog"></i>
						</div>
						<div className="settings-card-content">
							<h3>Управление пользователями</h3>
							<p>Добавление, редактирование и удаление аккаунтов.</p>
						</div>
					</Link>

					<Link to="/settings/notifications" className="settings-card">
						<div className="settings-card-icon" style={{ background: '#f59e0b' }}>
							<i className="fas fa-bell"></i>
						</div>
						<div className="settings-card-content">
							<h3>Настройки уведомлений</h3>
							<p>Настройте звуковые и всплывающие оповещения.</p>
						</div>
					</Link>

					<Link to="/settings/company" className="settings-card">
						<div className="settings-card-icon" style={{ background: '#10b981' }}>
							<i className="fas fa-building"></i>
						</div>
						<div className="settings-card-content">
							<h3>Данные компании</h3>
							<p>Логотип, название, адрес и реквизиты.</p>
						</div>
					</Link>

					<Link to="/settings/integrations" className="settings-card">
						<div className="settings-card-icon" style={{ background: '#3b82f6' }}>
							<i className="fab fa-telegram-plane"></i>
						</div>
						<div className="settings-card-content">
							<h3>Интеграции</h3>
							<p>Подключите Telegram-бота или другие сервисы.</p>
						</div>
					</Link>

				</div>
			</div>
		</div>
	);
}
