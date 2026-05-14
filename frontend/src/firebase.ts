// Firebase конфигурация для real-time синхронизации статусов
// Используем Realtime Database для мгновенного push-уведомления всем клиентам
// + BroadcastChannel + storage event для instant-sync между вкладками одного браузера
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

// BroadcastChannel: мгновенная синхронизация между вкладками одного браузера
// (0 сетевой задержки, работает даже когда вкладка свернута/в фоне).
// Дополняет Firebase RTDB, который синхронизирует между разными устройствами.
const BC_NAME = 'ecoprint-sync';
const bc: BroadcastChannel | null =
	typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(BC_NAME) : null;

// storage-эвенты — дополнительный канал между вкладками того же origin (срабатывает
// только в ДРУГИХ вкладках). Подстраховка на случай, если BroadcastChannel недоступен.
const LS_PING_KEY = 'ecoprint_sync_ping';

// Подписка: когда кто-то меняет статус — все получают уведомление мгновенно.
// Возвращаемая функция отписывает ТОЛЬКО этого слушателя (ранее off() убирал всех).
export function subscribeToSync(callback: () => void): () => void {
	let isFirst = true;
	const unsubscribeFb = onValue(
		syncNodeRef,
		() => {
			if (isFirst) { isFirst = false; return; }
			console.log('[sync] FB RTDB push received');
			callback();
		},
		(err) => { console.error('[sync] FB subscribe error:', err); }
	);

	const onBcMessage = (e: MessageEvent) => {
		if (e.data && e.data.type === 'sync') {
			console.log('[sync] BroadcastChannel message received');
			callback();
		}
	};
	bc?.addEventListener('message', onBcMessage);

	const onStorage = (e: StorageEvent) => {
		if (e.key === LS_PING_KEY) {
			console.log('[sync] storage event received');
			callback();
		}
	};
	window.addEventListener('storage', onStorage);

	// При восстановлении из BFCache (нажатие "назад" или возврат на свернутую вкладку
	// после долгого простоя) — форсим refetch, иначе вкладка покажет stale-данные.
	const onPageShow = (e: PageTransitionEvent) => {
		if (e.persisted) {
			console.log('[sync] page restored from BFCache → forcing refetch');
			callback();
		}
	};
	window.addEventListener('pageshow', onPageShow);

	return () => {
		unsubscribeFb();
		bc?.removeEventListener('message', onBcMessage);
		window.removeEventListener('storage', onStorage);
		window.removeEventListener('pageshow', onPageShow);
	};
}

// Уведомить ВСЕХ клиентов об изменении. Использует ТРИ канала параллельно
// для максимальной надёжности:
//   1) BroadcastChannel — мгновенно, между вкладками одного браузера
//   2) localStorage — fallback к BC, между вкладками того же origin
//   3) Firebase RTDB — для других устройств / браузеров (~500 мс)
export function notifyAllClients(): void {
	const now = Date.now();

	try { bc?.postMessage({ type: 'sync', ts: now }); } catch (e) { console.error('[sync] BC postMessage failed:', e); }

	try { localStorage.setItem(LS_PING_KEY, String(now)); } catch (e) { console.warn('[sync] LS ping failed:', e); }

	set(syncNodeRef, now).catch((err) => {
		console.error('[sync] FB notifyAllClients failed:', err);
	});
}
