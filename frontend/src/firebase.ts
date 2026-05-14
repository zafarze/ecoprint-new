// Firebase конфигурация для real-time синхронизации статусов.
// Архитектура: при изменении админ пушит payload через 3 канала параллельно
//   1) BroadcastChannel — мгновенно, между вкладками одного браузера
//   2) localStorage event — fallback для тех же вкладок (старые браузеры)
//   3) Firebase RTDB — между разными устройствами/браузерами (~500 мс)
//
// Subscriber получает payload и применяет patch локально БЕЗ refetch — это
// делает sync действительно мгновенным даже при холодном старте Cloud Run.
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

const syncNodeRef = ref(db, 'ecoprint/sync/lastEvent');

export type SyncPayload =
	| { type: 'item-status'; orderId: number; itemId: number; status: string; orderStatus?: string; ts: number; src: string }
	| { type: 'order-received'; orderId: number; is_received: boolean; ts: number; src: string }
	| { type: 'orders-changed'; ts: number; src: string };

// Distributive Omit — без него TS не находит `orderId` в Omit<SyncPayload, 'ts' | 'src'>.
export type SyncPayloadInput = SyncPayload extends infer T
	? T extends { ts: number; src: string }
		? Omit<T, 'ts' | 'src'>
		: never
	: never;

const BC_NAME = 'ecoprint-sync';
const bc: BroadcastChannel | null =
	typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(BC_NAME) : null;

const LS_PING_KEY = 'ecoprint_sync_ping';

// Уникальный ID этой вкладки — чтобы НЕ применять собственные события дважды
// (мы уже применили их оптимистично перед отправкой).
const SELF_SRC = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// Подписка: получаем структурированные события (а не просто timestamp).
// Возвращает функцию отписки.
export function subscribeToSync(callback: (payload: SyncPayload | null) => void): () => void {
	let isFirst = true;
	const lastSeenTs = { current: 0 };

	const handle = (data: SyncPayload, channel: string) => {
		if (!data || typeof data !== 'object') return;
		// Игнорируем собственные события — мы уже применили их локально.
		if (data.src === SELF_SRC) return;
		// Дедупликация: один и тот же event мог прийти и по BC, и по FB.
		if (data.ts && data.ts <= lastSeenTs.current) return;
		if (data.ts) lastSeenTs.current = data.ts;
		console.log(`[sync] ${channel} →`, data);
		callback(data);
	};

	const unsubscribeFb = onValue(
		syncNodeRef,
		(snap) => {
			if (isFirst) { isFirst = false; return; }
			const val = snap.val();
			if (val && typeof val === 'object') handle(val as SyncPayload, 'FB');
			else if (val) callback(null); // legacy: просто timestamp — форсим refetch
		},
		(err) => { console.error('[sync] FB subscribe error:', err); }
	);

	const onBcMessage = (e: MessageEvent) => {
		if (e.data && typeof e.data === 'object') handle(e.data as SyncPayload, 'BC');
	};
	bc?.addEventListener('message', onBcMessage);

	const onStorage = (e: StorageEvent) => {
		if (e.key === LS_PING_KEY && e.newValue) {
			try {
				const data = JSON.parse(e.newValue);
				handle(data as SyncPayload, 'storage');
			} catch { /* старый формат — игнорим */ }
		}
	};
	window.addEventListener('storage', onStorage);

	const onPageShow = (e: PageTransitionEvent) => {
		if (e.persisted) {
			console.log('[sync] восстановление из BFCache → форсируем refetch');
			callback(null);
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

// Уведомить ВСЕХ клиентов о конкретном изменении (с payload).
// Subscriber сможет применить patch локально, не дёргая API.
export function notifyAllClients(payload?: SyncPayloadInput): void {
	const fullPayload: SyncPayload = payload
		? { ...payload, ts: Date.now(), src: SELF_SRC } as SyncPayload
		: { type: 'orders-changed', ts: Date.now(), src: SELF_SRC };

	try { bc?.postMessage(fullPayload); } catch (e) { console.error('[sync] BC postMessage failed:', e); }

	try { localStorage.setItem(LS_PING_KEY, JSON.stringify(fullPayload)); } catch (e) { console.warn('[sync] LS set failed:', e); }

	set(syncNodeRef, fullPayload).catch((err) => {
		console.error('[sync] FB notify failed:', err);
	});
}
