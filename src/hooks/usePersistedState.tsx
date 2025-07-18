import { useState, useEffect, useCallback } from 'react';
import { Storage, DebouncedStorage } from '@/utils/storage';

interface UsePersistedStateOptions {
  debounceMs?: number;
  serialize?: (value: any) => any;
  deserialize?: (value: any) => any;
}

export function usePersistedState<T>(
  key: string,
  defaultValue: T,
  options: UsePersistedStateOptions = {}
): [T, (value: T | ((prev: T) => T)) => void] {
  const {
    debounceMs = 500,
    serialize = (v) => v,
    deserialize = (v) => v
  } = options;

  // Initialize state from storage
  const [state, setState] = useState<T>(() => {
    const stored = Storage.get(key, null);
    if (stored !== null) {
      try {
        return deserialize(stored);
      } catch {
        // If deserialization fails, use default
        return defaultValue;
      }
    }
    return defaultValue;
  });

  // Persist state changes
  useEffect(() => {
    if (debounceMs > 0) {
      DebouncedStorage.set(key, serialize(state), debounceMs);
    } else {
      Storage.set(key, serialize(state));
    }
  }, [key, state, serialize, debounceMs]);

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setState(prevState => {
      const newValue = typeof value === 'function' 
        ? (value as (prev: T) => T)(prevState)
        : value;
      return newValue;
    });
  }, []);

  return [state, setValue];
}

// Specialized hooks for common use cases
export function usePersistedString(key: string, defaultValue: string = '') {
  return usePersistedState(key, defaultValue);
}

export function usePersistedBoolean(key: string, defaultValue: boolean = false) {
  return usePersistedState(key, defaultValue);
}

export function usePersistedObject<T extends object>(key: string, defaultValue: T) {
  return usePersistedState(key, defaultValue);
}

export function usePersistedArray<T>(key: string, defaultValue: T[] = []) {
  return usePersistedState(key, defaultValue);
}