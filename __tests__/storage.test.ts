/**
 * Unit tests for storage business logic (XP, streak, stats).
 * Run with: npx jest __tests__/storage.test.ts
 *
 * These tests mock AsyncStorage so no device is needed.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Mock AsyncStorage ────────────────────────────────────────────────────────

const store: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(store[key] ?? null)),
  setItem: jest.fn((key: string, value: string) => {
    store[key] = value;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    delete store[key];
    return Promise.resolve();
  }),
}));

// Clear store between tests
beforeEach(() => {
  Object.keys(store).forEach(k => delete store[k]);
  jest.clearAllMocks();
});

// ─── Import after mocks are set up ────────────────────────────────────────────

import {
  getStats,
  addXP,
  checkAndUpdateStreak,
  incrementStreak,
  incrementTasksCompleted,
} from '../services/storage';

// ─── getStats ─────────────────────────────────────────────────────────────────

describe('getStats', () => {
  it('returns default stats when storage is empty', async () => {
    const stats = await getStats();
    expect(stats.streak).toBe(0);
    expect(stats.totalXP).toBe(0);
    expect(stats.level).toBe(1);
    expect(stats.tasksCompleted).toBe(0);
  });

  it('returns persisted stats', async () => {
    const saved = { streak: 5, totalXP: 600, level: 3, tasksCompleted: 10, routinesCompleted: 4 };
    store['@productivity_stats'] = JSON.stringify(saved);
    const stats = await getStats();
    expect(stats.streak).toBe(5);
    expect(stats.totalXP).toBe(600);
    expect(stats.level).toBe(3);
  });
});

// ─── addXP ────────────────────────────────────────────────────────────────────

describe('addXP', () => {
  it('increments XP correctly', async () => {
    const stats = await addXP(50);
    expect(stats.totalXP).toBe(50);
  });

  it('calculates level from XP (every 300 XP = 1 level)', async () => {
    await addXP(300); // level 2
    const stats = await addXP(0);
    expect(stats.level).toBe(2);
  });

  it('accumulates XP across multiple calls', async () => {
    await addXP(100);
    await addXP(200);
    const stats = await addXP(50);
    expect(stats.totalXP).toBe(350);
    expect(stats.level).toBe(2); // 350 / 300 = 1.16 → floor = 1 + 1 = 2
  });
});

// ─── incrementTasksCompleted ──────────────────────────────────────────────────

describe('incrementTasksCompleted', () => {
  it('increments tasksCompleted counter', async () => {
    await incrementTasksCompleted();
    await incrementTasksCompleted();
    const stats = await getStats();
    expect(stats.tasksCompleted).toBe(2);
  });
});

// ─── checkAndUpdateStreak ─────────────────────────────────────────────────────

describe('checkAndUpdateStreak', () => {
  it('does not change streak on first launch', async () => {
    const stats = await checkAndUpdateStreak();
    expect(stats.streak).toBe(0);
  });

  it('does not change streak when called twice on the same day', async () => {
    await checkAndUpdateStreak(); // sets last_active = today
    const stats = await checkAndUpdateStreak(); // same day
    expect(stats.streak).toBe(0);
  });

  it('resets streak to 0 when more than 1 day has elapsed', async () => {
    // Seed a non-zero streak and a last_active 2 days ago
    const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000).toISOString().split('T')[0];
    store['@productivity_last_active'] = twoDaysAgo;
    store['@productivity_stats'] = JSON.stringify({
      streak: 8, totalXP: 500, level: 2, tasksCompleted: 5, routinesCompleted: 3,
    });

    const stats = await checkAndUpdateStreak();
    expect(stats.streak).toBe(0);
  });

  it('preserves streak when only 1 day has elapsed', async () => {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0];
    store['@productivity_last_active'] = yesterday;
    store['@productivity_stats'] = JSON.stringify({
      streak: 5, totalXP: 200, level: 1, tasksCompleted: 3, routinesCompleted: 2,
    });

    const stats = await checkAndUpdateStreak();
    expect(stats.streak).toBe(5); // not reset — user was active yesterday
  });
});

// ─── incrementStreak ─────────────────────────────────────────────────────────

describe('incrementStreak', () => {
  it('increments streak on a new day', async () => {
    // last_active = yesterday
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0];
    store['@productivity_last_active'] = yesterday;

    const stats = await incrementStreak();
    expect(stats.streak).toBe(1);
  });

  it('does not increment streak twice on the same day', async () => {
    const today = new Date().toISOString().split('T')[0];
    store['@productivity_last_active'] = today;
    store['@productivity_stats'] = JSON.stringify({
      streak: 3, totalXP: 100, level: 1, tasksCompleted: 2, routinesCompleted: 1,
    });

    const stats = await incrementStreak();
    expect(stats.streak).toBe(3); // no change
  });
});
