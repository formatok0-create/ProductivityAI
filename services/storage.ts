import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task, Routine, Project, UserStats } from '../types';

const KEYS = {
  TASKS: '@productivity_tasks',
  ROUTINES: '@productivity_routines',
  PROJECTS: '@productivity_projects',
  STATS: '@productivity_stats',
};

const DEFAULT_STATS: UserStats = {
  streak: 0,
  totalXP: 0,
  level: 1,
  tasksCompleted: 0,
  routinesCompleted: 0,
};

// ─── Streak logic ─────────────────────────────────────────────────────────────

const LAST_ACTIVE_KEY = '@productivity_last_active';

/**
 * Call once on app launch. Resets streak to 0 if the user missed yesterday.
 */
export async function checkAndUpdateStreak(): Promise<UserStats> {
  const today = new Date().toISOString().split('T')[0];
  const lastActive = await AsyncStorage.getItem(LAST_ACTIVE_KEY);

  const stats = await getStats();

  if (!lastActive) {
    // First launch
    await AsyncStorage.setItem(LAST_ACTIVE_KEY, today);
    return stats;
  }

  const last = new Date(lastActive);
  const now = new Date(today);
  const diffDays = Math.floor((now.getTime() - last.getTime()) / 86_400_000);

  if (diffDays === 0) return stats; // same day, no change

  if (diffDays > 1) {
    // Missed at least one day — reset streak
    stats.streak = 0;
    await AsyncStorage.setItem(KEYS.STATS, JSON.stringify(stats));
  }

  // Update last active date
  await AsyncStorage.setItem(LAST_ACTIVE_KEY, today);
  return stats;
}

/**
 * Increment streak by 1 (call when user completes first item of the day).
 */
export async function incrementStreak(): Promise<UserStats> {
  const today = new Date().toISOString().split('T')[0];
  const lastActive = await AsyncStorage.getItem(LAST_ACTIVE_KEY);
  const stats = await getStats();

  // Only increment once per day
  if (lastActive === today) return stats;

  stats.streak += 1;
  await AsyncStorage.setItem(KEYS.STATS, JSON.stringify(stats));
  await AsyncStorage.setItem(LAST_ACTIVE_KEY, today);
  return stats;
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export async function getTasks(): Promise<Task[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.TASKS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function saveTasks(tasks: Task[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.TASKS, JSON.stringify(tasks));
}

export async function addTask(task: Task): Promise<void> {
  const tasks = await getTasks();
  tasks.unshift(task);
  await saveTasks(tasks);
}

export async function updateTask(updated: Task): Promise<void> {
  const tasks = await getTasks();
  const idx = tasks.findIndex(t => t.id === updated.id);
  if (idx !== -1) {
    tasks[idx] = updated;
    await saveTasks(tasks);
  }
}

export async function deleteTask(id: string): Promise<void> {
  const tasks = await getTasks();
  await saveTasks(tasks.filter(t => t.id !== id));
}

// ─── Routines ─────────────────────────────────────────────────────────────────

export async function getRoutines(): Promise<Routine[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.ROUTINES);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function saveRoutines(routines: Routine[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.ROUTINES, JSON.stringify(routines));
}

export async function addRoutine(routine: Routine): Promise<void> {
  const routines = await getRoutines();
  routines.unshift(routine);
  await saveRoutines(routines);
}

export async function updateRoutine(updated: Routine): Promise<void> {
  const routines = await getRoutines();
  const idx = routines.findIndex(r => r.id === updated.id);
  if (idx !== -1) {
    routines[idx] = updated;
    await saveRoutines(routines);
  }
}

export async function deleteRoutine(id: string): Promise<void> {
  const routines = await getRoutines();
  await saveRoutines(routines.filter(r => r.id !== id));
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export async function getProjects(): Promise<Project[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.PROJECTS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function saveProjects(projects: Project[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.PROJECTS, JSON.stringify(projects));
}

export async function addProject(project: Project): Promise<void> {
  const projects = await getProjects();
  projects.unshift(project);
  await saveProjects(projects);
}

export async function updateProject(updated: Project): Promise<void> {
  const projects = await getProjects();
  const idx = projects.findIndex(p => p.id === updated.id);
  if (idx !== -1) {
    projects[idx] = updated;
    await saveProjects(projects);
  }
}

export async function deleteProject(id: string): Promise<void> {
  const projects = await getProjects();
  await saveProjects(projects.filter(p => p.id !== id));
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function getStats(): Promise<UserStats> {
  try {
    const data = await AsyncStorage.getItem(KEYS.STATS);
    return data ? JSON.parse(data) : DEFAULT_STATS;
  } catch {
    return DEFAULT_STATS;
  }
}

export async function addXP(amount: number): Promise<UserStats> {
  const stats = await getStats();
  stats.totalXP += amount;
  stats.level = Math.floor(stats.totalXP / 300) + 1;
  await AsyncStorage.setItem(KEYS.STATS, JSON.stringify(stats));
  return stats;
}

export async function incrementTasksCompleted(): Promise<void> {
  const stats = await getStats();
  stats.tasksCompleted += 1;
  stats.routinesCompleted = stats.routinesCompleted; // keep unchanged
  await AsyncStorage.setItem(KEYS.STATS, JSON.stringify(stats));
}

export async function incrementRoutinesCompleted(): Promise<void> {
  const stats = await getStats();
  stats.routinesCompleted += 1;
  await AsyncStorage.setItem(KEYS.STATS, JSON.stringify(stats));
}

// ─── Seed data (first launch) ─────────────────────────────────────────────────

export async function seedIfEmpty(): Promise<void> {
  const tasks = await getTasks();
  if (tasks.length > 0) return;

  const now = new Date().toISOString();
  const todayDate = new Date().toISOString().split('T')[0];

  const seedTasks: Task[] = [
    {
      id: 'task-1',
      title: 'Finir le rapport Q2',
      time: '10:00',
      date: todayDate,
      completed: false,
      priority: 'high',
      createdAt: now,
      xp: 30,
    },
    {
      id: 'task-2',
      title: 'Appel client Acme Corp',
      time: '14:30',
      date: todayDate,
      completed: false,
      priority: 'medium',
      createdAt: now,
      xp: 20,
    },
    {
      id: 'task-3',
      title: 'Review PR GitHub',
      time: '16:00',
      completed: false,
      priority: 'low',
      createdAt: now,
      xp: 15,
    },
  ];

  const seedRoutines: Routine[] = [
    {
      id: 'routine-1',
      title: 'Méditation matinale',
      time: '07:00',
      repeat: 'daily',
      completed: false,
      streak: 0,
      color: '#CE82FF',
      icon: 'meditation',
      createdAt: now,
      xp: 25,
    },
    {
      id: 'routine-2',
      title: 'Sport 30 min',
      time: '07:30',
      repeat: 'daily',
      completed: false,
      streak: 0,
      color: '#1CB0F6',
      icon: 'sport',
      createdAt: now,
      xp: 40,
    },
    {
      id: 'routine-3',
      title: 'Lecture tech',
      time: '20:00',
      repeat: 'weekly',
      completed: false,
      streak: 0,
      color: '#FF9600',
      icon: 'reading',
      createdAt: now,
      xp: 20,
    },
  ];

  const projectId = 'project-1';
  const seedProjects: Project[] = [
    {
      id: projectId,
      title: 'Lancement App V2',
      description: 'Développer et lancer la nouvelle version',
      color: '#58CC02',
      deadline: '2026-06-01',
      createdAt: now,
      taskIds: ['task-1', 'task-2'],
      xp: 200,
    },
    {
      id: 'project-2',
      title: 'Refonte Site Web',
      description: 'Redesign complet du site corporate',
      color: '#CE82FF',
      deadline: '2026-05-15',
      createdAt: now,
      taskIds: ['task-3'],
      xp: 150,
    },
  ];

  await saveTasks(seedTasks);
  await saveRoutines(seedRoutines);
  await saveProjects(seedProjects);
  // Fresh users start at zero
  await AsyncStorage.setItem(KEYS.STATS, JSON.stringify(DEFAULT_STATS));
}
