// src/pages/ProfilePage.tsx — точ-в-точ profile_page.html
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api/api';

export default function ProfilePage() {
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [username, setUsername] = useState('');
	const [email, setEmail] = useState('');
	const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

	const [oldPassword, setOldPassword] = useState('');
	const [newPassword1, setNewPassword1] = useState('');
	const [newPassword2, setNewPassword2] = useState('');

	const [isSavingProfile, setIsSavingProfile] = useState(false);
	const [isChangingPassword, setIsChangingPassword] = useState(false);
	const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

	const fileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		const userStr = localStorage.getItem('user');
		if (userStr && userStr !== 'undefined') {
			try {
				const u = JSON.parse(userStr);
				setFirstName(u.first_name || '');
				setLastName(u.last_name || '');
				setUsername(u.username || '');
				setEmail(u.email || '');
				if (u.avatar_url) setAvatarUrl(u.avatar_url);
			} catch { /* ok */ }
		}

		api.get('profile/me/').then(res => {
			const d = res.data;
			setFirstName(d.first_name || ''); setLastName(d.last_name || '');
			setUsername(d.username || ''); setEmail(d.email || '');
			if (d.avatar_url) setAvatarUrl(d.avatar_url);

			const userStr = localStorage.getItem('user');
			if (userStr && userStr !== 'undefined') {
				try {
					const user = JSON.parse(userStr);
					user.first_name = d.first_name; user.last_name = d.last_name;
					user.email = d.email; user.avatar_url = d.avatar_url;
					localStorage.setItem('user', JSON.stringify(user));
					window.dispatchEvent(new Event('profile-updated'));
				} catch { /* ok */ }
			}
		}).catch(() => { /* ignore */ });
	}, []);

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const localUrl = URL.createObjectURL(file);
		setAvatarUrl(localUrl);
		setIsUploadingAvatar(true);
		const t = toast.loading('Загружаю фото...');
		try {
			const fd = new FormData();
			fd.append('avatar', file);
			const res = await api.post('profile/upload-avatar/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
			setAvatarUrl(res.data.avatar_url);
			const userStr = localStorage.getItem('user');
			if (userStr && userStr !== 'undefined') {
				const u = JSON.parse(userStr);
				u.avatar_url = res.data.avatar_url;
				localStorage.setItem('user', JSON.stringify(u));
				window.dispatchEvent(new Event('profile-updated'));
			}
			toast.success('Фото обновлено!', { id: t });
		} catch (err: any) {
			toast.error(err.response?.data?.error || 'Ошибка при загрузке', { id: t });
			setAvatarUrl(null);
		} finally {
			setIsUploadingAvatar(false);
			if (fileInputRef.current) fileInputRef.current.value = '';
		}
	};

	const handleSaveProfile = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSavingProfile(true);
		try {
			const res = await api.post('profile/update/', { first_name: firstName, last_name: lastName, email });
			const userStr = localStorage.getItem('user');
			if (userStr && userStr !== 'undefined') {
				const u = JSON.parse(userStr);
				u.first_name = res.data.first_name;
				u.last_name = res.data.last_name;
				u.email = res.data.email;
				localStorage.setItem('user', JSON.stringify(u));
				window.dispatchEvent(new Event('profile-updated'));
			}
			toast.success('Профиль сохранён!');
		} catch { toast.error('Ошибка при сохранении'); }
		finally { setIsSavingProfile(false); }
	};

	const handleChangePassword = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!oldPassword || !newPassword1 || !newPassword2) { toast.error('Заполните все поля'); return; }
		if (newPassword1 !== newPassword2) { toast.error('Пароли не совпадают'); return; }
		if (newPassword1.length < 6) { toast.error('Минимум 6 символов'); return; }
		setIsChangingPassword(true);
		try {
			await api.post('profile/change-password/', { old_password: oldPassword, new_password: newPassword1 });
			toast.success('Пароль обновлён!');
			setOldPassword(''); setNewPassword1(''); setNewPassword2('');
		} catch (err: any) { toast.error(err.response?.data?.error || 'Ошибка смены пароля'); }
		finally { setIsChangingPassword(false); }
	};

	const initials = (firstName.charAt(0) || username.charAt(0) || '?').toUpperCase();

	return (
		<div className="container">
			<div className="main-content">

				<h2 className="profile-page-title">Мой профиль</h2>

				<div className="profile-grid">

					<div className="filters-card">
						<form onSubmit={handleSaveProfile} encType="multipart/form-data">
							<div className="profile-avatar-new">
								{avatarUrl ? (
									<img src={avatarUrl} alt="Аватар" className="current-avatar-new" />
								) : (
									<div
										className="current-avatar-new"
										style={{
											display: 'flex', alignItems: 'center', justifyContent: 'center',
											background: 'linear-gradient(135deg,#ec4899,#0088cc)', color: 'white',
											fontSize: 64, fontWeight: 700,
										}}
									>{initials}</div>
								)}
								<label htmlFor="id_avatar" className="change-photo-btn">
									{isUploadingAvatar ? 'Загрузка...' : 'Изменить фото'}
								</label>
								<input
									ref={fileInputRef}
									type="file"
									id="id_avatar"
									accept="image/jpeg,image/png,image/gif,image/webp"
									onChange={handleFileChange}
								/>
							</div>

							<div className="form-group">
								<label>Имя</label>
								<input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} />
							</div>
							<div className="form-group">
								<label>Фамилия</label>
								<input type="text" value={lastName} onChange={e => setLastName(e.target.value)} />
							</div>
							<div className="form-group">
								<label>Логин</label>
								<input type="text" value={username} disabled />
							</div>
							<div className="form-group">
								<label>Email</label>
								<input type="email" value={email} onChange={e => setEmail(e.target.value)} />
							</div>

							<button type="submit" className="btn btn-save-profile" disabled={isSavingProfile}>
								{isSavingProfile ? 'Сохранение...' : 'Сохранить данные'}
							</button>
						</form>
					</div>

					<div className="filters-card password-form-card">
						<h3>Сменить пароль</h3>
						<form onSubmit={handleChangePassword}>
							<div className="form-group">
								<label>Старый пароль*</label>
								<input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
							</div>
							<div className="form-group">
								<label>Новый пароль*</label>
								<input type="password" value={newPassword1} onChange={e => setNewPassword1(e.target.value)} />
								<div className="help-text">Минимум 6 символов.</div>
							</div>
							<div className="form-group">
								<label>Подтверждение нового пароля*</label>
								<input type="password" value={newPassword2} onChange={e => setNewPassword2(e.target.value)} />
							</div>

							<button type="submit" className="btn btn-danger" disabled={isChangingPassword}>
								{isChangingPassword ? 'Смена...' : 'Изменить пароль'}
							</button>
						</form>
					</div>

				</div>
			</div>
		</div>
	);
}
