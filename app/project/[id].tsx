import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Colors, FontSize, FontWeight, Radii, Shadow, Spacing } from '../../constants/theme';
import { useApp } from '../../contexts/AppContext';
import { Task, TaskStatus } from '../../types';
import { AddModal } from '../../components/ui/AddModal';
import { EditTaskModal } from '../../components/ui/EditTaskModal';
import { PressableScale } from '../../components/ui/PressableScale';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { CheckButton } from '../../components/ui/CheckButton';
import { PriorityBadge } from '../../components/ui/PriorityBadge';
import { TaskCard } from '../../components/feature/TaskCard';
import { formatDuration } from '../../hooks/useTaskTimer';

// ─── Kanban column config ─────────────────────────────────────────────────────

const KANBAN_COLUMNS: {
  status: TaskStatus;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
}[] = [
  { status: 'todo',       label: 'À faire',  icon: 'radio-button-unchecked', color: Colors.textTertiary },
  { status: 'inprogress', label: 'En cours', icon: 'timelapse',              color: Colors.orange },
  { status: 'done',       label: 'Terminé',  icon: 'check-circle',           color: Colors.primary },
];

function getStatus(task: Task): TaskStatus {
  if (task.status) return task.status;
  return task.completed ? 'done' : 'todo';
}

// ─── Draggable Task Row ───────────────────────────────────────────────────────

interface DragRowProps {
  task: Task;
  drag: () => void;
  isActive: boolean;
  onToggle: () => void;
  onDelete?: () => void;
  onLongPress?: () => void;
  onTimerToggle?: () => void;
  color: string;
}

function DragTaskRow({ task, drag, isActive, onToggle, onDelete, onLongPress, onTimerToggle, color }: DragRowProps) {
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(isActive ? 1.03 : 1, { damping: 14 }) }],
    shadowOpacity: withTiming(isActive ? 0.18 : 0.06, { duration: 200 }),
    opacity: withTiming(task.completed ? 0.55 : 1, { duration: 200 }),
  }));

  return (
    <ScaleDecorator>
      <Animated.View style={[styles.dragCard, animStyle, isActive && styles.dragCardActive]}>
        <View style={[styles.dragColorStripe, { backgroundColor: color }]} />

        <CheckButton checked={task.completed} onToggle={onToggle} size={24} />

        <PressableScale
          onPress={undefined}
          onLongPress={onLongPress}
          style={styles.dragContent}
          scaleTo={0.98}
        >
          <Text style={[styles.dragTitle, task.completed && styles.strikethrough]} numberOfLines={2}>
            {task.title}
          </Text>
          <View style={styles.dragMeta}>
            {task.time ? (
              <View style={styles.timeChip}>
                <MaterialIcons name="access-time" size={10} color={Colors.textSecondary} />
                <Text style={styles.timeText}>{task.time}</Text>
              </View>
            ) : null}
            <PriorityBadge priority={task.priority} />
          </View>
        </PressableScale>

        {onTimerToggle && !task.completed ? (
          <PressableScale
            onPress={onTimerToggle}
            scaleTo={0.82}
            style={[styles.timerBtnSmall, task.timerStartedAt ? styles.timerBtnSmallActive : null]}
          >
            <MaterialIcons
              name={task.timerStartedAt ? 'pause' : 'play-arrow'}
              size={16}
              color={task.timerStartedAt ? '#fff' : Colors.primary}
            />
          </PressableScale>
        ) : null}

        {onDelete ? (
          <PressableScale onPress={onDelete} scaleTo={0.85} style={styles.deleteBtnSmall}>
            <MaterialIcons name="delete-outline" size={18} color={Colors.textTertiary} />
          </PressableScale>
        ) : null}

        <TouchableOpacity onLongPress={drag} delayLongPress={150} style={styles.dragHandle}>
          <MaterialIcons name="drag-handle" size={22} color={Colors.border} />
        </TouchableOpacity>
      </Animated.View>
    </ScaleDecorator>
  );
}

// ─── Kanban Card ──────────────────────────────────────────────────────────────

interface KanbanCardProps {
  task: Task;
  projectColor: string;
  onToggle: () => void;
  onStatusChange: (status: TaskStatus) => void;
  onTimerToggle?: () => void;
  onDelete?: () => void;
  onLongPress?: () => void;
  showTotalTime?: boolean;
}

function KanbanCard({ task, projectColor, onToggle, onStatusChange, onTimerToggle, onDelete, onLongPress, showTotalTime }: KanbanCardProps) {
  const status = getStatus(task);
  const hasTrackedTime = (task.totalTimeSeconds ?? 0) > 0;

  return (
    <PressableScale onPress={undefined} onLongPress={onLongPress} scaleTo={0.98}>
      <View style={styles.kanbanCard}>
        <View style={[styles.kanbanStripe, { backgroundColor: projectColor }]} />
        <View style={styles.kanbanBody}>
          <Text style={[styles.kanbanTitle, task.completed && styles.strikethrough]} numberOfLines={2}>
            {task.title}
          </Text>
          {task.time ? <Text style={styles.kanbanTime}>{task.time}</Text> : null}

          {/* Total time tracked — shown in Terminé column */}
          {showTotalTime && hasTrackedTime ? (
            <View style={styles.kanbanTimeChip}>
              <MaterialIcons name="timer" size={11} color={Colors.primary} />
              <Text style={styles.kanbanTimeChipText}>
                {formatDuration(task.totalTimeSeconds ?? 0)}
              </Text>
            </View>
          ) : null}

          <View style={styles.kanbanActions}>
            {KANBAN_COLUMNS.map(col => (
              <PressableScale
                key={col.status}
                onPress={() => onStatusChange(col.status)}
                scaleTo={0.88}
              >
                <View style={[
                  styles.kanbanStatusBtn,
                  status === col.status && { backgroundColor: col.color + '22', borderColor: col.color },
                ]}>
                  <MaterialIcons
                    name={col.icon}
                    size={13}
                    color={status === col.status ? col.color : Colors.textTertiary}
                  />
                  <Text style={[
                    styles.kanbanStatusText,
                    status === col.status && { color: col.color },
                  ]}>
                    {col.label}
                  </Text>
                </View>
              </PressableScale>
            ))}

            {onTimerToggle && !task.completed ? (
              <PressableScale
                onPress={onTimerToggle}
                scaleTo={0.85}
                style={[styles.kanbanTimerBtn, task.timerStartedAt ? styles.kanbanTimerBtnActive : null]}
              >
                <MaterialIcons
                  name={task.timerStartedAt ? 'pause' : 'play-arrow'}
                  size={13}
                  color={task.timerStartedAt ? '#fff' : Colors.primary}
                />
              </PressableScale>
            ) : null}

            {onDelete ? (
              <PressableScale onPress={onDelete} scaleTo={0.85} style={styles.kanbanDelete}>
                <MaterialIcons name="delete-outline" size={15} color={Colors.textTertiary} />
              </PressableScale>
            ) : null}
          </View>
        </View>
      </View>
    </PressableScale>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  status: TaskStatus;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
  tasks: Task[];
  projectColor: string;
  onToggle: (id: string) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onTimerToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
}

function KanbanColumn({
  status, label, icon, color, tasks, projectColor,
  onToggle, onStatusChange, onTimerToggle, onDelete, onEdit,
}: KanbanColumnProps) {
  const isDoneColumn = status === 'done';

  return (
    <View style={styles.kanbanColumn}>
      <View style={[styles.kanbanColHeader, { borderBottomColor: color }]}>
        <MaterialIcons name={icon} size={16} color={color} />
        <Text style={[styles.kanbanColTitle, { color }]}>{label}</Text>
        <View style={[styles.kanbanCount, { backgroundColor: color + '20' }]}>
          <Text style={[styles.kanbanCountText, { color }]}>{tasks.length}</Text>
        </View>
        {isDoneColumn && tasks.length > 0 ? (
          <View style={styles.kanbanTotalTime}>
            <MaterialIcons name="timer" size={11} color={Colors.primary} />
            <Text style={styles.kanbanTotalTimeText}>
              {formatDuration(tasks.reduce((acc, t) => acc + (t.totalTimeSeconds ?? 0), 0))}
            </Text>
          </View>
        ) : null}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.kanbanColContent}
        nestedScrollEnabled
      >
        {tasks.length === 0 ? (
          <View style={styles.kanbanEmpty}>
            <Text style={styles.kanbanEmptyText}>Vide</Text>
          </View>
        ) : (
          tasks.map(task => (
            <KanbanCard
              key={task.id}
              task={task}
              projectColor={projectColor}
              onToggle={() => onToggle(task.id)}
              onStatusChange={s => onStatusChange(task.id, s)}
              onTimerToggle={() => onTimerToggle(task.id)}
              onDelete={() => onDelete(task.id)}
              onLongPress={() => onEdit(task)}
              showTotalTime={isDoneColumn}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

type ViewMode = 'list' | 'kanban';

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const {
    projects, tasks, toggleTask, deleteTask,
    addTask, updateTask, updateProject, reorderProjectTasks, toggleTaskTimer,
  } = useApp();

  const [modalVisible, setModalVisible] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editTask, setEditTask] = useState<Task | null>(null);

  const project = projects.find(p => p.id === id);
  const projectTasks = useMemo(() => tasks.filter(t => t.projectId === id), [tasks, id]);
  const completedCount = projectTasks.filter(t => t.completed).length;
  const progress = projectTasks.length > 0 ? completedCount / projectTasks.length : 0;
  const pct = Math.round(progress * 100);

  const kanbanBuckets = useMemo(() => {
    const buckets: Record<TaskStatus, Task[]> = { todo: [], inprogress: [], done: [] };
    for (const t of projectTasks) buckets[getStatus(t)].push(t);
    return buckets;
  }, [projectTasks]);

  const handleSave = useCallback(async (data: any) => {
    const taskId = `task-${Date.now()}`;
    const newTask: Task = { ...data, id: taskId, projectId: id, status: 'todo' as TaskStatus };
    await addTask(newTask);
    if (project) {
      await updateProject({ ...project, taskIds: [...project.taskIds, taskId] });
    }
  }, [id, addTask, project, updateProject]);

  const handleStatusChange = useCallback(async (taskId: string, status: TaskStatus) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    await updateTask({ ...task, status, completed: status === 'done' });
  }, [tasks, updateTask]);

  const handleDragEnd = useCallback(({ data }: { data: Task[] }) => {
    if (project) reorderProjectTasks(project.id, data);
  }, [project, reorderProjectTasks]);

  const renderDragItem = useCallback(({ item, drag, isActive }: RenderItemParams<Task>) => (
    <DragTaskRow
      task={item}
      drag={drag}
      isActive={isActive}
      color={project?.color ?? Colors.primary}
      onToggle={() => toggleTask(item.id)}
      onDelete={() => deleteTask(item.id)}
      onLongPress={() => setEditTask(item)}
      onTimerToggle={() => toggleTaskTimer(item.id)}
    />
  ), [project, toggleTask, deleteTask, toggleTaskTimer]);

  if (!project) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <Text style={styles.notFound}>Projet introuvable</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      {/* ─── Hero header ─────────────────────────────────────── */}
      <View style={[styles.hero, { borderBottomColor: project.color }]}>
        <View style={styles.heroMeta}>
          <View style={[styles.colorDot, { backgroundColor: project.color }]} />
          {project.deadline ? (
            <View style={styles.deadlineChip}>
              <MaterialIcons name="event" size={12} color={Colors.textSecondary} />
              <Text style={styles.deadlineText}>{project.deadline}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.heroTitle}>{project.title}</Text>
        {project.description ? <Text style={styles.heroDesc}>{project.description}</Text> : null}

        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Progression</Text>
            <Text style={[styles.progressPct, { color: project.color }]}>{pct}%</Text>
          </View>
          <ProgressBar progress={progress} color={project.color} height={10} />
          <Text style={styles.progressSub}>{completedCount}/{projectTasks.length} tâches complétées</Text>
        </View>

        {/* View toggle */}
        <View style={styles.viewToggle}>
          {(['list', 'kanban'] as ViewMode[]).map(mode => (
            <PressableScale
              key={mode}
              onPress={() => setViewMode(mode)}
              scaleTo={0.92}
              style={[styles.toggleBtn, viewMode === mode && { backgroundColor: project.color }]}
            >
              <MaterialIcons
                name={mode === 'list' ? 'view-list' : 'view-column'}
                size={18}
                color={viewMode === mode ? '#fff' : Colors.textSecondary}
              />
              <Text style={[styles.toggleLabel, { color: viewMode === mode ? '#fff' : Colors.textSecondary }]}>
                {mode === 'list' ? 'Liste' : 'Kanban'}
              </Text>
            </PressableScale>
          ))}
        </View>
      </View>

      {/* ─── List View ───────────────────────────────────────── */}
      {viewMode === 'list' ? (
        <DraggableFlatList
          data={projectTasks}
          keyExtractor={item => item.id}
          onDragEnd={handleDragEnd}
          renderItem={renderDragItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderTitle}>
                Tâches
                <Text style={styles.listHeaderHint}> · appui long pour éditer ou réordonner</Text>
              </Text>
              <PressableScale
                onPress={() => setModalVisible(true)}
                scaleTo={0.88}
                style={[styles.addBtn, { backgroundColor: project.color }]}
              >
                <MaterialIcons name="add" size={22} color="#fff" />
              </PressableScale>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialIcons name="assignment-outlined" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>Aucune tâche dans ce projet</Text>
              <PressableScale
                onPress={() => setModalVisible(true)}
                style={[styles.emptyBtn, { backgroundColor: project.color }]}
                scaleTo={0.95}
              >
                <Text style={styles.emptyBtnText}>Ajouter une tâche</Text>
              </PressableScale>
            </View>
          }
        />
      ) : (
        /* ─── Kanban View ─────────────────────────────────────── */
        <View style={styles.kanbanRoot}>
          <View style={styles.kanbanHeader}>
            <Text style={styles.listHeaderTitle}>
              Vue Kanban
              <Text style={styles.listHeaderHint}> · appui long pour éditer</Text>
            </Text>
            <PressableScale
              onPress={() => setModalVisible(true)}
              scaleTo={0.88}
              style={[styles.addBtn, { backgroundColor: project.color }]}
            >
              <MaterialIcons name="add" size={22} color="#fff" />
            </PressableScale>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.kanbanScroll}
          >
            {KANBAN_COLUMNS.map(col => (
              <KanbanColumn
                key={col.status}
                status={col.status}
                label={col.label}
                icon={col.icon}
                color={col.color}
                tasks={kanbanBuckets[col.status]}
                projectColor={project.color}
                onToggle={toggleTask}
                onStatusChange={handleStatusChange}
                onTimerToggle={toggleTaskTimer}
                onDelete={deleteTask}
                onEdit={setEditTask}
              />
            ))}
          </ScrollView>
        </View>
      )}

      <AddModal
        visible={modalVisible}
        type="task"
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
      />

      <EditTaskModal
        visible={editTask !== null}
        task={editTask}
        onClose={() => setEditTask(null)}
      />
    </GestureHandlerRootView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  // Hero
  hero: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 3,
    gap: Spacing.sm,
    ...Shadow.soft,
  },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  deadlineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.borderLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radii.round,
  },
  deadlineText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  heroTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, color: Colors.text },
  heroDesc: { fontSize: FontSize.md, color: Colors.textSecondary, lineHeight: 22 },
  progressSection: { gap: 6 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
  progressPct: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold },
  progressSub: { fontSize: FontSize.xs, color: Colors.textTertiary },
  viewToggle: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radii.round,
    backgroundColor: Colors.borderLight,
  },
  toggleLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },

  // List view
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 80 },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
  },
  listHeaderTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  listHeaderHint: { fontSize: FontSize.sm, fontWeight: FontWeight.regular, color: Colors.textTertiary },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.soft,
  },

  // Drag card
  dragCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    gap: Spacing.sm,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  dragCardActive: { shadowOpacity: 0.18, elevation: 10, zIndex: 999 },
  dragColorStripe: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  dragContent: { flex: 1, gap: 5, paddingLeft: Spacing.xs },
  dragTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.text },
  dragMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flexWrap: 'wrap' },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.borderLight,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  timeText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  deleteBtnSmall: { padding: Spacing.xs },
  timerBtnSmall: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primary + '40',
  },
  timerBtnSmallActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dragHandle: { padding: Spacing.xs },
  strikethrough: { textDecorationLine: 'line-through', color: Colors.textTertiary },

  // Kanban
  kanbanRoot: { flex: 1 },
  kanbanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  kanbanScroll: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 80,
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  kanbanColumn: {
    width: 220,
    maxHeight: 520,
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    overflow: 'hidden',
    ...Shadow.soft,
  },
  kanbanColHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 2,
  },
  kanbanColTitle: { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  kanbanCount: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  kanbanCountText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  kanbanColContent: { padding: Spacing.sm, gap: Spacing.sm },
  kanbanEmpty: { alignItems: 'center', paddingVertical: Spacing.xl },
  kanbanEmptyText: { fontSize: FontSize.sm, color: Colors.textTertiary },
  kanbanCard: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    ...Shadow.soft,
  },
  kanbanStripe: { width: 3 },
  kanbanBody: { flex: 1, padding: Spacing.sm, gap: 6 },
  kanbanTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text, lineHeight: 18 },
  kanbanTime: { fontSize: FontSize.xs, color: Colors.textTertiary },
  kanbanActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, alignItems: 'center', marginTop: 2 },
  kanbanStatusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.borderLight,
  },
  kanbanStatusText: { fontSize: 10, fontWeight: FontWeight.semibold, color: Colors.textTertiary },
  kanbanDelete: { padding: 3, marginLeft: 'auto' },
  kanbanTimerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  kanbanTimerBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  kanbanTimeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    alignSelf: 'flex-start',
    marginBottom: 2,
  },
  kanbanTimeChipText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: Colors.primaryDark,
    fontVariant: ['tabular-nums'],
  },
  kanbanTotalTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    marginLeft: 'auto',
  },
  kanbanTotalTimeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: Colors.primaryDark,
    fontVariant: ['tabular-nums'],
  },

  // Empty / misc
  empty: { alignItems: 'center', paddingTop: 48, gap: Spacing.md },
  emptyText: {
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
    textAlign: 'center',
  },
  emptyBtn: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: Radii.xl, marginTop: Spacing.sm },
  emptyBtnText: { color: '#fff', fontWeight: FontWeight.bold, fontSize: FontSize.md },
  notFound: { textAlign: 'center', marginTop: 80, fontSize: FontSize.lg, color: Colors.textSecondary },
});
