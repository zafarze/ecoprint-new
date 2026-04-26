// src/settings/CompanySettings.tsx — точ-в-точ company_settings.html
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/api';

export default function CompanySettings() {
	const [companyName, setCompanyName] = useState('');
	const [address, setAddress] = useState('');
	const [phone, setPhone] = useState('');
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		(async () => {
			try {
				const res = await api.get('settings/company/');
				setCompanyName(res.data.company_name || '');
				setAddress(res.data.address || '');
				setPhone(res.data.phone || '');
			} catch (e) { console.error(e); }
			finally { setIsLoading(false); }
		})();
	}, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSaving(true);
		try {
			await api.put('settings/company/', { company_name: companyName, address, phone });
			toast.success('Данные компании сохранены!');
		} catch { toast.error('Ошибка при сохранении.'); }
		finally { setIsSaving(false); }
	};

	if (isLoading) return <div className="container"><div className="empty-state"><i className="fas fa-spinner fa-spin"></i><h3>Загрузка...</h3></div></div>;

	return (
		<div className="container">
			<div className="main-content">
				<form className="filters-card" style={{ margin: '20px 0' }} onSubmit={handleSubmit}>
					<div className="filters-header-title" style={{ marginBottom: 25 }}>
						<i className="fas fa-building"></i>
						<span> Данные компании</span>
					</div>

					<div className="form-group">
						<label>Название компании:</label>
						<input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Например: ООО ЭкоПринт" />
					</div>
					<div className="form-group">
						<label>Адрес:</label>
						<input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Полный адрес" />
					</div>
					<div className="form-group">
						<label>Телефон:</label>
						<input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+992 00 000 0000" />
					</div>

					<div className="form-actions" style={{ marginTop: 20, borderTop: '1px solid var(--border-color)', paddingTop: 20 }}>
						<button type="submit" className="btn btn-content" disabled={isSaving}>
							<i className="fas fa-save"></i> {isSaving ? 'Сохранение...' : 'Сохранить данные'}
						</button>
						<Link to="/settings" className="btn" style={{ marginLeft: 15, background: 'white', color: 'var(--text-color)', border: '1px solid var(--border-color)' }}>
							Назад к настройкам
						</Link>
					</div>
				</form>
			</div>
		</div>
	);
}
