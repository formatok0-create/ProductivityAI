import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Platform,
  TouchableOpacity,
} from 'react-native';
import RNDateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Radii, Shadow, Spacing } from '../../constants/theme';
import { PressableScale } from './PressableScale';

// ─── Date Picker Button ───────────────────────────────────────────────────────

interface DatePickerProps {
  label?: string;
  value: string;           // 'YYYY-MM-DD' or ''
  onChange: (v: string) => void;
  placeholder?: string;
  minDate?: Date;
}

export function DatePickerField({ label, value, onChange, placeholder = 'Sélectionner une date', minDate }: DatePickerProps) {
  const [show, setShow] = useState(false);

  const parsed = value ? new Date(value + 'T00:00:00') : new Date();
  const isSet = !!value;

  const display = isSet
    ? new Date(value + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
    : placeholder;

  const handleChange = (_: any, selected?: Date) => {
    if (Platform.OS === 'android') setShow(false);
    if (selected) {
      const y = selected.getFullYear();
      const m = String(selected.getMonth() + 1).padStart(2, '0');
      const d = String(selected.getDate()).padStart(2, '0');
      onChange(`${y}-${m}-${d}`);
    }
  };

  return (
    <View style={styles.fieldWrap}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}

      <PressableScale onPress={() => setShow(true)} scaleTo={0.97}>
        <View style={[styles.pickerBtn, isSet && styles.pickerBtnActive]}>
          <MaterialIcons
            name="event"
            size={18}
            color={isSet ? Colors.primary : Colors.textSecondary}
          />
          <Text style={[styles.pickerBtnText, !isSet && styles.pickerBtnPlaceholder]}>
            {display}
          </Text>
          {isSet ? (
            <PressableScale onPress={() => onChange('')} scaleTo={0.85} style={styles.clearBtn}>
              <MaterialIcons name="close" size={15} color={Colors.textTertiary} />
            </PressableScale>
          ) : (
            <MaterialIcons name="chevron-right" size={18} color={Colors.textTertiary} />
          )}
        </View>
      </PressableScale>

      {/* Android: inline picker */}
      {Platform.OS === 'android' && show ? (
        <RNDateTimePicker
          mode="date"
          value={parsed}
          minimumDate={minDate}
          onChange={handleChange}
          display="default"
        />
      ) : null}

      {/* iOS: modal picker */}
      {Platform.OS === 'ios' && (
        <Modal visible={show} transparent animationType="slide">
          <View style={styles.iosOverlay}>
            <TouchableOpacity style={styles.iosBackdrop} onPress={() => setShow(false)} activeOpacity={1} />
            <View style={styles.iosSheet}>
              <View style={styles.iosHeader}>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={styles.iosDone}>Fermer</Text>
                </TouchableOpacity>
                <Text style={styles.iosTitle}>{label ?? 'Date'}</Text>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={[styles.iosDone, { color: Colors.primary }]}>OK</Text>
                </TouchableOpacity>
              </View>
              <RNDateTimePicker
                mode="date"
                value={parsed}
                minimumDate={minDate}
                onChange={handleChange}
                display="spinner"
                style={{ width: '100%' }}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

// ─── Time Picker Button ───────────────────────────────────────────────────────

interface TimePickerProps {
  label?: string;
  value: string;           // 'HH:MM' or ''
  onChange: (v: string) => void;
  placeholder?: string;
}

export function TimePickerField({ label, value, onChange, placeholder = 'Sélectionner une heure' }: TimePickerProps) {
  const [show, setShow] = useState(false);

  const toDate = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    const d = new Date();
    d.setHours(h || 0, m || 0, 0, 0);
    return d;
  };

  const parsed = value ? toDate(value) : new Date();
  const isSet = !!value;

  const display = isSet ? value : placeholder;

  const handleChange = (_: any, selected?: Date) => {
    if (Platform.OS === 'android') setShow(false);
    if (selected) {
      const h = String(selected.getHours()).padStart(2, '0');
      const m = String(selected.getMinutes()).padStart(2, '0');
      onChange(`${h}:${m}`);
    }
  };

  return (
    <View style={styles.fieldWrap}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}

      <PressableScale onPress={() => setShow(true)} scaleTo={0.97}>
        <View style={[styles.pickerBtn, isSet && styles.pickerBtnActive]}>
          <MaterialIcons
            name="access-time"
            size={18}
            color={isSet ? Colors.primary : Colors.textSecondary}
          />
          <Text style={[styles.pickerBtnText, !isSet && styles.pickerBtnPlaceholder]}>
            {display}
          </Text>
          {isSet ? (
            <PressableScale onPress={() => onChange('')} scaleTo={0.85} style={styles.clearBtn}>
              <MaterialIcons name="close" size={15} color={Colors.textTertiary} />
            </PressableScale>
          ) : (
            <MaterialIcons name="chevron-right" size={18} color={Colors.textTertiary} />
          )}
        </View>
      </PressableScale>

      {/* Android: inline picker */}
      {Platform.OS === 'android' && show ? (
        <RNDateTimePicker
          mode="time"
          value={parsed}
          is24Hour
          onChange={handleChange}
          display="default"
        />
      ) : null}

      {/* iOS: modal picker */}
      {Platform.OS === 'ios' && (
        <Modal visible={show} transparent animationType="slide">
          <View style={styles.iosOverlay}>
            <TouchableOpacity style={styles.iosBackdrop} onPress={() => setShow(false)} activeOpacity={1} />
            <View style={styles.iosSheet}>
              <View style={styles.iosHeader}>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={styles.iosDone}>Fermer</Text>
                </TouchableOpacity>
                <Text style={styles.iosTitle}>{label ?? 'Heure'}</Text>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={[styles.iosDone, { color: Colors.primary }]}>OK</Text>
                </TouchableOpacity>
              </View>
              <RNDateTimePicker
                mode="time"
                value={parsed}
                is24Hour
                onChange={handleChange}
                display="spinner"
                style={{ width: '100%' }}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  fieldWrap: { gap: 6 },
  fieldLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    minHeight: 50,
  },
  pickerBtnActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  pickerBtnText: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: FontWeight.medium,
  },
  pickerBtnPlaceholder: {
    color: Colors.textTertiary,
    fontWeight: FontWeight.regular,
  },
  clearBtn: {
    padding: 2,
  },
  // iOS modal
  iosOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  iosBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  iosSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
    ...Shadow.strong,
  },
  iosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  iosTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  iosDone: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
});
