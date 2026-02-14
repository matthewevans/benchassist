import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTheme } from './useTheme.ts';

const STORAGE_KEY = 'benchassist_theme';

function mockMatchMedia(prefersDark: boolean) {
  const listeners: Array<(e: MediaQueryListEvent) => void> = [];
  const mql = {
    matches: prefersDark,
    media: '(prefers-color-scheme: dark)',
    addEventListener: vi.fn((event: string, cb: (e: MediaQueryListEvent) => void) => {
      if (event === 'change') listeners.push(cb);
    }),
    removeEventListener: vi.fn((event: string, cb: (e: MediaQueryListEvent) => void) => {
      if (event === 'change') {
        const idx = listeners.indexOf(cb);
        if (idx !== -1) listeners.splice(idx, 1);
      }
    }),
    dispatchEvent: vi.fn(),
    onchange: null,
  };
  window.matchMedia = vi.fn().mockReturnValue(mql);
  return { mql, listeners };
}

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    mockMatchMedia(false);
  });

  it('defaults to system preference (light) when no localStorage and matchMedia returns false', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useTheme());

    expect(result.current.preference).toBe('system');
    expect(result.current.resolved).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('defaults to system preference (dark) when matchMedia matches dark', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useTheme());

    expect(result.current.preference).toBe('system');
    expect(result.current.resolved).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('cycles through system -> light -> dark -> system', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useTheme());

    expect(result.current.preference).toBe('system');

    act(() => result.current.cycle());
    expect(result.current.preference).toBe('light');

    act(() => result.current.cycle());
    expect(result.current.preference).toBe('dark');

    act(() => result.current.cycle());
    expect(result.current.preference).toBe('system');
  });

  it('persists preference to localStorage', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useTheme());

    act(() => result.current.cycle());
    expect(localStorage.getItem(STORAGE_KEY)).toBe('light');

    act(() => result.current.cycle());
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');

    act(() => result.current.cycle());
    expect(localStorage.getItem(STORAGE_KEY)).toBe('system');
  });

  it('restores preference from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, 'dark');
    mockMatchMedia(false);
    const { result } = renderHook(() => useTheme());

    expect(result.current.preference).toBe('dark');
    expect(result.current.resolved).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
