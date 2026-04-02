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
import { TimePickerField } from './DateTimePicker';
import { Routine, RepeatType } from '../../types';
import { useApp } from '../../contexts/AppContext';
import { useNotifications } from '../../contexts/NotificationContext';

// ─── Constants ────────────────────────────────────────────────────────────────

const REPEATS: { value: RepeatType; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { value: 'daily',   label: 'Quotidien', icon: 'today' },
  { value: 'weekly',  label: 'Hebdo',     icon: 'date-range' },
  { value: 'monthly', label: 'Mensuel',   icon: 'calendar-month' },
  { value: 'none',    label: 'Une fois',  icon: 'looks-one' },
];

const COLORS = [
  '#58CC02', '#1CB0F6', '#CE82FF',
  '#FF9600', '#FF6B9D', '#FF4B4B',
  '#00BFA5', '#FF7043', '#5C6BC0',
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface EditRoutineModalProps {
  visible: boolean;
  routine: Routine | null;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EditRoutineModal({ visible, routine, onClose }: EditRoutineModalProps) {
  const { updateRoutine } = useApp();
  const { scheduleForRoutine, cancelForRoutine, settings } = useNotifications();

  const [title, setTitle]   = useState('');
  const [time, setTime]     = useState('');
  const [repeat, setRepeat] = useState<RepeatType>('daily');
  const [color, setColor]   = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  // Save-feedback animation
  const checkScale = useSharedValue(0);
  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkScale.value,
  }));

  // Populate fields when routine changes
  useEffect(() => {
    if (routine) {
      setTitle(routine.title);
      setTime(routine.time ?? '');
      setRepeat(routine.repeat);
      setColor(routine.color);
      setSaved(false);
    }
  }, [routine]);

  const handleSave = useCallback(async () => {
    if (!routine || !title.trim()) return;
    setSaving(true);

    const updated: Routine = {
      ...routine,
      title: title.trim(),
      time:  time.trim() || undefined,
      repeat,
      color,
    };

    await updateRoutine(updated);

    // Re-schedule recurring notification
    if (settings.permissionGranted && settings.routinesEnabled) {
      await cancelForRoutine(routine.id);
      await scheduleForRoutine(updated);
    }

    setSaving(false);
    setSaved(true);

    checkScale.value = withSpring(1, { damping: 12, stiffness: 200 });
    setTimeout(() => {
      checkScale.value = withTiming(0, { duration: 200 });
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 250);
    }, 900);
  }, [
    routine, title, time, repeat, color,
    updateRoutine, scheduleForRoutine, cancelForRoutine,
    settings, checkScale, onClose,
  ]);

  if (!routine) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />

        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.editBadge, { backgroundColor: routine.color + '22' }]}>
                <MaterialIcons name="edit" size={14} color={routine.color} />
              </View>
              <Text style={styles.headerTitle}>Modifier la routine</Text>
            </View>
            <PressableScale onPress={onClose} scaleTo={0.88}>
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
                placeholder="Titre de la routine"
                placeholderTextColor={Colors.textTertiary}
                returnKeyType="next"
              />
            </View>

            {/* Time */}
            <View style={styles.field}>
              <TimePickerField label="HEURE" value={time} onChange={setTime} />
            </View>

            {/* Repeat */}
            <View style={styles.field}>
              <Text style={styles.label}>
                <MaterialIcons name="loop" size={13} color={Colors.textSecondary} />
                {'  '}Répétition
              </Text>
              <View style={styles.repeatGrid}>
                {REPEATS.map(r => (
                  <PressableScale
                    key={r.value}
                    onPress={() => setRepeat(r.value)}
                    scaleTo={0.9}
                    style={styles.repeatBtnWrapper}
                  >
                    <View style={[
                      styles.repeatBtn,
                      repeat === r.value && {
                        backgroundColor: color + '20',
                        borderColor: color,
                      },
                    ]}>
                      <MaterialIcons
                        name={r.icon}
                        size={18}
                        color={repeat === r.value ? color : Colors.textTertiary}
                      />
                      <Text style={[
                        styles.repeatText,
                        repeat === r.value && { color, fontWeight: FontWeight.bold },
                      ]}>
                        {r.label}
                      </Text>
                    </View>
                  </PressableScale>
                ))}
              </View>
            </View>

            {/* Color */}
            <View style={styles.field}>
              <Text style={styles.label}>
                <MaterialIcons name="palette" size={13} color={Colors.textSecondary} />
                {'  '}Couleur
              </Text>
              <View style={styles.colorGrid}>
                {COLORS.map(c => (
                  <PressableScale key={c} onPress={() => setColor(c)} scaleTo={0.85}>
                    <View style={[styles.colorDot, { backgroundColor: c }]}>
                      {color === c ? (
                        <MaterialIcons name="check" size={16} color="#fff" />
                      ) : null}
                    </View>
                  </PressableScale>
                ))}
              </View>
            </View>

            {/* Notification hint */}
            <View style={styles.notifHint}>
              <MaterialIcons
                name={
                  settings.permissionGranted && settings.routinesEnabled
                    ? 'notifications-active'
                    : 'notifications-off'
                }
                size={14}
                color={
                  settings.permissionGranted && settings.routinesEnabled
                    ? Colors.primary
                    : Colors.textTertiary
                }
              />
              <Text style={[
                styles.notifHintText,
                {
                  color: settings.permissionGranted && settings.routinesEnabled
                    ? Colors.primaryDark
                    : Colors.textTertiary,
                },
              ]}>
                {settings.permissionGranted && settings.routinesEnabled
                  ? time.trim()
                    ? `Rappel re-planifié à ${time} (${REPEATS.find(r => r.value === repeat)?.label ?? repeat})`
                    : `Rappel à l'heure par défaut (${REPEATS.find(r => r.value === repeat)?.label ?? repeat})`
                  : 'Notifications désactivées dans les réglages'}
              </Text>
            </View>

            {/* Preview strip */}
            <View style={[styles.preview, { borderLeftColor: color }]}>
              <View style={[styles.previewIcon, { backgroundColor: color + '22' }]}>
                <MaterialIcons name="loop" size={18} color={color} />
              </View>
              <View style={styles.previewContent}>
                <Text style={styles.previewTitle} numberOfLines={1}>
                  {title || 'Titre de la routine'}
                </Text>
                <Text style={styles.previewSub}>
                  {REPEATS.find(r => r.value === repeat)?.label ?? repeat}
                  {time.trim() ? ` · ${time}` : ''}
                </Text>
              </View>
            </View>

            {/* Save button */}
            <PressableScale onPress={handleSave} scaleTo={0.96} style={[styles.saveBtn, { shadowColor: color }]}>
              <View style={[styles.saveBtnInner, { backgroundColor: color }]}>
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

            <View style={{ height: 36 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  // Repeat
  repeatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  repeatBtnWrapper: {
    width: '47%',
  },
  repeatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
    backgroundColor: Colors.borderLight,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  repeatText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  // Colors
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Notif hint
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
    flex: 1,
    flexWrap: 'wrap',
  },
  // Preview
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderLeftWidth: 4,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  previewIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewContent: {
    flex: 1,
    gap: 4,
  },
  previewTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  previewSub: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  // Save
  saveBtn: {
    borderRadius: Radii.xl,
    overflow: 'hidden',
    marginTop: Spacing.xs,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  saveBtnInner: {
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
