import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function installMemoryLocalStorage() {
  const storage = new Map<string, string>();
  const localStorageMock: Storage = {
    get length() {
      return storage.size;
    },
    clear: vi.fn(() => {
      storage.clear();
    }),
    getItem: vi.fn((key: string) => storage.get(key) ?? null),
    key: vi.fn((index: number) => Array.from(storage.keys())[index] ?? null),
    removeItem: vi.fn((key: string) => {
      storage.delete(key);
    }),
    setItem: vi.fn((key: string, value: string) => {
      storage.set(key, String(value));
    }),
  };

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: localStorageMock,
  });

  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: localStorageMock,
    });
  }
}

installMemoryLocalStorage();

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
}));

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'zh' },
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));
