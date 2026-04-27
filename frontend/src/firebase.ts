// Firebase конфигурация для real-time синхронизации статусов
// Используем Realtime Database для мгновенного push-уведомления всем клиентам
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, onValue, set } from 'firebase/database';

const firebaseConfig = {
	apiKey: "AIzaSyCcPyj9maXgweZ5skNqXzj-OxiSaRiuiPo",
	authDomain: "ecoprint-app.firebaseapp.com",
	databaseURL: "https://ecoprint-app-default-rtdb.europe-west1.firebasedatabase.app",
	projectId: "ecoprint-app",
	storageBucket: "ecoprint-app.firebasestorage.app",
	messagingSenderId: "1035079064676",
	appId: "1:1035079064676:web:d4e910a20437a414a29371"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getDatabase(app);

const syncNodeRef = ref(db, 'ecoprint/sync/lastUpdate');

// Подписка: когда кто-то меняет статус — все получают уведомление мгновенно.
// Возвращаемая функция отписывает ТОЛЬКО этого слушателя (ранее off() убирал всех).
export function subscribeToSync(callback: () => void): () => void {
	let isFirst = true;
	const unsubscribe = onValue(
		syncNodeRef,
		() => {
			if (isFirst) { isFirst = false; return; }
			callback();
		},
		(err) => { console.error('[firebase] subscribeToSync error:', err); }
	);
	return unsubscribe;
}

// Уведомить ВСЕ браузеры об изменении (< 1 секунды)
export function notifyAllClients(): void {
	set(syncNodeRef, Date.now()).catch((err) => {
		console.error('[firebase] notifyAllClients failed:', err);
	});
}
