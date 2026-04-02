import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Task, Routine, Project, UserStats } from '../types';
import * as storage from '../services/storage';
import * as notifService from '../services/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIF_IDS_KEY = '@notif_scheduled_ids';

async function loadNotifIds(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(NOTIF_IDS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

async function saveNotifIds(ids: Record<string, string>): Promise<void> {
  await AsyncStorage.setItem(NOTIF_IDS_KEY, JSON.stringify(ids));
}

interface AppContextType {
  // Data
  tasks: Task[];
  routines: Routine[];
  projects: Project[];
  stats: UserStats;
  loading: boolean;

  // Task actions
  addTask: (task: Task) => Promise<void>;
  updateTask: (task: Task) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  toggleTaskTimer: (id: string) => Promise<void>;

  // Routine actions
  addRoutine: (routine: Routine) => Promise<void>;
  updateRoutine: (routine: Routine) => Promise<void>;
  deleteRoutine: (id: string) => Promise<void>;
  toggleRoutine: (id: string) => Promise<void>;

  // Project actions
  addProject: (project: Project) => Promise<void>;
  updateProject: (project: Project) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  // Helpers
  getProjectProgress: (projectId: string) => number;
  getProjectTasks: (projectId: string) => Task[];
  reorderProjectTasks: (projectId: string, reorderedTasks: Task[]) => Promise<void>;
  refreshAll: () => Promise<void>;
  resetAllData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<UserStats>({
    streak: 7,
    totalXP: 1240,
    level: 5,
    tasksCompleted: 23,
    routinesCompleted: 15,
  });
  const [loading, setLoading] = useState(true);
  const [notifEnabled, setNotifEnabled] = useState(false);

  // Check notification permission on mount
  useEffect(() => {
    notifService.getPermissionStatus().then(s => setNotifEnabled(s === 'granted'));
  }, []);

  const refreshAll = useCallback(async () => {
    const [t, r, p, s] = await Promise.all([
      storage.getTasks(),
      storage.getRoutines(),
      storage.getProjects(),
      storage.getStats(),
    ]);
    setTasks(t);
    setRoutines(r);
    setProjects(p);
    setStats(s);
  }, []);

  useEffect(() => {
    (async () => {
      await storage.seedIfEmpty();
      // Check streak reset on every launch
      const statsWithStreak = await storage.checkAndUpdateStreak();
      const [t, r, p] = await Promise.all([
        storage.getTasks(),
        storage.getRoutines(),
        storage.getProjects(),
      ]);
      setTasks(t);
      setRoutines(r);
      setProjects(p);
      setStats(statsWithStreak);
      setLoading(false);
    })();
  }, []);

  // ─── Task actions ────────────────────────────────────────────────────────────

  const addTask = useCallback(async (task: Task) => {
    await storage.addTask(task);
    setTasks(prev => [task, ...prev]);
    // Auto-schedule notification if permission granted
    if (notifEnabled && task.time) {
      const nid = await notifService.scheduleTaskNotification(task);
      if (nid) {
        const ids = await loadNotifIds();
        await saveNotifIds({ ...ids, [task.id]: nid });
      }
    }
  }, [notifEnabled]);

  const updateTask = useCallback(async (task: Task) => {
    await storage.updateTask(task);
    setTasks(prev => prev.map(t => (t.id === task.id ? task : t)));
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    await storage.deleteTask(id);
    setTasks(prev => prev.filter(t => t.id !== id));
    // Cancel associated notification
    const ids = await loadNotifIds();
    if (ids[id]) {
      await notifService.cancelNotification(ids[id]);
      delete ids[id];
      await saveNotifIds(ids);
    }
  }, []);

  const toggleTask = useCallback(async (id: string) => {
    let xpToAdd = 0;
    let wasCompleted = false;
    setTasks(prev => {
      const task = prev.find(t => t.id === id);
      if (!task) return prev;
      const updated = { ...task, completed: !task.completed };
      // Stop timer if task is completed
      if (updated.completed && task.timerStartedAt) {
        const extra = Math.floor(
          (Date.now() - new Date(task.timerStartedAt).getTime()) / 1000
        );
        updated.totalTimeSeconds = (task.totalTimeSeconds ?? 0) + Math.max(0, extra);
        updated.timerStartedAt = undefined;
      }
      if (updated.completed) {
        xpToAdd = updated.xp;
        wasCompleted = true;
      }
      storage.updateTask(updated);
      return prev.map(t => (t.id === id ? updated : t));
    });
    setTimeout(async () => {
      if (wasCompleted && xpToAdd > 0) {
        const newStats = await storage.addXP(xpToAdd);
        await storage.incrementTasksCompleted();
        await storage.recordDailyStreak(newStats.streak);
        setStats(newStats);
      }
    }, 0);
  }, []);

  // ─── Task timer ──────────────────────────────────────────────────────────────

  const toggleTaskTimer = useCallback(async (id: string) => {
    setTasks(prev => {
      const task = prev.find(t => t.id === id);
      if (!task) return prev;
      const now = new Date().toISOString();
      let updated: Task;
      if (task.timerStartedAt) {
        // Pause: accumulate elapsed seconds
        const extra = Math.floor(
          (Date.now() - new Date(task.timerStartedAt).getTime()) / 1000
        );
        updated = {
          ...task,
          totalTimeSeconds: (task.totalTimeSeconds ?? 0) + Math.max(0, extra),
          timerStartedAt: undefined,
        };
      } else {
        // Start
        updated = { ...task, timerStartedAt: now };
      }
      storage.updateTask(updated);
      return prev.map(t => (t.id === id ? updated : t));
    });
  }, []);

  // ─── Routine actions ─────────────────────────────────────────────────────────

  const addRoutine = useCallback(async (routine: Routine) => {
    await storage.addRoutine(routine);
    setRoutines(prev => [routine, ...prev]);
    // Auto-schedule daily/weekly notification
    if (notifEnabled) {
      const nid = await notifService.scheduleRoutineNotification(routine);
      if (nid) {
        const ids = await loadNotifIds();
        await saveNotifIds({ ...ids, [routine.id]: nid });
      }
    }
  }, [notifEnabled]);

  const updateRoutine = useCallback(async (routine: Routine) => {
    await storage.updateRoutine(routine);
    setRoutines(prev => prev.map(r => (r.id === routine.id ? routine : r)));
  }, []);

  const deleteRoutine = useCallback(async (id: string) => {
    await storage.deleteRoutine(id);
    setRoutines(prev => prev.filter(r => r.id !== id));
    // Cancel associated notification
    const ids = await loadNotifIds();
    if (ids[id]) {
      await notifService.cancelNotification(ids[id]);
      delete ids[id];
      await saveNotifIds(ids);
    }
  }, []);

  const toggleRoutine = useCallback(async (id: string) => {
    let xpToAdd = 0;
    let wasCompleted = false;
    setRoutines(prev => {
      const routine = prev.find(r => r.id === id);
      if (!routine) return prev;
      const updated = {
        ...routine,
        completed: !routine.completed,
        streak: !routine.completed ? routine.streak + 1 : Math.max(0, routine.streak - 1),
      };
      if (updated.completed) {
        xpToAdd = updated.xp;
        wasCompleted = true;
      }
      storage.updateRoutine(updated);
      return prev.map(r => (r.id === id ? updated : r));
    });
    setTimeout(async () => {
      if (wasCompleted && xpToAdd > 0) {
        const newStats = await storage.addXP(xpToAdd);
        await storage.incrementRoutinesCompleted();
        await storage.incrementDailyRoutineCompletion();
        await storage.recordDailyStreak(newStats.streak);
        setStats(newStats);
      }
    }, 0);
  }, []);

  // ─── Project actions ─────────────────────────────────────────────────────────

  const addProject = useCallback(async (project: Project) => {
    await storage.addProject(project);
    setProjects(prev => [project, ...prev]);
  }, []);

  const updateProject = useCallback(async (project: Project) => {
    await storage.updateProject(project);
    setProjects(prev => prev.map(p => (p.id === project.id ? project : p)));
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    await storage.deleteProject(id);
    setProjects(prev => prev.filter(p => p.id !== id));
  }, []);

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  const getProjectTasks = useCallback((projectId: string) => {
    return tasks.filter(t => t.projectId === projectId);
  }, [tasks]);

  const reorderProjectTasks = useCallback(async (projectId: string, reorderedTasks: Task[]) => {
    const ids = reorderedTasks.map(t => t.id);
    setTasks(prev => {
      const others = prev.filter(t => t.projectId !== projectId && !ids.includes(t.id));
      return [...reorderedTasks, ...others];
    });
    for (const task of reorderedTasks) {
      await storage.updateTask(task);
    }
    const project = projects.find(p => p.id === projectId);
    if (project) {
      const updated = { ...project, taskIds: ids };
      await storage.updateProject(updated);
      setProjects(prev => prev.map(p => p.id === projectId ? updated : p));
    }
  }, [projects]);

  const resetAllData = useCallback(async () => {
    await AsyncStorage.clear();
    setTasks([]);
    setRoutines([]);
    setProjects([]);
    setStats({ streak: 0, totalXP: 0, level: 1, tasksCompleted: 0, routinesCompleted: 0 });
  }, []);

  const getProjectProgress = useCallback((projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project || project.taskIds.length === 0) return 0;
    const projectTasks = tasks.filter(t => project.taskIds.includes(t.id));
    if (projectTasks.length === 0) return 0;
    const completed = projectTasks.filter(t => t.completed).length;
    return completed / projectTasks.length;
  }, [projects, tasks]);

  return (
    <AppContext.Provider
      value={{
        tasks,
        routines,
        projects,
        stats,
        loading,
        addTask,
        updateTask,
        deleteTask,
        toggleTask,
        toggleTaskTimer,
        addRoutine,
        updateRoutine,
        deleteRoutine,
        toggleRoutine,
        addProject,
        updateProject,
        deleteProject,
        getProjectProgress,
        getProjectTasks,
        reorderProjectTasks,
        refreshAll,
        resetAllData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
