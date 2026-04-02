import { useState, useEffect, useRef, useCallback } from 'react';
import { Task } from '../types';

export interface TimerState {
  elapsed: number;    // total seconds including current run
  running: boolean;
}

/**
 * useTaskTimer
 * Tracks elapsed time for a single task.
 * Derives live `elapsed` from `task.totalTimeSeconds` + time since `task.timerStartedAt`.
 */
export function useTaskTimer(task: Task): TimerState {
  const computeElapsed = useCallback(() => {
    const base = task.totalTimeSeconds ?? 0;
    if (!task.timerStartedAt) return base;
    const diff = Math.floor((Date.now() - new Date(task.timerStartedAt).getTime()) / 1000);
    return base + Math.max(0, diff);
  }, [task.totalTimeSeconds, task.timerStartedAt]);

  const [elapsed, setElapsed] = useState(computeElapsed);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const running = !!task.timerStartedAt;

  // Sync when task changes (e.g. after pause/start saved to context)
  useEffect(() => {
    setElapsed(computeElapsed());
  }, [computeElapsed]);

  // Live tick when running
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setElapsed(computeElapsed());
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, computeElapsed]);

  return { elapsed, running };
}

/** Format seconds → MM:SS or H:MM:SS */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  if (h > 0) return `${h}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}
