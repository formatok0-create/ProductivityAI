export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'todo' | 'inprogress' | 'done';
export type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly';
export type ItemType = 'task' | 'routine' | 'project';

export interface Task {
  id: string;
  title: string;
  description?: string;
  date?: string;
  time?: string;
  completed: boolean;
  priority: TaskPriority;
  status?: TaskStatus;
  projectId?: string;
  createdAt: string;
  xp: number;
  // Chrono
  totalTimeSeconds?: number;   // total accumulated seconds
  timerStartedAt?: string;     // ISO timestamp of last start (null = paused)
}

export interface Routine {
  id: string;
  title: string;
  description?: string;
  time?: string;
  repeat: RepeatType;
  completed: boolean;
  streak: number;
  color: string;
  icon: string;
  createdAt: string;
  xp: number;
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  color: string;
  deadline?: string;
  createdAt: string;
  taskIds: string[];
  xp: number;
}

export interface UserStats {
  streak: number;
  totalXP: number;
  level: number;
  tasksCompleted: number;
  routinesCompleted: number;
}

export interface AIParseResult {
  type: ItemType;
  title: string;
  date?: string;
  time?: string;
  repeat?: RepeatType;
  subtasks?: string[];
}
