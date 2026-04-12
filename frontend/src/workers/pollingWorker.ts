// Web Worker для надежного поллинга (не блокируется браузером в фоновых вкладках)

let intervalId: number | null = null;

self.onmessage = (e) => {
	if (e.data.type === 'START') {
		const interval = e.data.interval || 4000;
		// Очищаем предыдущий интервал, если был
		if (intervalId) clearInterval(intervalId);

		intervalId = setInterval(() => {
			self.postMessage({ type: 'TICK' });
		}, interval);
	} else if (e.data.type === 'STOP') {
		if (intervalId) {
			clearInterval(intervalId);
			intervalId = null;
		}
	}
};
