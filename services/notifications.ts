import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Task, Routine } from '../types';

// ─── Handler config ──────────────────────────────────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ─── Permissions ─────────────────────────────────────────────────────────────

export async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function getPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
  if (Platform.OS === 'web') return 'denied';
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

// ─── Task notification ────────────────────────────────────────────────────────

/**
 * Schedule a one-time notification for a task at its defined time/date.
 * Returns the notification identifier (use it to cancel later).
 */
export async function scheduleTaskNotification(task: Task): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  if (!task.time) return null;

  try {
    const [hours, minutes] = task.time.split(':').map(Number);
    const now = new Date();

    // Use task date or today
    const targetDate = task.date ? new Date(task.date) : new Date();
    targetDate.setHours(hours, minutes, 0, 0);

    // Skip if in the past
    if (targetDate.getTime() <= now.getTime()) return null;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚡ Tâche à faire',
        body: task.title,
        data: { taskId: task.id, type: 'task' },
        sound: true,
        badge: 1,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: targetDate,
      },
    });

    return id;
  } catch (e) {
    console.warn('[Notifications] scheduleTaskNotification failed:', e);
    return null;
  }
}

// ─── Routine notification ─────────────────────────────────────────────────────

/**
 * Schedule a daily recurring notification for a routine.
 * Returns the notification identifier.
 */
export async function scheduleRoutineNotification(
  routine: Routine,
  defaultHour = 8,
  defaultMinute = 0
): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  try {
    let hour = defaultHour;
    let minute = defaultMinute;

    if (routine.time) {
      const parts = routine.time.split(':').map(Number);
      hour = parts[0] ?? defaultHour;
      minute = parts[1] ?? defaultMinute;
    }

    // Fix: use the correct trigger type based on repeat frequency
    const isWeekly = routine.repeat === 'weekly';

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: isWeekly ? '📅 Routine hebdo' : '🔄 Routine du jour',
        body: routine.title,
        data: { routineId: routine.id, type: 'routine' },
        sound: true,
        badge: 1,
      },
      trigger: isWeekly
        ? {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: 2, // Monday by default
            hour,
            minute,
          }
        : {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour,
            minute,
          },
    });

    return id;
  } catch (e) {
    console.warn('[Notifications] scheduleRoutineNotification failed:', e);
    return null;
  }
}

// ─── Cancel ───────────────────────────────────────────────────────────────────

export async function cancelNotification(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (e) {
    console.warn('[Notifications] cancelNotification failed:', e);
  }
}

export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    console.warn('[Notifications] cancelAllNotifications failed:', e);
  }
}

// ─── List scheduled ───────────────────────────────────────────────────────────

export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  if (Platform.OS === 'web') return [];
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch {
    return [];
  }
}

// ─── Android channel ─────────────────────────────────────────────────────────

export async function setupAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Rappels ProductivityAI',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#58CC02',
    sound: 'default',
  });
}
