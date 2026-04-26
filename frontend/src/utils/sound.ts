// src/utils/sound.ts
// Воспроизведение звука уведомления через Web Audio API.
// Перенесено из EcoPrint_old/static/js/utils.js (playNotificationSound).
// Преимущество: не нужен внешний MP3/OGG, не блокируется автоплеем после первого клика.

let audioContext: AudioContext | null = null;

export function playNotificationSound(): void {
	try {
		if (!audioContext) {
			const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
			if (!Ctx) return;
			audioContext = new Ctx();
		}

		// Если браузер "усыпил" контекст (требование автоплея) — будим его
		if (audioContext.state === 'suspended') {
			audioContext.resume();
		}

		const oscillator = audioContext.createOscillator();
		const gainNode = audioContext.createGain();

		oscillator.connect(gainNode);
		gainNode.connect(audioContext.destination);

		oscillator.frequency.value = 800; // Гц
		oscillator.type = 'sine';

		// Плавное затухание
		gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
		gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

		oscillator.start(audioContext.currentTime);
		oscillator.stop(audioContext.currentTime + 0.5);
	} catch (e) {
		console.warn('Не удалось воспроизвести звук:', e);
	}
}

// Проверка глобальных настроек звука из localStorage
export function isSoundEnabled(): boolean {
	try {
		const raw = localStorage.getItem('notify_settings');
		if (!raw) return true; // По умолчанию включено
		const parsed = JSON.parse(raw);
		return parsed.sound !== false;
	} catch {
		return true;
	}
}

export function playIfEnabled(): void {
	if (isSoundEnabled()) playNotificationSound();
}
