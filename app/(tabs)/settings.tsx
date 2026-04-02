import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Platform,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { Colors, FontSize, FontWeight, Radii, Shadow, Spacing } from '../../constants/theme';
import { useNotifications } from '../../contexts/NotificationContext';
import { PressableScale } from '../../components/ui/PressableScale';

// ─── Time Picker Modal ────────────────────────────────────────────────────────

interface TimePickerProps {
  visible: boolean;
  hour: number;
  minute: number;
  onConfirm: (h: number, m: number) => void;
  onClose: () => void;
}

function TimePickerModal({ visible, hour, minute, onConfirm, onClose }: TimePickerProps) {
  const [h, setH] = useState(hour);
  const [m, setM] = useState(minute);

  const HOURS = Array.from({ length: 24 }, (_, i) => i);
  const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={tp.overlay}>
        <View style={tp.sheet}>
          <Text style={tp.title}>Heure de rappel par défaut</Text>
          <Text style={tp.subtitle}>Pour les routines sans heure définie</Text>

          <View style={tp.pickers}>
            {/* Hours */}
            <View style={tp.pickerCol}>
              <Text style={tp.pickerLabel}>Heure</Text>
              <ScrollView style={tp.pickerScroll} showsVerticalScrollIndicator={false}>
                {HOURS.map(hv => (
                  <TouchableOpacity
                    key={hv}
                    style={[tp.pickerItem, h === hv && tp.pickerItemActive]}
                    onPress={() => setH(hv)}
                  >
                    <Text style={[tp.pickerItemText, h === hv && tp.pickerItemTextActive]}>
                      {String(hv).padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <Text style={tp.colon}>:</Text>

            {/* Minutes */}
            <View style={tp.pickerCol}>
              <Text style={tp.pickerLabel}>Min</Text>
              <ScrollView style={tp.pickerScroll} showsVerticalScrollIndicator={false}>
                {MINUTES.map(mv => (
                  <TouchableOpacity
                    key={mv}
                    style={[tp.pickerItem, m === mv && tp.pickerItemActive]}
                    onPress={() => setM(mv)}
                  >
                    <Text style={[tp.pickerItemText, m === mv && tp.pickerItemTextActive]}>
                      {String(mv).padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={tp.actions}>
            <TouchableOpacity style={tp.cancelBtn} onPress={onClose}>
              <Text style={tp.cancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={tp.confirmBtn}
              onPress={() => { onConfirm(h, m); onClose(); }}
            >
              <Text style={tp.confirmText}>Confirmer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const tp = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: Spacing.xl,
    paddingBottom: 40,
    gap: Spacing.lg,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: -8,
  },
  pickers: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  pickerCol: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  pickerLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  pickerScroll: {
    height: 180,
    width: 72,
  },
  pickerItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  pickerItemActive: {
    backgroundColor: Colors.primaryLight,
  },
  pickerItemText: {
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  pickerItemTextActive: {
    color: Colors.primaryDark,
    fontWeight: FontWeight.bold,
  },
  colon: {
    fontSize: 32,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginTop: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  cancelBtn: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: Radii.xl,
    backgroundColor: Colors.borderLight,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  confirmBtn: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: Radii.xl,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  confirmText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },
});

// ─── Setting Row ──────────────────────────────────────────────────────────────

interface SettingRowProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  iconColor: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
}

function SettingRow({ icon, iconColor, title, subtitle, right, onPress, disabled }: SettingRowProps) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.98} style={[row.wrapper, disabled && row.disabled]}>
      <View style={[row.iconBox, { backgroundColor: iconColor + '18' }]}>
        <MaterialIcons name={icon} size={22} color={iconColor} />
      </View>
      <View style={row.content}>
        <Text style={row.title}>{title}</Text>
        {subtitle ? <Text style={row.subtitle}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={row.right}>{right}</View> : null}
    </PressableScale>
  );
}

const row = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  disabled: {
    opacity: 0.4,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  right: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={sc.wrapper}>
      <Text style={sc.title}>{title}</Text>
      <View style={sc.card}>{children}</View>
    </View>
  );
}

const sc = StyleSheet.create({
  wrapper: {
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    overflow: 'hidden',
    ...Shadow.soft,
    gap: 0,
  },
});

// ─── Permission Banner ────────────────────────────────────────────────────────

function PermissionBanner({ onRequest }: { onRequest: () => void }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[banner.wrapper, animStyle]}>
      <View style={banner.left}>
        <MaterialIcons name="notifications-off" size={28} color={Colors.warning} />
        <View>
          <Text style={banner.title}>Notifications désactivées</Text>
          <Text style={banner.subtitle}>Autorisez les notifications pour recevoir des rappels</Text>
        </View>
      </View>
      <PressableScale
        onPress={onRequest}
        scaleTo={0.92}
        style={banner.btn}
      >
        <Text style={banner.btnText}>Activer</Text>
      </PressableScale>
    </Animated.View>
  );
}

const banner = StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.warningLight,
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
    borderWidth: 1.5,
    borderColor: Colors.warning + '40',
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.orange,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
    flexShrink: 1,
  },
  btn: {
    backgroundColor: Colors.warning,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.round,
  },
  btnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },
});

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ count }: { count: number }) {
  return (
    <View style={[sb.wrapper, { backgroundColor: count > 0 ? Colors.primaryLight : Colors.borderLight }]}>
      <Text style={[sb.text, { color: count > 0 ? Colors.primaryDark : Colors.textTertiary }]}>
        {count} actif{count !== 1 ? 's' : ''}
      </Text>
    </View>
  );
}

const sb = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.round,
  },
  text: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const {
    settings,
    scheduledCount,
    requestPermissions,
    toggleTasksNotifications,
    toggleRoutinesNotifications,
    setRoutineDefaultTime,
    cancelAll,
  } = useNotifications();

  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [cancelConfirmVisible, setCancelConfirmVisible] = useState(false);

  const handleRequestPermissions = async () => {
    await requestPermissions();
  };

  const defaultTimeLabel = `${String(settings.routineDefaultHour).padStart(2, '0')}:${String(settings.routineDefaultMinute).padStart(2, '0')}`;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Paramètres</Text>
        <Text style={styles.subtitle}>Notifications & préférences</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Permission Banner */}
        {!settings.permissionGranted ? (
          <PermissionBanner onRequest={handleRequestPermissions} />
        ) : null}

        {/* Status */}
        <SectionCard title="Statut">
          <SettingRow
            icon="notifications-active"
            iconColor={Colors.primary}
            title="Notifications planifiées"
            subtitle="Rappels actifs en ce moment"
            right={<StatusBadge count={scheduledCount} />}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="check-circle"
            iconColor={settings.permissionGranted ? Colors.success : Colors.warning}
            title="Permission système"
            subtitle={settings.permissionGranted ? 'Autorisé' : 'Non autorisé'}
            right={
              <MaterialIcons
                name={settings.permissionGranted ? 'check-circle' : 'error-outline'}
                size={22}
                color={settings.permissionGranted ? Colors.success : Colors.warning}
              />
            }
          />
        </SectionCard>

        {/* Tasks */}
        <SectionCard title="Tâches">
          <SettingRow
            icon="check-circle-outline"
            iconColor={Colors.primary}
            title="Rappels tâches"
            subtitle="Notifier à l'heure définie pour chaque tâche"
            disabled={!settings.permissionGranted}
            right={
              <Switch
                value={settings.tasksEnabled}
                onValueChange={toggleTasksNotifications}
                trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                thumbColor={settings.tasksEnabled ? Colors.primary : Colors.textTertiary}
                disabled={!settings.permissionGranted}
              />
            }
          />
        </SectionCard>

        {/* Routines */}
        <SectionCard title="Routines">
          <SettingRow
            icon="loop"
            iconColor={Colors.purple}
            title="Rappels routines"
            subtitle="Rappel quotidien / hebdomadaire"
            disabled={!settings.permissionGranted}
            right={
              <Switch
                value={settings.routinesEnabled}
                onValueChange={toggleRoutinesNotifications}
                trackColor={{ false: Colors.border, true: Colors.purpleLight }}
                thumbColor={settings.routinesEnabled ? Colors.purple : Colors.textTertiary}
                disabled={!settings.permissionGranted}
              />
            }
          />
          <View style={styles.divider} />
          <SettingRow
            icon="access-time"
            iconColor={Colors.teal}
            title="Heure par défaut"
            subtitle={`Routines sans heure définie : ${defaultTimeLabel}`}
            disabled={!settings.permissionGranted || !settings.routinesEnabled}
            onPress={() => {
              if (settings.permissionGranted && settings.routinesEnabled) {
                setTimePickerVisible(true);
              }
            }}
            right={
              <View style={styles.timeChipRight}>
                <Text style={styles.timeChipText}>{defaultTimeLabel}</Text>
                <MaterialIcons name="chevron-right" size={18} color={Colors.textTertiary} />
              </View>
            }
          />
        </SectionCard>

        {/* How it works */}
        <SectionCard title="Fonctionnement">
          {[
            {
              icon: 'bolt' as keyof typeof MaterialIcons.glyphMap,
              color: Colors.primary,
              title: 'Tâches avec heure',
              subtitle: 'Rappel unique à l\'heure exacte définie',
            },
            {
              icon: 'loop' as keyof typeof MaterialIcons.glyphMap,
              color: Colors.purple,
              title: 'Routines daily',
              subtitle: 'Rappel chaque jour à l\'heure de la routine',
            },
            {
              icon: 'date-range' as keyof typeof MaterialIcons.glyphMap,
              color: Colors.orange,
              title: 'Routines weekly',
              subtitle: 'Rappel hebdomadaire à l\'heure définie',
            },
            {
              icon: 'auto-awesome' as keyof typeof MaterialIcons.glyphMap,
              color: Colors.teal,
              title: 'Création automatique',
              subtitle: 'Notification planifiée à chaque ajout d\'item',
            },
          ].map((item, i, arr) => (
            <React.Fragment key={item.title}>
              <SettingRow
                icon={item.icon}
                iconColor={item.color}
                title={item.title}
                subtitle={item.subtitle}
              />
              {i < arr.length - 1 ? <View style={styles.divider} /> : null}
            </React.Fragment>
          ))}
        </SectionCard>

        {/* Danger zone */}
        <SectionCard title="Actions">
          <SettingRow
            icon="notifications-off"
            iconColor={Colors.danger}
            title="Annuler toutes les notifications"
            subtitle="Supprimer tous les rappels planifiés"
            onPress={() => setCancelConfirmVisible(true)}
            right={<MaterialIcons name="chevron-right" size={20} color={Colors.textTertiary} />}
          />
        </SectionCard>

        {/* App info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>ProductivityAI · v1.0</Text>
          <Text style={styles.footerSub}>Vos données restent sur l'appareil</Text>
        </View>
      </ScrollView>

      {/* Time Picker Modal */}
      <TimePickerModal
        visible={timePickerVisible}
        hour={settings.routineDefaultHour}
        minute={settings.routineDefaultMinute}
        onConfirm={(h, m) => setRoutineDefaultTime(h, m)}
        onClose={() => setTimePickerVisible(false)}
      />

      {/* Cancel All Confirm */}
      <Modal visible={cancelConfirmVisible} transparent animationType="fade">
        <View style={confirm.overlay}>
          <View style={confirm.dialog}>
            <MaterialIcons name="warning" size={40} color={Colors.warning} />
            <Text style={confirm.title}>Annuler tous les rappels ?</Text>
            <Text style={confirm.subtitle}>
              {scheduledCount} notification{scheduledCount !== 1 ? 's' : ''} sera supprimée{scheduledCount !== 1 ? 's' : ''}. Cette action est irréversible.
            </Text>
            <View style={confirm.actions}>
              <TouchableOpacity
                style={confirm.cancelBtn}
                onPress={() => setCancelConfirmVisible(false)}
              >
                <Text style={confirm.cancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={confirm.confirmBtn}
                onPress={async () => {
                  await cancelAll();
                  setCancelConfirmVisible(false);
                }}
              >
                <Text style={confirm.confirmText}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const confirm = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  dialog: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.xxl,
    padding: Spacing.xxl,
    gap: Spacing.md,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    ...Shadow.strong,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
    marginTop: Spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: Radii.xl,
    backgroundColor: Colors.borderLight,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  confirmBtn: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: Radii.xl,
    backgroundColor: Colors.danger,
    alignItems: 'center',
  },
  confirmText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.md,
  },
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.extrabold,
    color: Colors.text,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginHorizontal: Spacing.lg,
  },
  timeChipRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  timeChipText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.teal,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: 4,
  },
  footerText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textTertiary,
  },
  footerSub: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
});
