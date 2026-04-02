import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Radii, Shadow, Spacing } from '../../constants/theme';
import { useApp } from '../../contexts/AppContext';
import { useAI } from '../../contexts/AIContext';
import { TaskCard } from '../../components/feature/TaskCard';
import { MicFAB } from '../../components/feature/MicFAB';
import { AIModal } from '../../components/ui/AIModal';
import { AddModal } from '../../components/ui/AddModal';
import { PressableScale } from '../../components/ui/PressableScale';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { AIParseResult, Task, Routine, Project } from '../../types';

function getLevelLabel(level: number) {
  const labels = ['Débutant', 'Apprenti', 'Expert', 'Maître', 'Légende', 'Prodige'];
  return labels[Math.min(level - 1, labels.length - 1)] ?? 'Prodige';
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tasks, routines, stats, toggleTask, addTask, addRoutine, addProject, projects, getProjectProgress, getProjectTasks } = useApp();
  const { isListening, setIsListening, aiModalVisible, setAiModalVisible } = useAI();
  const [addModalType, setAddModalType] = useState<'task' | 'routine' | 'project' | null>(null);

  const todayTasks = tasks.filter(t => !t.completed).slice(0, 3);
  const nextTask = todayTasks[0];

  const completedToday = tasks.filter(t => t.completed).length;
  const totalToday = tasks.length;
  const dayProgress = totalToday > 0 ? completedToday / totalToday : 0;

  const handleMicPress = useCallback(() => {
    setIsListening(!isListening);
    if (!isListening) {
      setTimeout(() => {
        setIsListening(false);
        setAiModalVisible(true);
      }, 2000);
    }
  }, [isListening, setIsListening, setAiModalVisible]);

  const handleAIResult = useCallback(async (result: AIParseResult) => {
    const id = `${result.type}-${Date.now()}`;
    const now = new Date().toISOString();
    if (result.type === 'task') {
      const t: Task = {
        id,
        title: result.title,
        date: result.date,
        time: result.time,
        completed: false,
        priority: 'medium',
        createdAt: now,
        xp: 20,
      };
      await addTask(t);
    } else if (result.type === 'routine') {
      const r: Routine = {
        id,
        title: result.title,
        time: result.time,
        repeat: result.repeat ?? 'daily',
        completed: false,
        streak: 0,
        color: Colors.purple,
        icon: 'default',
        createdAt: now,
        xp: 25,
      };
      await addRoutine(r);
    } else if (result.type === 'project') {
      const taskIds: string[] = [];
      const p: Project = {
        id,
        title: result.title,
        color: Colors.primary,
        createdAt: now,
        taskIds,
        xp: 100,
      };
      await addProject(p);
      if (result.subtasks) {
        for (const sub of result.subtasks) {
          const tid = `task-${Date.now()}-${Math.random()}`;
          await addTask({
            id: tid,
            title: sub,
            completed: false,
            priority: 'medium',
            projectId: id,
            createdAt: now,
            xp: 15,
          });
          taskIds.push(tid);
        }
      }
    }
  }, [addTask, addRoutine, addProject]);

  const handleAddSave = useCallback(async (data: any) => {
    const id = `${addModalType}-${Date.now()}`;
    if (addModalType === 'task') await addTask({ ...data, id });
    else if (addModalType === 'routine') await addRoutine({ ...data, id });
    else if (addModalType === 'project') await addProject({ ...data, id });
  }, [addModalType, addTask, addRoutine, addProject]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* ─── Header ─────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Bonjour 👋</Text>
            <Text style={styles.subtitle}>Voici votre journée</Text>
          </View>
          <View style={styles.badges}>
            <View style={styles.streakBadge}>
              <Text style={styles.streakEmoji}>🔥</Text>
              <Text style={styles.streakText}>{stats.streak}</Text>
            </View>
            <View style={styles.xpBadge}>
              <Text style={styles.xpEmoji}>⭐</Text>
              <Text style={styles.xpText}>{stats.totalXP} XP</Text>
            </View>
          </View>
        </View>

        {/* ─── Progress card ───────────────────────────────────────────────── */}
        <View style={styles.progressCard}>
          <View style={styles.progressCardHeader}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>Niv. {stats.level} · {getLevelLabel(stats.level)}</Text>
            </View>
            <Text style={styles.progressPct}>{Math.round(dayProgress * 100)}%</Text>
          </View>
          <ProgressBar progress={dayProgress} height={10} />
          <Text style={styles.progressLabel}>
            {completedToday}/{totalToday} tâches aujourd'hui
          </Text>
        </View>

        {/* ─── Next task hero card ─────────────────────────────────────────── */}
        {nextTask ? (
          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View style={styles.heroBadge}>
                <MaterialIcons name="bolt" size={14} color={Colors.primary} />
                <Text style={styles.heroBadgeText}>PROCHAINE TÂCHE</Text>
              </View>
              <View style={styles.heroXP}>
                <Text style={styles.heroXPText}>+{nextTask.xp} XP</Text>
              </View>
            </View>

            <Text style={styles.heroTitle}>{nextTask.title}</Text>
            {nextTask.time ? (
              <View style={styles.heroTime}>
                <MaterialIcons name="access-time" size={14} color={Colors.textSecondary} />
                <Text style={styles.heroTimeText}>{nextTask.time}</Text>
              </View>
            ) : null}

            <PressableScale
              onPress={() => toggleTask(nextTask.id)}
              style={styles.startBtn}
              scaleTo={0.96}
            >
              <MaterialIcons name="play-arrow" size={22} color="#fff" />
              <Text style={styles.startBtnText}>COMMENCER</Text>
            </PressableScale>
          </View>
        ) : (
          <View style={[styles.heroCard, styles.heroDone]}>
            <MaterialIcons name="celebration" size={36} color={Colors.primary} />
            <Text style={styles.heroDoneTitle}>Toutes les tâches complétées !</Text>
            <Text style={styles.heroDoneSubtitle}>Excellent travail aujourd'hui 🎉</Text>
          </View>
        )}

        {/* ─── Quick actions ───────────────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ajouter rapidement</Text>
        </View>
        <View style={styles.quickActions}>
          {[
            { label: 'Tâche', icon: 'check-circle-outline', type: 'task' as const, color: Colors.primary },
            { label: 'Routine', icon: 'loop', type: 'routine' as const, color: Colors.purple },
            { label: 'Projet', icon: 'folder-open', type: 'project' as const, color: Colors.orange },
            { label: 'IA', icon: 'auto-awesome', type: null, color: Colors.teal },
          ].map(({ label, icon, type, color }) => (
            <PressableScale
              key={label}
              scaleTo={0.9}
              onPress={() => type ? setAddModalType(type) : setAiModalVisible(true)}
              style={[styles.quickBtn, { backgroundColor: color + '15' }]}
            >
              <MaterialIcons name={icon as any} size={24} color={color} />
              <Text style={[styles.quickBtnLabel, { color }]}>{label}</Text>
            </PressableScale>
          ))}
        </View>

        {/* ─── Today tasks ─────────────────────────────────────────────────── */}
        {todayTasks.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Tâches du jour</Text>
            </View>
            {todayTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onToggle={() => toggleTask(task.id)}
              />
            ))}
          </>
        ) : null}

        {/* ─── Projects overview ───────────────────────────────────────────── */}
        {projects.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Projets en cours</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.projectsScroll}>
              {projects.slice(0, 4).map(p => {
                const prog = getProjectProgress(p.id);
                const ptasks = getProjectTasks(p.id);
                return (
                  <PressableScale
                    key={p.id}
                    onPress={() => router.push(`/project/${p.id}`)}
                    style={[styles.projectMini, { borderTopColor: p.color }]}
                    scaleTo={0.95}
                  >
                    <Text style={styles.projectMiniTitle} numberOfLines={1}>{p.title}</Text>
                    <ProgressBar progress={prog} color={p.color} height={6} />
                    <Text style={styles.projectMiniPct}>{Math.round(prog * 100)}%</Text>
                  </PressableScale>
                );
              })}
            </ScrollView>
          </>
        ) : null}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ─── Floating Mic ─────────────────────────────────────────────────── */}
      <View style={[styles.fab, { bottom: insets.bottom + 80 }]}>
        <MicFAB isListening={isListening} onPress={handleMicPress} />
      </View>

      {/* ─── Modals ───────────────────────────────────────────────────────── */}
      <AIModal
        visible={aiModalVisible}
        onClose={() => setAiModalVisible(false)}
        onResult={handleAIResult}
      />
      {addModalType ? (
        <AddModal
          visible={true}
          type={addModalType}
          onClose={() => setAddModalType(null)}
          onSave={handleAddSave}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  greeting: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.extrabold,
    color: Colors.text,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  badges: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF3E0',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radii.round,
  },
  streakEmoji: { fontSize: 16 },
  streakText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.streakOrange,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.xpYellowLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radii.round,
  },
  xpEmoji: { fontSize: 14 },
  xpText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: '#CC9900',
  },
  progressCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
    ...Shadow.soft,
  },
  progressCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  levelBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radii.round,
  },
  levelText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.primaryDark,
  },
  progressPct: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extrabold,
    color: Colors.primary,
  },
  progressLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  heroCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.xxl,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    gap: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
    ...Shadow.medium,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radii.round,
  },
  heroBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.primaryDark,
    letterSpacing: 0.5,
  },
  heroXP: {
    backgroundColor: Colors.xpYellowLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radii.round,
  },
  heroXPText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: '#CC9900',
  },
  heroTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extrabold,
    color: Colors.text,
    lineHeight: 28,
  },
  heroTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroTimeText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  startBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.xl,
    paddingVertical: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
    ...Shadow.green,
  },
  startBtnText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.extrabold,
    color: '#fff',
    letterSpacing: 1,
  },
  heroDone: {
    alignItems: 'center',
    borderColor: Colors.primaryLight,
  },
  heroDoneTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
  },
  heroDoneSubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  sectionHeader: {
    marginBottom: Spacing.md,
    marginTop: Spacing.xs,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  quickActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  quickBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
    gap: 4,
  },
  quickBtnLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  projectsScroll: {
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  projectMini: {
    width: 140,
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderTopWidth: 3,
    ...Shadow.soft,
  },
  projectMiniTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  projectMiniPct: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  fab: {
    position: 'absolute',
    right: Spacing.xl,
  },
});
