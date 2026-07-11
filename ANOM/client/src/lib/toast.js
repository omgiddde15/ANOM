const listeners = new Set();

export function toast(message, type = 'success') {
  listeners.forEach((listener) => listener({ id: Date.now() + Math.random(), message, type }));
}

export function subscribeToToasts(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
