import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Project } from '../../types';
import { Colors, FontSize, FontWeight, Radii, Shadow, Spacing } from '../../constants/theme';
import { PressableScale } from '../ui/PressableScale';
import { ProgressBar } from '../ui/ProgressBar';
import { MaterialIcons } from '@expo/vector-icons';

interface Props {
  project: Project;
  progress: number;
  taskCount: number;
  completedCount: number;
  onPress: () => void;
  onDelete?: () => void;
}

export function ProjectCard({
  project,
  progress,
  taskCount,
  completedCount,
  onPress,
  onDelete,
}: Props) {
  const pct = Math.round(progress * 100);

  return (
    <PressableScale onPress={onPress} style={styles.wrapper}>
      <View style={[styles.card, { borderLeftColor: project.color, borderLeftWidth: 4 }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconBlob, { backgroundColor: project.color + '20' }]}>
            <MaterialIcons name="folder" size={20} color={project.color} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={1}>{project.title}</Text>
            {project.deadline ? (
              <View style={styles.deadlineRow}>
                <MaterialIcons name="event" size={11} color={Colors.textTertiary} />
                <Text style={styles.deadline}>{project.deadline}</Text>
              </View>
            ) : null}
          </View>

          {onDelete ? (
            <PressableScale onPress={onDelete} scaleTo={0.85} style={styles.deleteBtn}>
              <MaterialIcons name="delete-outline" size={20} color={Colors.textTertiary} />
            </PressableScale>
          ) : null}
        </View>

        {/* Progress */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Progression</Text>
            <Text style={[styles.progressPct, { color: project.color }]}>{pct}%</Text>
          </View>
          <ProgressBar progress={progress} color={project.color} height={8} />
          <Text style={styles.taskCount}>
            {completedCount}/{taskCount} tâches complétées
          </Text>
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.md,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadow.soft,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconBlob: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  deadline: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  deleteBtn: {
    padding: Spacing.xs,
  },
  progressSection: {
    gap: Spacing.xs,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  progressPct: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  taskCount: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
});
