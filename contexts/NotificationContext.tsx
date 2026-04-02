import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as notifService from '../services/notifications';

const STORAGE_KEY = '@notif_settings';

export interface NotificationSettings {
  permissionGranted: boolean;
  tasksEnabled: boolean;
  routinesEnabled: boolean;
  routineDefaultHour: number;
  routineDefaultMinute: number;
  // Map: itemId → notificationId
  scheduledIds: Record<string, string>;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  permissionGranted: false,
  tasksEnabled: true,
  routinesEnabled: true,
  routineDefaultHour: 8,
  routineDefaultMinute: 0,
  scheduledIds: {},
};

interface NotificationContextType {
  settings: NotificationSettings;
  loading: boolean;
  requestPermissions: () => Promise<boolean>;
  toggleTasksNotifications: (enabled: boolean) => Promise<void>;
  toggleRoutinesNotifications: (enabled: boolean) => Promise<void>;
  setRoutineDefaultTime: (hour: number, minute: number) => Promise<void>;
  scheduleForTask: (task: import('../types').Task) => Promise<void>;
  cancelForTask: (taskId: string) => Promise<void>;
  scheduleForRoutine: (routine: import('../types').Routine) => Promise<void>;
  cancelForRoutine: (routineId: string) => Promise<void>;
  cancelAll: () => Promise<void>;
  scheduledCount: number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [scheduledCount, setScheduledCount] = useState(0);

  // ─── Load persisted settings ───────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      await notifService.setupAndroidChannel();

      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<NotificationSettings>;
          setSettings(prev => ({ ...prev, ...parsed }));
        }
      } catch {
        // ignore
      }

      // Check real permission status
      const status = await notifService.getPermissionStatus();
      setSettings(prev => ({ ...prev, permissionGranted: status === 'granted' }));

      // Count scheduled
      const scheduled = await notifService.getScheduledNotifications();
      setScheduledCount(scheduled.length);

      setLoading(false);
    })();
  }, []);

  const persist = useCallback(async (updated: NotificationSettings) => {
    setSettings(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  const refreshCount = useCallback(async () => {
    const list = await notifService.getScheduledNotifications();
    setScheduledCount(list.length);
  }, []);

  // ─── Permissions ──────────────────────────────────────────────────────────

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    const granted = await notifService.requestPermissions();
    const updated = { ...settings, permissionGranted: granted };
    await persist(updated);
    return granted;
  }, [settings, persist]);

  // ─── Toggle settings ──────────────────────────────────────────────────────

  const toggleTasksNotifications = useCallback(async (enabled: boolean) => {
    const updated = { ...settings, tasksEnabled: enabled };
    await persist(updated);
    if (!enabled) {
      // Cancel all task notifications (those without routineId)
      const scheduled = await notifService.getScheduledNotifications();
      for (const notif of scheduled) {
        if (notif.content.data?.type === 'task') {
          await notifService.cancelNotification(notif.identifier);
        }
      }
      // Remove from scheduledIds
      const newIds = { ...updated.scheduledIds };
      for (const [key, nid] of Object.entries(newIds)) {
        if (key.startsWith('task-')) delete newIds[key];
      }
      await persist({ ...updated, scheduledIds: newIds });
    }
    await refreshCount();
  }, [settings, persist, refreshCount]);

  const toggleRoutinesNotifications = useCallback(async (enabled: boolean) => {
    const updated = { ...settings, routinesEnabled: enabled };
    await persist(updated);
    if (!enabled) {
      const scheduled = await notifService.getScheduledNotifications();
      for (const notif of scheduled) {
        if (notif.content.data?.type === 'routine') {
          await notifService.cancelNotification(notif.identifier);
        }
      }
      const newIds = { ...updated.scheduledIds };
      for (const [key] of Object.entries(newIds)) {
        if (key.startsWith('routine-')) delete newIds[key];
      }
      await persist({ ...updated, scheduledIds: newIds });
    }
    await refreshCount();
  }, [settings, persist, refreshCount]);

  const setRoutineDefaultTime = useCallback(async (hour: number, minute: number) => {
    const updated = { ...settings, routineDefaultHour: hour, routineDefaultMinute: minute };
    await persist(updated);
  }, [settings, persist]);

  // ─── Schedule/cancel individual items ────────────────────────────────────

  const scheduleForTask = useCallback(async (task: import('../types').Task) => {
    if (!settings.tasksEnabled || !settings.permissionGranted) return;
    // Cancel existing if any
    const existingId = settings.scheduledIds[task.id];
    if (existingId) await notifService.cancelNotification(existingId);

    const nid = await notifService.scheduleTaskNotification(task);
    if (nid) {
      const updated = {
        ...settings,
        scheduledIds: { ...settings.scheduledIds, [task.id]: nid },
      };
      await persist(updated);
    }
    await refreshCount();
  }, [settings, persist, refreshCount]);

  const cancelForTask = useCallback(async (taskId: string) => {
    const nid = settings.scheduledIds[taskId];
    if (nid) {
      await notifService.cancelNotification(nid);
      const newIds = { ...settings.scheduledIds };
      delete newIds[taskId];
      await persist({ ...settings, scheduledIds: newIds });
    }
    await refreshCount();
  }, [settings, persist, refreshCount]);

  const scheduleForRoutine = useCallback(async (routine: import('../types').Routine) => {
    if (!settings.routinesEnabled || !settings.permissionGranted) return;
    const existingId = settings.scheduledIds[routine.id];
    if (existingId) await notifService.cancelNotification(existingId);

    const nid = await notifService.scheduleRoutineNotification(
      routine,
      settings.routineDefaultHour,
      settings.routineDefaultMinute
    );
    if (nid) {
      const updated = {
        ...settings,
        scheduledIds: { ...settings.scheduledIds, [routine.id]: nid },
      };
      await persist(updated);
    }
    await refreshCount();
  }, [settings, persist, refreshCount]);

  const cancelForRoutine = useCallback(async (routineId: string) => {
    const nid = settings.scheduledIds[routineId];
    if (nid) {
      await notifService.cancelNotification(nid);
      const newIds = { ...settings.scheduledIds };
      delete newIds[routineId];
      await persist({ ...settings, scheduledIds: newIds });
    }
    await refreshCount();
  }, [settings, persist, refreshCount]);

  const cancelAll = useCallback(async () => {
    await notifService.cancelAllNotifications();
    const updated = { ...settings, scheduledIds: {} };
    await persist(updated);
    setScheduledCount(0);
  }, [settings, persist]);

  return (
    <NotificationContext.Provider
      value={{
        settings,
        loading,
        requestPermissions,
        toggleTasksNotifications,
        toggleRoutinesNotifications,
        setRoutineDefaultTime,
        scheduleForTask,
        cancelForTask,
        scheduleForRoutine,
        cancelForRoutine,
        cancelAll,
        scheduledCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
