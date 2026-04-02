import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Pressable,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  FadeInDown,
  SlideInRight,
} from 'react-native-reanimated';
import { Colors, FontSize, FontWeight, Radii, Shadow, Spacing } from '../../constants/theme';
import { useApp } from '../../contexts/AppContext';
import { Task, Routine } from '../../types';
import { PressableScale } from '../../components/ui/PressableScale';
import { EditTaskModal } from '../../components/ui/EditTaskModal';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const WEEKDAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function toDateStr(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  // Pad start (Sunday = 0)
  for (let i = 0; i < first.getDay(); i++) {
    const d = new Date(year, month, -i);
    days.unshift(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
  }
  for (let d = 1; d <= last.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  // Pad end to complete last row
  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      days.push(new Date(year, month + 1, i));
    }
  }
  return days;
}

// ─── Types ───────────────────────────────────────────────────────────────────

type CalendarEvent = {
  id: string;
  type: 'task' | 'routine';
  title: string;
  time?: string;
  completed: boolean;
  color: string;
  raw: Task | Routine;
};

// ─── DayCell ─────────────────────────────────────────────────────────────────

function DayCell({
  date,
  isSelected,
  isToday,
  isCurrentMonth,
  dotColors,
  onPress,
}: {
  date: Date;
  isSelected: boolean;
  isToday: boolean;
  isCurrentMonth: boolean;
  dotColors: string[];
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.85, { damping: 15 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15 }); }}
      style={styles.dayCellPressable}
    >
      <Animated.View
        style={[
          styles.dayCell,
          isSelected && styles.dayCellSelected,
          isToday && !isSelected && styles.dayCellToday,
          animStyle,
        ]}
      >
        <Text
          style={[
            styles.dayNumber,
            isSelected && styles.dayNumberSelected,
            isToday && !isSelected && styles.dayNumberToday,
            !isCurrentMonth && styles.dayNumberFaded,
          ]}
        >
          {date.getDate()}
        </Text>
        {/* Event dots */}
        {dotColors.length > 0 && (
          <View style={styles.dotRow}>
            {dotColors.slice(0, 3).map((c, i) => (
              <View key={i} style={[styles.dot, { backgroundColor: isSelected ? '#fff' : c }]} />
            ))}
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

// ─── EventRow ────────────────────────────────────────────────────────────────

function EventRow({ event, index, onLongPress }: { event: CalendarEvent; index: number; onLongPress: () => void }) {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50).springify()}
      style={[styles.eventRow, { borderLeftColor: event.color }]}
    >
      <Pressable onLongPress={onLongPress} style={styles.eventRowInner}>
        <View style={styles.eventLeft}>
          <View style={[styles.eventDot, { backgroundColor: event.color }]} />
          <View style={styles.eventInfo}>
            <Text
              style={[styles.eventTitle, event.completed && styles.eventTitleDone]}
              numberOfLines={1}
            >
              {event.title}
            </Text>
            {event.time ? (
              <View style={styles.eventMeta}>
                <MaterialIcons name="access-time" size={12} color={Colors.textTertiary} />
                <Text style={styles.eventTime}>{event.time}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <View style={styles.eventRight}>
          <View style={[styles.typeBadge, { backgroundColor: event.color + '20' }]}>
            <MaterialIcons
              name={event.type === 'task' ? 'check-circle-outline' : 'loop'}
              size={13}
              color={event.color}
            />
            <Text style={[styles.typeText, { color: event.color }]}>
              {event.type === 'task' ? 'Tâche' : 'Routine'}
            </Text>
          </View>
          {event.completed && (
            <View style={styles.doneCheck}>
              <MaterialIcons name="check" size={14} color={Colors.primary} />
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const { tasks, routines } = useApp();

  const today = new Date();
  const todayStr = toDateStr(today);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [editTask, setEditTask] = useState<Task | null>(null);

  // All days grid for the current month view
  const days = useMemo(() => getDaysInMonth(viewYear, viewMonth), [viewYear, viewMonth]);

  // Build a map: dateStr → events[]
  const eventMap = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};

    for (const task of tasks) {
      const key = task.date ?? todayStr;
      if (!map[key]) map[key] = [];
      map[key].push({
        id: task.id,
        type: 'task',
        title: task.title,
        time: task.time,
        completed: task.completed,
        color: task.priority === 'high' ? Colors.danger : task.priority === 'medium' ? Colors.primary : Colors.teal,
        raw: task,
      });
    }

    // Routines: show on every day (daily) or every Monday (weekly) within visible range
    for (const routine of routines) {
      const daysInView = days.map(d => toDateStr(d));
      for (const dateStr of daysInView) {
        const d = new Date(dateStr);
        const shouldShow =
          routine.repeat === 'daily' ||
          (routine.repeat === 'weekly' && d.getDay() === 1) ||
          (routine.repeat === 'monthly' && d.getDate() === 1);
        if (!shouldShow) continue;
        if (!map[dateStr]) map[dateStr] = [];
        // Avoid duplicate entries
        if (!map[dateStr].find(e => e.id === routine.id)) {
          map[dateStr].push({
            id: routine.id,
            type: 'routine',
            title: routine.title,
            time: routine.time,
            completed: routine.completed,
            color: routine.color || Colors.purple,
            raw: routine,
          });
        }
      }
    }

    return map;
  }, [tasks, routines, days, todayStr]);

  const selectedEvents = useMemo(() => {
    return (eventMap[selectedDate] ?? []).sort((a, b) => {
      if (!a.time) return 1;
      if (!b.time) return -1;
      return a.time.localeCompare(b.time);
    });
  }, [eventMap, selectedDate]);

  // Stats for selected date
  const doneCount = selectedEvents.filter(e => e.completed).length;
  const totalCount = selectedEvents.length;

  const prevMonth = useCallback(() => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }, [viewMonth]);

  const nextMonth = useCallback(() => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }, [viewMonth]);

  const goToToday = useCallback(() => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDate(todayStr);
  }, [todayStr]);

  const isCurrentMonthView = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Calendrier</Text>
          <Text style={styles.subtitle}>{MONTHS[viewMonth]} {viewYear}</Text>
        </View>
        <View style={styles.headerRight}>
          {!isCurrentMonthView && (
            <PressableScale onPress={goToToday} scaleTo={0.88} style={styles.todayBtn}>
              <Text style={styles.todayBtnText}>Auj.</Text>
            </PressableScale>
          )}
          <PressableScale onPress={prevMonth} scaleTo={0.85} style={styles.navBtn}>
            <MaterialIcons name="chevron-left" size={24} color={Colors.text} />
          </PressableScale>
          <PressableScale onPress={nextMonth} scaleTo={0.85} style={styles.navBtn}>
            <MaterialIcons name="chevron-right" size={24} color={Colors.text} />
          </PressableScale>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}>
        {/* ─── Calendar Grid ─────────────────────────────────────────────── */}
        <View style={styles.calendarCard}>
          {/* Weekday headers */}
          <View style={styles.weekdayRow}>
            {WEEKDAYS.map(d => (
              <Text key={d} style={[styles.weekdayLabel, d === 'Dim' && styles.weekdayLabelSun]}>
                {d}
              </Text>
            ))}
          </View>

          {/* Day cells */}
          <View style={styles.daysGrid}>
            {days.map((date, i) => {
              const dateStr = toDateStr(date);
              const isCurrentMonth = date.getMonth() === viewMonth;
              const dotColors = [...new Set((eventMap[dateStr] ?? []).map(e => e.color))];
              return (
                <DayCell
                  key={dateStr + i}
                  date={date}
                  isSelected={dateStr === selectedDate}
                  isToday={dateStr === todayStr}
                  isCurrentMonth={isCurrentMonth}
                  dotColors={dotColors}
                  onPress={() => setSelectedDate(dateStr)}
                />
              );
            })}
          </View>
        </View>

        {/* ─── Selected day summary ───────────────────────────────────────── */}
        <Animated.View entering={FadeIn.duration(200)} style={styles.selectedDayHeader}>
          <View style={styles.selectedDayLeft}>
            <Text style={styles.selectedDayTitle}>
              {selectedDate === todayStr
                ? "Aujourd'hui"
                : new Date(selectedDate + 'T00:00:00').toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
            </Text>
            {totalCount > 0 ? (
              <Text style={styles.selectedDaySubtitle}>
                {doneCount}/{totalCount} terminés
              </Text>
            ) : (
              <Text style={styles.selectedDaySubtitle}>Aucun événement</Text>
            )}
          </View>

          {/* Mini progress */}
          {totalCount > 0 && (
            <View style={styles.miniProgress}>
              <View style={styles.miniProgressTrack}>
                <Animated.View
                  style={[
                    styles.miniProgressFill,
                    { width: `${Math.round((doneCount / totalCount) * 100)}%` },
                  ]}
                />
              </View>
              <Text style={styles.miniProgressPct}>
                {Math.round((doneCount / totalCount) * 100)}%
              </Text>
            </View>
          )}
        </Animated.View>

        {/* ─── Events list ────────────────────────────────────────────────── */}
        <View style={styles.eventsContainer}>
          {selectedEvents.length === 0 ? (
            <Animated.View entering={FadeInDown.duration(300)} style={styles.emptyDay}>
              <View style={styles.emptyDayIcon}>
                <MaterialIcons name="event-available" size={32} color={Colors.primary} />
              </View>
              <Text style={styles.emptyDayTitle}>Journée libre</Text>
              <Text style={styles.emptyDaySubtitle}>Aucune tâche ni routine prévue</Text>
            </Animated.View>
          ) : (
            selectedEvents.map((event, i) => (
              <EventRow
                key={event.id + selectedDate}
                event={event}
                index={i}
                onLongPress={() => {
                  if (event.type === 'task') setEditTask(event.raw as Task);
                }}
              />
            ))
          )}
        </View>

        {/* ─── Month summary strip ─────────────────────────────────────────── */}
        <View style={styles.monthlySummaryCard}>
          <Text style={styles.monthlySummaryTitle}>Ce mois</Text>
          <View style={styles.monthlySummaryRow}>
            {[
              { label: 'Tâches', value: tasks.filter(t => {
                  const d = t.date ? new Date(t.date) : null;
                  return d && d.getFullYear() === viewYear && d.getMonth() === viewMonth;
                }).length, icon: 'check-circle-outline' as const, color: Colors.primary },
              { label: 'Complétées', value: tasks.filter(t => {
                  const d = t.date ? new Date(t.date) : null;
                  return t.completed && d && d.getFullYear() === viewYear && d.getMonth() === viewMonth;
                }).length, icon: 'done-all' as const, color: Colors.success },
              { label: 'Routines actives', value: routines.length, icon: 'loop' as const, color: Colors.purple },
            ].map(({ label, value, icon, color }) => (
              <View key={label} style={styles.summaryItem}>
                <View style={[styles.summaryIconBox, { backgroundColor: color + '18' }]}>
                  <MaterialIcons name={icon} size={20} color={color} />
                </View>
                <Text style={styles.summaryValue}>{value}</Text>
                <Text style={styles.summaryLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* ─── Edit task modal (long press) ────────────────────────────────── */}
      <EditTaskModal
        visible={editTask !== null}
        task={editTask}
        onClose={() => setEditTask(null)}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
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
    textTransform: 'capitalize',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.soft,
  },
  todayBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radii.round,
    backgroundColor: Colors.primaryLight,
  },
  todayBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.primaryDark,
  },

  // Calendar card
  calendarCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    marginHorizontal: Spacing.lg,
    padding: Spacing.md,
    ...Shadow.soft,
    marginBottom: Spacing.lg,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    paddingVertical: 4,
  },
  weekdayLabelSun: {
    color: Colors.danger,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCellPressable: {
    width: `${100 / 7}%`,
    aspectRatio: 0.85,
    padding: 2,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    gap: 2,
  },
  dayCellSelected: {
    backgroundColor: Colors.primary,
  },
  dayCellToday: {
    backgroundColor: Colors.primaryLight,
  },
  dayNumber: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  dayNumberSelected: {
    color: '#fff',
    fontWeight: FontWeight.bold,
  },
  dayNumberToday: {
    color: Colors.primaryDark,
    fontWeight: FontWeight.bold,
  },
  dayNumberFaded: {
    color: Colors.textTertiary,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 2,
    alignItems: 'center',
    minHeight: 5,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  // Selected day header
  selectedDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  selectedDayLeft: {
    flex: 1,
  },
  selectedDayTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textTransform: 'capitalize',
  },
  selectedDaySubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  miniProgress: {
    alignItems: 'flex-end',
    gap: 3,
  },
  miniProgressTrack: {
    width: 80,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.border,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  miniProgressPct: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },

  // Events
  eventsContainer: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  eventRow: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    borderLeftWidth: 3,
    ...Shadow.soft,
    overflow: 'hidden',
  },
  eventRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  eventLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  eventDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  eventInfo: {
    flex: 1,
    gap: 2,
  },
  eventTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  eventTitleDone: {
    textDecorationLine: 'line-through',
    color: Colors.textTertiary,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  eventTime: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: FontWeight.medium,
  },
  eventRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.round,
  },
  typeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  doneCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty day
  emptyDay: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.sm,
  },
  emptyDayIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emptyDayTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  emptyDaySubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },

  // Monthly summary
  monthlySummaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    ...Shadow.soft,
    gap: Spacing.md,
  },
  monthlySummaryTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  monthlySummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  summaryIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extrabold,
    color: Colors.text,
  },
  summaryLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
