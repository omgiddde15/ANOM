import { useEffect, useState } from 'react';
import { subscribeToToasts } from '../lib/toast';

export default function ToastViewport() {
  const [items, setItems] = useState([]);
  useEffect(() => subscribeToToasts((item) => {
    setItems((current) => [...current, item]);
    setTimeout(() => setItems((current) => current.filter((toast) => toast.id !== item.id)), 4200);
  }), []);

  return <div className="pointer-events-none fixed inset-x-4 bottom-5 z-50 flex flex-col items-end gap-3 sm:left-auto sm:w-96" aria-live="polite">
    {items.map((item) => <div key={item.id} role="status" className={`pointer-events-auto w-full animate-[fade-in_180ms_ease-out] rounded-2xl px-4 py-3 text-sm font-semibold shadow-xl ring-1 ${item.type === 'error' ? 'bg-rose-50 text-rose-800 ring-rose-200' : 'bg-white text-indigo-950 ring-indigo-100'}`}>
      <span className="mr-2">{item.type === 'error' ? '!' : '✓'}</span>{item.message}
    </div>)}
  </div>;
}
