import { useState, useEffect, useRef } from 'react';
import { UserCircle, Save, Camera, KeyRound, ShieldCheck, Loader2 } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Input, Label } from '../components/ui/Form';
import toast from 'react-hot-toast';
import api from '../api/api';

export default function ProfilePage() {
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
	const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
	const [isSavingProfile, setIsSavingProfile] = useState(false);

	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);

	const fileInputRef = useRef<HTMLInputElement>(null);

	// Загружаем данные профиля с сервера (включая аватар)
	useEffect(() => {
		// Сначала быстро показываем из localStorage
		const userStr = localStorage.getItem('user');
		if (userStr) {
			const user = JSON.parse(userStr);
			setFirstName(user.first_name || user.username || '');
			setLastName(user.last_name || '');
		}

		// Потом подгружаем актуальный аватар с сервера
		api.get('profile/me/')
			.then(res => {
				const data = res.data;
				if (data.avatar_url) {
					setAvatarUrl(data.avatar_url);
				}
				setFirstName(data.first_name || data.username || '');
				setLastName(data.last_name || '');

				// Обновляем localStorage актуальными данными с сервера
				const userStr = localStorage.getItem('user');
				if (userStr) {
					const user = JSON.parse(userStr);
					user.first_name = data.first_name;
					user.last_name = data.last_name;
					user.avatar_url = data.avatar_url;
					localStorage.setItem('user', JSON.stringify(user));
					window.dispatchEvent(new Event('profile-updated'));
				}
			})
			.catch(() => {/* молча игнорируем */});
	}, []);

	// Обработчик выбора файла
	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		// Мгновенный превью
		const localUrl = URL.createObjectURL(file);
		setAvatarUrl(localUrl);

		setIsUploadingAvatar(true);
		const loadingToast = toast.loading('Загружаю фото...');

		try {
			const formData = new FormData();
			formData.append('avatar', file);

			const res = await api.post('profile/upload-avatar/', formData, {
				headers: { 'Content-Type': 'multipart/form-data' },
			});

			setAvatarUrl(res.data.avatar_url);
			
			// Обновляем localStorage
			const userStr = localStorage.getItem('user');
			if (userStr) {
				const user = JSON.parse(userStr);
				user.avatar_url = res.data.avatar_url;
				localStorage.setItem('user', JSON.stringify(user));
				window.dispatchEvent(new Event('profile-updated'));
			}

			toast.success('Фото профиля обновлено!', { id: loadingToast });
		} catch (err: any) {
			const msg = err.response?.data?.error || 'Ошибка при загрузке фото';
			toast.error(msg, { id: loadingToast });
			// Откатываем превью если ошибка
			setAvatarUrl(null);
		} finally {
			setIsUploadingAvatar(false);
			// Сбрасываем input чтобы можно было выбрать тот же файл снова
			if (fileInputRef.current) fileInputRef.current.value = '';
		}
	};

	const handleProfileSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSavingProfile(true);
		try {
			const res = await api.post('profile/update/', {
				first_name: firstName,
				last_name: lastName,
			});
			// Обновляем localStorage
			const userStr = localStorage.getItem('user');
			if (userStr) {
				const user = JSON.parse(userStr);
				user.first_name = res.data.first_name;
				user.last_name = res.data.last_name;
				localStorage.setItem('user', JSON.stringify(user));
			}
			toast.success('Профиль успешно сохранён!');
		} catch {
			toast.error('Ошибка при сохранении профиля');
		} finally {
			setIsSavingProfile(false);
		}
	};

	const handlePasswordChange = async (e: React.FormEvent) => {
		e.preventDefault();
		
		if (!newPassword || !confirmPassword) {
			toast.error('Пожалуйста, заполните все поля');
			return;
		}
		
		if (newPassword !== confirmPassword) {
			toast.error('Новые пароли не совпадают');
			return;
		}

		if (newPassword.length < 6) {
			toast.error('Новый пароль должен содержать минимум 6 символов');
			return;
		}

		try {
			setIsSubmitting(true);
			await api.post('/profile/change-password/', {
				new_password: newPassword
			});
			toast.success('Пароль успешно обновлен!');
			setNewPassword('');
			setConfirmPassword('');
		} catch (error: any) {
			const errorMsg = error.response?.data?.error || 'Произошла ошибка при смене пароля';
			toast.error(errorMsg);
		} finally {
			setIsSubmitting(false);
		}
	};

	const initials = (firstName.charAt(0) || '?').toUpperCase();

	return (
		<div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">

			<div>
				<h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
					<UserCircle className="text-primary" size={32} strokeWidth={2.5} />
					Мой профиль
				</h1>
				<p className="text-sm font-bold text-slate-400 mt-1">Управление личными данными</p>
			</div>

			<Card>
				<form onSubmit={handleProfileSubmit} className="space-y-6">

					{/* Аватарка */}
					<div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-100">
						{/* Скрытый input для файла */}
						<input
							ref={fileInputRef}
							type="file"
							accept="image/jpeg,image/png,image/gif,image/webp"
							className="hidden"
							onChange={handleFileChange}
						/>

						{/* Кликабельный аватар */}
						<div
							className="relative group cursor-pointer shrink-0"
							onClick={() => !isUploadingAvatar && fileInputRef.current?.click()}
							title="Нажмите чтобы изменить фото"
						>
							<div className="w-28 h-28 rounded-full overflow-hidden bg-gradient-eco text-white flex items-center justify-center text-4xl font-black shadow-lg">
								{avatarUrl ? (
									<img
										src={avatarUrl}
										alt="Аватар"
										className="w-full h-full object-cover"
										onError={() => setAvatarUrl(null)}
									/>
								) : (
									initials
								)}
							</div>
							{/* Затемнение при наведении */}
							<div className="absolute inset-0 bg-slate-900/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
								{isUploadingAvatar
									? <Loader2 className="text-white animate-spin" size={24} />
									: <Camera className="text-white" size={24} />
								}
							</div>
						</div>

						<div className="text-center sm:text-left">
							<h3 className="text-lg font-black text-slate-800">Фото профиля</h3>
							<p className="text-sm font-bold text-slate-400 mb-3">PNG, JPG или GIF до 5 MB</p>
							<Button
								type="button"
								variant="outline"
								className="py-2 px-4 text-xs"
								onClick={() => !isUploadingAvatar && fileInputRef.current?.click()}
								disabled={isUploadingAvatar}
							>
								{isUploadingAvatar ? 'Загружаю...' : 'Изменить фото'}
							</Button>
						</div>
					</div>

					{/* Поля формы */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
						<div>
							<Label>Имя</Label>
							<Input
								value={firstName}
								onChange={e => setFirstName(e.target.value)}
								placeholder="Ваше имя"
							/>
						</div>
						<div>
							<Label>Фамилия</Label>
							<Input
								value={lastName}
								onChange={e => setLastName(e.target.value)}
								placeholder="Ваша фамилия"
							/>
						</div>
					</div>

					<div className="pt-4 flex justify-end">
						<Button type="submit" icon={<Save size={18} />} disabled={isSavingProfile}>
							{isSavingProfile ? 'Сохранение...' : 'Сохранить данные'}
						</Button>
					</div>

				</form>
			</Card>

			{/* Смена пароля */}
			<div className="pt-4">
				<h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3 mb-4 pl-1">
					<KeyRound className="text-primary" size={24} />
					Безопасность
				</h2>
				<Card>
					<form onSubmit={handlePasswordChange} className="space-y-5">
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl">
							<div>
								<Label>Новый пароль</Label>
								<Input
									type="password"
									value={newPassword}
									onChange={e => setNewPassword(e.target.value)}
									placeholder="Минимум 6 символов"
								/>
							</div>
							<div>
								<Label>Подтверждение пароля</Label>
								<Input
									type="password"
									value={confirmPassword}
									onChange={e => setConfirmPassword(e.target.value)}
									placeholder="Повторите новый пароль"
								/>
							</div>
						</div>

						<div className="pt-4 flex">
							<Button type="submit" disabled={isSubmitting} variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50" icon={<ShieldCheck size={18} />}>
								{isSubmitting ? 'Обновление...' : 'Обновить пароль'}
							</Button>
						</div>

					</form>
				</Card>
			</div>
		</div>
	);
}