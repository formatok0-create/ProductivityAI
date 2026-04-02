import React, { useState, useCallback } from 'react';
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
import { Colors, FontSize, FontWeight, Radii, Shadow, Spacing } from '../../constants/theme';
import { PressableScale } from './PressableScale';
import { DatePickerField, TimePickerField } from './DateTimePicker';
import { TaskPriority, RepeatType } from '../../types';

type ModalType = 'task' | 'routine' | 'project';

interface AddModalProps {
  visible: boolean;
  type: ModalType;
  onClose: () => void;
  onSave: (data: any) => void;
}

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high'];
const REPEATS: RepeatType[] = ['daily', 'weekly', 'monthly', 'none'];
const PRIORITY_LABELS = { low: 'Basse', medium: 'Moyenne', high: 'Haute' };
const REPEAT_LABELS = { daily: 'Quotidien', weekly: 'Hebdo', monthly: 'Mensuel', none: 'Une fois' };
const COLORS = ['#58CC02', '#1CB0F6', '#CE82FF', '#FF9600', '#FF6B9D', '#FF4B4B'];

const TYPE_LABELS = { task: 'Tâche', routine: 'Routine', project: 'Projet' };

export function AddModal({ visible, type, onClose, onSave }: AddModalProps) {
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [repeat, setRepeat] = useState<RepeatType>('daily');
  const [color, setColor] = useState(COLORS[0]);
  const [deadline, setDeadline] = useState('');
  const [description, setDescription] = useState('');

  const reset = useCallback(() => {
    setTitle('');
    setTime('');
    setDate('');
    setPriority('medium');
    setRepeat('daily');
    setColor(COLORS[0]);
    setDeadline('');
    setDescription('');
  }, []);

  const handleSave = useCallback(() => {
    if (!title.trim()) return;
    const base = { title: title.trim(), description, time, createdAt: new Date().toISOString() };
    if (type === 'task') {
      onSave({ ...base, date, priority, completed: false, projectId: undefined, xp: 20 });
    } else if (type === 'routine') {
      onSave({ ...base, repeat, color, completed: false, streak: 0, icon: 'default', xp: 25 });
    } else {
      onSave({ ...base, color, deadline, taskIds: [], xp: 100 });
    }
    reset();
    onClose();
  }, [title, description, time, date, priority, repeat, color, deadline, type, onSave, onClose, reset]);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

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

          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              Nouvelle {TYPE_LABELS[type]}
            </Text>
            <PressableScale onPress={handleClose} scaleTo={0.88}>
              <View style={styles.closeBtn}>
                <MaterialIcons name="close" size={20} color={Colors.textSecondary} />
              </View>
            </PressableScale>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Title */}
            <View style={styles.field}>
              <Text style={styles.label}>Titre *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Finir le rapport..."
                placeholderTextColor={Colors.textTertiary}
                value={title}
                onChangeText={setTitle}
                autoFocus
              />
            </View>

            {/* Time */}
            <View style={styles.field}>
              <TimePickerField label="Heure" value={time} onChange={setTime} />
            </View>

            {/* Task-specific */}
            {type === 'task' ? (
              <>
                <View style={styles.field}>
                  <DatePickerField label="Date" value={date} onChange={setDate} />
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>Priorité</Text>
                  <View style={styles.chipRow}>
                    {PRIORITIES.map(p => (
                      <PressableScale key={p} onPress={() => setPriority(p)} scaleTo={0.9}>
                        <View style={[styles.chip, priority === p && styles.chipActive]}>
                          <Text style={[styles.chipText, priority === p && styles.chipTextActive]}>
                            {PRIORITY_LABELS[p]}
                          </Text>
                        </View>
                      </PressableScale>
                    ))}
                  </View>
                </View>
              </>
            ) : null}

            {/* Routine-specific */}
            {type === 'routine' ? (
              <View style={styles.field}>
                <Text style={styles.label}>Répétition</Text>
                <View style={styles.chipRow}>
                  {REPEATS.map(r => (
                    <PressableScale key={r} onPress={() => setRepeat(r)} scaleTo={0.9}>
                      <View style={[styles.chip, repeat === r && styles.chipActive]}>
                        <Text style={[styles.chipText, repeat === r && styles.chipTextActive]}>
                          {REPEAT_LABELS[r]}
                        </Text>
                      </View>
                    </PressableScale>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Project deadline */}
            {type === 'project' ? (
              <View style={styles.field}>
                <DatePickerField label="Date limite" value={deadline} onChange={setDeadline} />
              </View>
            ) : null}

            {/* Color (routine + project) */}
            {type !== 'task' ? (
              <View style={styles.field}>
                <Text style={styles.label}>Couleur</Text>
                <View style={styles.colorRow}>
                  {COLORS.map(c => (
                    <PressableScale key={c} onPress={() => setColor(c)} scaleTo={0.85}>
                      <View style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotActive]} />
                    </PressableScale>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Save */}
            <PressableScale onPress={handleSave} style={styles.saveBtn} scaleTo={0.96}>
              <Text style={styles.saveBtnText}>Créer {TYPE_LABELS[type]}</Text>
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
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: Spacing.xl,
    paddingTop: Spacing.md,
    maxHeight: '92%',
    ...Shadow.strong,
  },
  handle: {
    width: 40,
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
  field: {
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.round,
    backgroundColor: Colors.borderLight,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  chipTextActive: {
    color: Colors.primaryDark,
    fontWeight: FontWeight.bold,
  },
  colorRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorDotActive: {
    borderWidth: 3,
    borderColor: Colors.text,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.xl,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.md,
    ...Shadow.green,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
});
