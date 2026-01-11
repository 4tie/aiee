import { useEffect, useState } from 'react';

export function useSyncState<T>(key: string, initialState: T) {
  const [state, setState] = useState<T>(() => {
    const stored = localStorage.getItem(key);
    if (stored === null) return initialState;
    try {
      return JSON.parse(stored);
    } catch {
      return initialState;
    }
  });

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          setState(JSON.parse(e.newValue));
        } catch (err) {
          console.error('Failed to parse storage update', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  const setSyncedState = (value: T | ((prev: T) => T)) => {
    const newValue = value instanceof Function ? value(state) : value;
    localStorage.setItem(key, JSON.stringify(newValue));
    setState(newValue);
    // Notify other components in the same window
    window.dispatchEvent(new CustomEvent('sync-state-update', { detail: { key, value: newValue } }));
  };

  useEffect(() => {
    const handleLocalUpdate = (e: any) => {
      if (e.detail.key === key) {
        setState(e.detail.value);
      }
    };
    window.addEventListener('sync-state-update', handleLocalUpdate);
    return () => window.removeEventListener('sync-state-update', handleLocalUpdate);
  }, [key]);

  return [state, setSyncedState] as const;
}
