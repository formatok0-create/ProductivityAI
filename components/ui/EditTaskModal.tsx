import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Colors, FontSize, FontWeight, Radii, Shadow, Spacing } from '../../constants/theme';
import { PressableScale } from './PressableScale';
import { DatePickerField, TimePickerField } from './DateTimePicker';
import { Task, TaskPriority, TaskStatus } from '../../types';
import { useApp } from '../../contexts/AppContext';
import { useNotifications } from '../../contexts/NotificationContext';

const PRIORITIES: { value: TaskPriority; label: string; color: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { value: 'low',    label: 'Basse',   color: Colors.teal,    icon: 'south' },
  { value: 'medium', label: 'Moyenne', color: Colors.orange,  icon: 'remove' },
  { value: 'high',   label: 'Haute',   color: Colors.danger,  icon: 'north' },
];

interface EditTaskModalProps {
  visible: boolean;
  task: Task | null;
  onClose: () => void;
}

export function EditTaskModal({ visible, task, onClose }: EditTaskModalProps) {
  const { updateTask, projects } = useApp();
  const { scheduleForTask, cancelForTask, settings } = useNotifications();

  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [projectId, setProjectId] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Animation for save feedback
  const checkScale = useSharedValue(0);
  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkScale.value,
  }));

  // Populate fields when task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setTime(task.time ?? '');
      setDate(task.date ?? '');
      setPriority(task.priority);
      setProjectId(task.projectId);
      setSaved(false);
    }
  }, [task]);

  const handleSave = useCallback(async () => {
    if (!task || !title.trim()) return;
    setSaving(true);

    const updated: Task = {
      ...task,
      title: title.trim(),
      time: time.trim() || undefined,
      date: date.trim() || undefined,
      priority,
      projectId,
    };

    await updateTask(updated);

    // Re-schedule notification
    if (settings.permissionGranted && settings.tasksEnabled) {
      await cancelForTask(task.id);
      if (updated.time) {
        await scheduleForTask(updated);
      }
    }

    setSaving(false);
    setSaved(true);

    // Animate check
    checkScale.value = withSpring(1, { damping: 12, stiffness: 200 });
    setTimeout(() => {
      checkScale.value = withTiming(0, { duration: 200 });
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 250);
    }, 900);
  }, [task, title, time, date, priority, projectId, updateTask, scheduleForTask, cancelForTask, settings, checkScale, onClose]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!task) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity style={styles.backdrop} onPress={handleClose} activeOpacity={1} />

        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.editBadge}>
                <MaterialIcons name="edit" size={14} color={Colors.primary} />
              </View>
              <Text style={styles.headerTitle}>Modifier la tâche</Text>
            </View>
            <PressableScale onPress={handleClose} scaleTo={0.88}>
              <View style={styles.closeBtn}>
                <MaterialIcons name="close" size={20} color={Colors.textSecondary} />
              </View>
            </PressableScale>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* Title */}
            <View style={styles.field}>
              <Text style={styles.label}>
                <MaterialIcons name="title" size={13} color={Colors.textSecondary} />
                {'  '}Titre *
              </Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Titre de la tâche"
                placeholderTextColor={Colors.textTertiary}
                autoFocus={false}
                returnKeyType="next"
              />
            </View>

            {/* Date + Time row */}
            <View style={styles.row}>
              <View style={[styles.field, { flex: 1 }]}>
                <DatePickerField label="DATE" value={date} onChange={setDate} />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <TimePickerField label="HEURE" value={time} onChange={setTime} />
              </View>
            </View>

            {/* Priority */}
            <View style={styles.field}>
              <Text style={styles.label}>
                <MaterialIcons name="flag" size={13} color={Colors.textSecondary} />
                {'  '}Priorité
              </Text>
              <View style={styles.priorityRow}>
                {PRIORITIES.map(p => (
                  <PressableScale
                    key={p.value}
                    onPress={() => setPriority(p.value)}
                    scaleTo={0.9}
                    style={{ flex: 1 }}
                  >
                    <View style={[
                      styles.priorityBtn,
                      priority === p.value && {
                        backgroundColor: p.color + '20',
                        borderColor: p.color,
                      },
                    ]}>
                      <MaterialIcons
                        name={p.icon}
                        size={16}
                        color={priority === p.value ? p.color : Colors.textTertiary}
                      />
                      <Text style={[
                        styles.priorityText,
                        priority === p.value && { color: p.color, fontWeight: FontWeight.bold },
                      ]}>
                        {p.label}
                      </Text>
                    </View>
                  </PressableScale>
                ))}
              </View>
            </View>

            {/* Project association */}
            <View style={styles.field}>
              <Text style={styles.label}>
                <MaterialIcons name="folder" size={13} color={Colors.textSecondary} />
                {'  '}Projet associé
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.projectScroll}
              >
                {/* "None" option */}
                <PressableScale
                  onPress={() => setProjectId(undefined)}
                  scaleTo={0.9}
                >
                  <View style={[
                    styles.projectChip,
                    projectId === undefined && styles.projectChipActive,
                  ]}>
                    <MaterialIcons
                      name="block"
                      size={14}
                      color={projectId === undefined ? Colors.primaryDark : Colors.textTertiary}
                    />
                    <Text style={[
                      styles.projectChipText,
                      projectId === undefined && styles.projectChipTextActive,
                    ]}>
                      Aucun
                    </Text>
                  </View>
                </PressableScale>

                {projects.map(proj => (
                  <PressableScale
                    key={proj.id}
                    onPress={() => setProjectId(proj.id)}
                    scaleTo={0.9}
                  >
                    <View style={[
                      styles.projectChip,
                      projectId === proj.id && {
                        backgroundColor: proj.color + '20',
                        borderColor: proj.color,
                      },
                    ]}>
                      <View style={[styles.projectDot, { backgroundColor: proj.color }]} />
                      <Text
                        style={[
                          styles.projectChipText,
                          projectId === proj.id && { color: proj.color, fontWeight: FontWeight.bold },
                        ]}
                        numberOfLines={1}
                      >
                        {proj.title}
                      </Text>
                    </View>
                  </PressableScale>
                ))}
              </ScrollView>
            </View>

            {/* Notification hint */}
            {time.trim() ? (
              <View style={styles.notifHint}>
                <MaterialIcons
                  name={settings.permissionGranted && settings.tasksEnabled ? 'notifications-active' : 'notifications-off'}
                  size={14}
                  color={settings.permissionGranted && settings.tasksEnabled ? Colors.primary : Colors.textTertiary}
                />
                <Text style={[
                  styles.notifHintText,
                  { color: settings.permissionGranted && settings.tasksEnabled ? Colors.primaryDark : Colors.textTertiary },
                ]}>
                  {settings.permissionGranted && settings.tasksEnabled
                    ? `Rappel re-planifié à ${time}`
                    : 'Notifications désactivées dans les réglages'}
                </Text>
              </View>
            ) : null}

            {/* Save button */}
            <PressableScale onPress={handleSave} scaleTo={0.96} style={styles.saveBtn}>
              <View style={styles.saveBtnInner}>
                {saved ? (
                  <Animated.View style={[styles.checkAnim, checkStyle]}>
                    <MaterialIcons name="check-circle" size={24} color="#fff" />
                  </Animated.View>
                ) : (
                  <>
                    <MaterialIcons name="save" size={20} color="#fff" />
                    <Text style={styles.saveBtnText}>
                      {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
                    </Text>
                  </>
                )}
              </View>
            </PressableScale>

            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: Spacing.xl,
    paddingTop: Spacing.md,
    maxHeight: '94%',
    ...Shadow.strong,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  editBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  field: {
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  priorityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
    backgroundColor: Colors.borderLight,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  priorityText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  projectScroll: {
    gap: Spacing.sm,
    paddingRight: Spacing.sm,
    flexDirection: 'row',
  },
  projectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.round,
    backgroundColor: Colors.borderLight,
    borderWidth: 1.5,
    borderColor: Colors.border,
    maxWidth: 140,
  },
  projectChipActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  projectChipText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  projectChipTextActive: {
    color: Colors.primaryDark,
    fontWeight: FontWeight.bold,
  },
  projectDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  notifHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.lg,
    marginBottom: Spacing.lg,
  },
  notifHintText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  saveBtn: {
    borderRadius: Radii.xl,
    overflow: 'hidden',
    marginTop: Spacing.sm,
    ...Shadow.green,
  },
  saveBtnInner: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    minHeight: 56,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  checkAnim: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
