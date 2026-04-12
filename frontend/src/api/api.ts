import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const api = axios.create({
	baseURL: `${API_URL}/api/`,
});

api.interceptors.request.use(
	(config) => {
		let token = localStorage.getItem('token');

		if (token && token !== 'undefined' && token !== 'null') {
			// 🔥 Убираем случайные кавычки, если токен сохранился как JSON-строка
			token = token.replace(/^"(.*)"$/, '$1');

			// Самый надежный способ установки заголовка в современных версиях Axios
			config.headers.set('Authorization', `Bearer ${token}`);
		}

		// 🔥 Отключаем кэширование браузером для всех GET-запросов (решает проблему с возвратом старых статусов)
		if (config.method?.toLowerCase() === 'get') {
			config.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
			config.headers.set('Pragma', 'no-cache');
			config.headers.set('Expires', '0');

			// Добавляем cache-buster параметр в URL
			config.params = {
				...config.params,
				_t: new Date().getTime()
			};
		}

		return config;
	},
	(error) => Promise.reject(error)
);

api.interceptors.response.use(
	(response) => response,
	(error) => {
		// Ловим и 401, и 403 ошибки
		if (error.response && (error.response.status === 401 || error.response.status === 403)) {
			if (error.config.url && !error.config.url.includes('token')) {
				console.error("Токен сломан или истек. Сбрасываем сессию...");
				localStorage.removeItem('token');
				localStorage.removeItem('user');
				window.location.href = '/login';
			}
		}
		return Promise.reject(error);
	}
);

export default api;