// Firebase конфигурация для real-time синхронизации статусов
// Используем Realtime Database для мгновенного push-уведомления всем клиентам
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, onValue, set, off } from 'firebase/database';

const firebaseConfig = {
	apiKey: "AIzaSyCcPyj9maXgweZ5skNqXzj-OxiSaRiuiPo",
	authDomain: "ecoprint-app.firebaseapp.com",
	databaseURL: "https://ecoprint-app-default-rtdb.europe-west1.firebasedatabase.app",
	projectId: "ecoprint-app",
	storageBucket: "ecoprint-app.firebasestorage.app",
	messagingSenderId: "1035079064676",
	appId: "1:1035079064676:web:d4e910a20437a414a29371"
};

// Инициализируем Firebase только один раз
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getDatabase(app);

// Ссылка на узел синхронизации — просто timestamp, никаких персональных данных
const syncNodeRef = ref(db, 'ecoprint/sync/lastUpdate');

// Подписка: когда кто-то меняет статус — все получают уведомление МГНОВЕННО
export function subscribeToSync(callback: () => void): () => void {
	let isFirst = true;
	onValue(syncNodeRef, () => {
		if (isFirst) { isFirst = false; return; } // Пропускаем начальный вызов
		callback();
	});
	return () => off(syncNodeRef);
}

// Уведомить ВСЕ браузеры об изменении (< 1 секунды)
export function notifyAllClients(): void {
	set(syncNodeRef, Date.now()).catch(() => {});
}
