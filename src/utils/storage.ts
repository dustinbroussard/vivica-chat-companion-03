// Storage utilities with graceful fallbacks
export class Storage {
  private static isAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, 'test');
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  static get<T>(key: string, defaultValue: T): T {
    if (!this.isAvailable()) {
      return defaultValue;
    }

    try {
      const item = localStorage.getItem(key);
      if (item === null) {
        return defaultValue;
      }
      return JSON.parse(item);
    } catch {
      return defaultValue;
    }
  }

  static set<T>(key: string, value: T): boolean {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      // Storage might be full or unavailable
      return false;
    }
  }

  static remove(key: string): boolean {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  static clear(): boolean {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      localStorage.clear();
      return true;
    } catch {
      return false;
    }
  }
}

// Debounced storage writer
export class DebouncedStorage {
  private static timers: Map<string, NodeJS.Timeout> = new Map();

  static set<T>(key: string, value: T, delay: number = 500): void {
    // Clear existing timer for this key
    const existingTimer = this.timers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      Storage.set(key, value);
      this.timers.delete(key);
    }, delay);

    this.timers.set(key, timer);
  }

  static flush(key?: string): void {
    if (key) {
      const timer = this.timers.get(key);
      if (timer) {
        clearTimeout(timer);
        this.timers.delete(key);
      }
    } else {
      // Flush all pending writes
      this.timers.forEach((timer, key) => {
        clearTimeout(timer);
        this.timers.delete(key);
      });
    }
  }
}

// Storage keys constants
export const STORAGE_KEYS = {
  THEME: 'vivica-theme',
  API_KEY: 'vivica-api-key',
  SELECTED_MODEL: 'vivica-selected-model',
  CONVERSATIONS: 'vivica-conversations',
  PROFILES: 'vivica-profiles',
  CURRENT_PROFILE: 'vivica-current-profile',
  SETTINGS: 'vivica-settings',
  INSTALL_PROMPT_DISMISSED: 'vivica-install-dismissed',
  LAST_INSTALL_PROMPT: 'vivica-last-install-prompt'
} as const;