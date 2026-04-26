// src/pages/LoginPage.tsx — точ-в-точ login.html
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';

export default function LoginPage() {
	const navigate = useNavigate();
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		localStorage.removeItem('token');
		localStorage.removeItem('user');
	}, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError('');
		try {
			const res = await api.post('token/', { username, password });
			localStorage.setItem('token', res.data.access);
			if (res.data.user) localStorage.setItem('user', JSON.stringify(res.data.user));
			else localStorage.setItem('user', JSON.stringify({ username }));
			navigate('/');
		} catch (err: any) {
			if (err.response?.status === 401) setError('Неверный логин или пароль.');
			else setError('Нет связи с сервером. Проверьте подключение.');
		} finally { setIsLoading(false); }
	};

	return (
		<div className="login-page">
			<style>{`
				.login-page {
					display: grid;
					place-items: center;
					min-height: 100vh;
					background: linear-gradient(135deg, #ec4899, #0088cc);
					font-family: 'Roboto', sans-serif;
				}
				.login-page .login-container {
					display: flex;
					flex-direction: column;
					align-items: center;
					gap: 30px;
				}
				.login-page .login-container .logo {
					font-size: 32px;
					color: white;
					text-shadow: 2px 2px 6px rgba(0,0,0,0.3);
				}
				.login-page .login-container .logo::before { font-size: 36px; }
				.login-page form {
					background: #fff;
					border: 1px solid #e1e8ed;
					padding: 40px;
					border-radius: 20px;
					box-shadow: 0 20px 25px rgba(0,0,0,0.1);
					width: 400px;
					max-width: 90vw;
				}
				.login-page form h2 {
					text-align: center;
					margin: 0 0 25px;
					color: #2c3e50;
					font-weight: 600;
				}
				.login-page form > div { margin-bottom: 20px; }
				.login-page form label {
					display: block;
					margin-bottom: 8px;
					font-weight: 600;
					color: #6c757d;
				}
				.login-page form input {
					width: 100%;
					padding: 14px;
					font-size: 15px;
					border: 2px solid #e1e8ed;
					border-radius: 12px;
					transition: all 0.3s ease;
					box-sizing: border-box;
				}
				.login-page form input:focus {
					outline: none;
					border-color: #0088cc;
					box-shadow: 0 0 0 4px rgba(0,136,204,0.1);
				}
				.login-page form button {
					width: 100%;
					padding: 16px;
					font-size: 16px;
					font-weight: 600;
					background: linear-gradient(135deg, #ec4899, #0088cc);
					color: white;
					border: none;
					border-radius: 12px;
					cursor: pointer;
					transition: all 0.3s ease;
					box-shadow: 0 4px 6px rgba(0,0,0,0.1);
				}
				.login-page form button:hover {
					background: linear-gradient(135deg, #db2777, #0066aa);
					transform: translateY(-2px);
				}
				.login-page form button:disabled { opacity: 0.6; cursor: not-allowed; }
				.login-page .error {
					color: #ef4444;
					text-align: center;
					margin-top: -10px;
					margin-bottom: 15px;
					font-weight: 500;
				}
			`}</style>

			<div className="login-container">
				<div className="logo">
					<div className="logo-text">
						<span className="eco">Эко</span><span className="print">Принт</span>
					</div>
				</div>

				<form onSubmit={handleSubmit}>
					<h2>Вход в аккаунт</h2>
					<div>
						<label htmlFor="id_username">Логин:</label>
						<input
							type="text" name="username" id="id_username" required autoFocus
							value={username} onChange={e => setUsername(e.target.value)}
						/>
					</div>
					<div>
						<label htmlFor="id_password">Пароль:</label>
						<input
							type="password" name="password" id="id_password" required
							value={password} onChange={e => setPassword(e.target.value)}
						/>
					</div>
					{error && <p className="error">{error}</p>}
					<button type="submit" disabled={isLoading}>{isLoading ? 'Вход...' : 'Войти'}</button>
				</form>
			</div>
		</div>
	);
}
