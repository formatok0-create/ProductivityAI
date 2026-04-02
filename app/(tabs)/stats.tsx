import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  FadeInDown,
  FadeIn,
} from 'react-native-reanimated';
import { Colors, FontSize, FontWeight, Radii, Shadow, Spacing } from '../../constants/theme';
import { useApp } from '../../contexts/AppContext';
import * as storage from '../../services/storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - Spacing.lg * 2 - Spacing.xl * 2;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

function getDayLabel(dateStr: string, short = true): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { weekday: short ? 'short' : 'long' });
}

function getLast12Weeks(): string[][] {
  const weeks: string[][] = [];
  const today = new Date();
  // Start from Monday of 12 weeks ago
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 7 * 12 + 1);

  for (let w = 0; w < 12; w++) {
    const week: string[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + w * 7 + d);
      week.push(date.toISOString().split('T')[0]);
    }
    weeks.push(week);
  }
  return weeks;
}

function getHeatmapColor(count: number): string {
  if (count === 0) return Colors.border;
  if (count === 1) return Colors.primary + '50';
  if (count === 2) return Colors.primary + '80';
  if (count === 3) return Colors.primary + 'B0';
  return Colors.primary;
}

// ─── Animated Bar ─────────────────────────────────────────────────────────────

function XPBar({
  value,
  maxValue,
  label,
  index,
  isToday,
}: {
  value: number;
  maxValue: number;
  label: string;
  index: number;
  isToday: boolean;
}) {
  const BAR_MAX_HEIGHT = 120;
  const height = useSharedValue(0);
  const target = maxValue > 0 ? Math.max((value / maxValue) * BAR_MAX_HEIGHT, value > 0 ? 4 : 0) : 0;

  useEffect(() => {
    height.value = withDelay(index * 80, withSpring(target, { damping: 14, stiffness: 120 }));
  }, [target]);

  const barStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <View style={barStyles.col}>
      {value > 0 ? (
        <Animated.View entering={FadeIn.delay(index * 80 + 400)}>
          <Text style={barStyles.barValue}>{value}</Text>
        </Animated.View>
      ) : (
        <View style={{ height: 16 }} />
      )}
      <View style={barStyles.barTrack}>
        <Animated.View
          style={[
            barStyles.bar,
            barStyle,
            isToday && barStyles.barToday,
          ]}
        />
      </View>
      <Text style={[barStyles.barLabel, isToday && barStyles.barLabelToday]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const barStyles = StyleSheet.create({
  col: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  barValue: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.primaryDark,
    height: 16,
  },
  barTrack: {
    width: '70%',
    height: 120,
    justifyContent: 'flex-end',
    backgroundColor: Colors.primaryLight,
    borderRadius: 6,
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 6,
  },
  barToday: {
    backgroundColor: Colors.primaryDark,
  },
  barLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
    textAlign: 'center',
  },
  barLabelToday: {
    color: Colors.primaryDark,
    fontWeight: FontWeight.bold,
  },
});

// ─── Streak Sparkline ─────────────────────────────────────────────────────────

function StreakSparkline({ data }: { data: { date: string; streak: number }[] }) {
  const maxStreak = Math.max(...data.map(d => d.streak), 1);
  const H = 72;
  const W = CHART_WIDTH - Spacing.lg * 2;
  const pointCount = data.length;
  const stepX = pointCount > 1 ? W / (pointCount - 1) : W;

  const points = data.map((d, i) => ({
    x: i * stepX,
    y: H - (d.streak / maxStreak) * H,
    streak: d.streak,
    date: d.date,
  }));

  // Build SVG-like path as a series of connected View line segments
  return (
    <View style={sparklineStyles.container}>
      {points.map((pt, i) => {
        if (i === 0) return null;
        const prev = points[i - 1];
        const dx = pt.x - prev.x;
        const dy = pt.y - prev.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        return (
          <View
            key={i}
            style={[
              sparklineStyles.segment,
              {
                width: length,
                left: prev.x,
                top: prev.y,
                transform: [{ rotate: `${angle}deg` }],
              },
            ]}
          />
        );
      })}
      {/* Dots */}
      {points.map((pt, i) => (
        <View
          key={`dot-${i}`}
          style={[
            sparklineStyles.dot,
            {
              left: pt.x - 5,
              top: pt.y - 5,
              backgroundColor: pt.streak > 0 ? Colors.streakOrange : Colors.border,
            },
          ]}
        />
      ))}
      {/* Invisible baseline for layout height */}
      <View style={{ height: H + 10 }} />
    </View>
  );
}

const sparklineStyles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
    marginVertical: Spacing.sm,
  },
  segment: {
    position: 'absolute',
    height: 2.5,
    backgroundColor: Colors.streakOrange,
    borderRadius: 2,
    transformOrigin: '0 50%',
  } as any,
  dot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#fff',
  },
});

// ─── Heatmap ──────────────────────────────────────────────────────────────────

function RoutineHeatmap({ data }: { data: Record<string, number> }) {
  const weeks = getLast12Weeks();
  const WEEK_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const cellSize = Math.floor((CHART_WIDTH - 24) / 12) - 3;

  return (
    <View style={heatStyles.wrapper}>
      <View style={heatStyles.grid}>
        {weeks.map((week, wi) => (
          <View key={wi} style={heatStyles.weekCol}>
            {week.map((dateStr, di) => {
              const count = data[dateStr] ?? 0;
              return (
                <View
                  key={dateStr}
                  style={[
                    heatStyles.cell,
                    {
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: getHeatmapColor(count),
                    },
                  ]}
                />
              );
            })}
          </View>
        ))}
      </View>
      {/* Legend */}
      <View style={heatStyles.legend}>
        <Text style={heatStyles.legendLabel}>0</Text>
        {[0, 1, 2, 3, 4].map(v => (
          <View
            key={v}
            style={[heatStyles.legendCell, { backgroundColor: getHeatmapColor(v) }]}
          />
        ))}
        <Text style={heatStyles.legendLabel}>4+</Text>
      </View>
    </View>
  );
}

const heatStyles = StyleSheet.create({
  wrapper: {
    gap: Spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    gap: 3,
  },
  weekCol: {
    gap: 3,
  },
  cell: {
    borderRadius: 3,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  legendCell: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendLabel: {
    fontSize: 10,
    color: Colors.textTertiary,
    fontWeight: FontWeight.medium,
  },
});

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  color,
  sub,
  index,
}: {
  icon: string;
  label: string;
  value: string | number;
  color: string;
  sub?: string;
  index: number;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify()} style={[statStyles.card]}>
      <View style={[statStyles.iconBox, { backgroundColor: color + '18' }]}>
        <MaterialIcons name={icon as any} size={22} color={color} />
      </View>
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
      {sub ? <Text style={statStyles.sub}>{sub}</Text> : null}
    </Animated.View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: 6,
    ...Shadow.soft,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  value: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.extrabold,
    color: Colors.text,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  sub: {
    fontSize: 10,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
});

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={sectionStyles.row}>
      <Text style={sectionStyles.title}>{title}</Text>
      {subtitle ? <Text style={sectionStyles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    marginTop: Spacing.xl,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const { tasks, routines, projects, stats } = useApp();

  const [dailyXP, setDailyXP] = useState<Record<string, number>>({});
  const [dailyRoutines, setDailyRoutines] = useState<Record<string, number>>({});
  const [streakHistory, setStreakHistory] = useState<Record<string, number>>({});

  useEffect(() => {
    Promise.all([
      storage.getDailyXPHistory(),
      storage.getDailyRoutineHistory(),
      storage.getStreakHistory(),
    ]).then(([xp, routinesData, streakData]) => {
      setDailyXP(xp);
      setDailyRoutines(routinesData);
      setStreakHistory(streakData);
    });
  }, []);

  const last7Days = useMemo(() => getLast7Days(), []);
  const today = new Date().toISOString().split('T')[0];

  // XP bar chart data
  const xpData = useMemo(() => {
    return last7Days.map(d => ({ date: d, xp: dailyXP[d] ?? 0 }));
  }, [last7Days, dailyXP]);
  const maxXP = useMemo(() => Math.max(...xpData.map(d => d.xp), 1), [xpData]);

  // Streak sparkline (last 7 days)
  const streakData = useMemo(() => {
    return last7Days.map(d => ({
      date: d,
      streak: streakHistory[d] ?? 0,
    }));
  }, [last7Days, streakHistory]);

  // Derived stats
  const completedTasks = tasks.filter(t => t.completed).length;
  const completedProjects = projects.filter(p => {
    if (p.taskIds.length === 0) return false;
    const ptasks = tasks.filter(t => p.taskIds.includes(t.id));
    return ptasks.length > 0 && ptasks.every(t => t.completed);
  }).length;
  const avgXP7d = useMemo(() => {
    const total = xpData.reduce((s, d) => s + d.xp, 0);
    const activeDays = xpData.filter(d => d.xp > 0).length;
    return activeDays > 0 ? Math.round(total / activeDays) : 0;
  }, [xpData]);
  const totalRoutineCompletions = routines.reduce((s, r) => s + r.streak, 0);

  // Best streak from history
  const bestStreak = useMemo(() => {
    return Math.max(stats.streak, ...Object.values(streakHistory), 0);
  }, [streakHistory, stats.streak]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 80 }]}
      >
        {/* Header */}
        <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
          <View>
            <Text style={styles.title}>Statistiques</Text>
            <Text style={styles.subtitle}>Votre progression</Text>
          </View>
          <View style={styles.levelPill}>
            <MaterialIcons name="emoji-events" size={16} color={Colors.xpYellow} />
            <Text style={styles.levelText}>Niv. {stats.level}</Text>
          </View>
        </Animated.View>

        {/* Summary cards grid */}
        <View style={styles.cardsRow}>
          <StatCard
            index={0}
            icon="check-circle"
            label="Tâches terminées"
            value={completedTasks}
            color={Colors.primary}
          />
          <StatCard
            index={1}
            icon="folder-special"
            label="Projets terminés"
            value={completedProjects}
            color={Colors.orange}
          />
        </View>
        <View style={styles.cardsRow}>
          <StatCard
            index={2}
            icon="star"
            label="XP Total"
            value={stats.totalXP}
            color={Colors.xpYellow}
            sub={`Moy. ${avgXP7d} XP/jour actif`}
          />
          <StatCard
            index={3}
            icon="local-fire-department"
            label="Meilleur streak"
            value={bestStreak}
            color={Colors.streakOrange}
            sub={`Actuel : ${stats.streak} 🔥`}
          />
        </View>
        <View style={styles.cardsRow}>
          <StatCard
            index={4}
            icon="loop"
            label="Complétions routines"
            value={totalRoutineCompletions}
            color={Colors.purple}
          />
          <StatCard
            index={5}
            icon="trending-up"
            label="Niveau actuel"
            value={stats.level}
            color={Colors.teal}
            sub={`${stats.totalXP} / ${stats.level * 300} XP`}
          />
        </View>

        {/* XP Bar Chart */}
        <SectionHeader title="XP — 7 derniers jours" subtitle={`Total : ${xpData.reduce((s, d) => s + d.xp, 0)} XP`} />
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.chartCard}>
          <View style={styles.barChart}>
            {xpData.map((d, i) => (
              <XPBar
                key={d.date}
                value={d.xp}
                maxValue={maxXP}
                label={getDayLabel(d.date)}
                index={i}
                isToday={d.date === today}
              />
            ))}
          </View>
          <View style={styles.chartFooter}>
            <View style={styles.legendDot} />
            <Text style={styles.chartFooterText}>Aujourd'hui en vert foncé</Text>
          </View>
        </Animated.View>

        {/* Streak Sparkline */}
        <SectionHeader title="Streak — 7 derniers jours" subtitle={`Max : ${bestStreak} 🔥`} />
        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.chartCard}>
          {streakData.some(d => d.streak > 0) ? (
            <>
              <StreakSparkline data={streakData} />
              <View style={styles.sparklineLabels}>
                {streakData.map(d => (
                  <Text key={d.date} style={styles.sparkLabel} numberOfLines={1}>
                    {getDayLabel(d.date)}
                  </Text>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.emptyChart}>
              <MaterialIcons name="local-fire-department" size={28} color={Colors.border} />
              <Text style={styles.emptyChartText}>Complétez des tâches pour voir votre streak</Text>
            </View>
          )}
        </Animated.View>

        {/* Routine Heatmap */}
        <SectionHeader title="Routines complétées" subtitle="12 semaines" />
        <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.chartCard}>
          <RoutineHeatmap data={dailyRoutines} />
          <View style={[styles.chartFooter, { marginTop: Spacing.sm }]}>
            <Text style={styles.chartFooterText}>
              {Object.values(dailyRoutines).reduce((s, v) => s + v, 0)} complétions au total
            </Text>
          </View>
        </Animated.View>

        {/* XP Level Progress */}
        <SectionHeader title="Progression de niveau" />
        <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.chartCard}>
          <View style={styles.levelRow}>
            <View style={styles.levelBadgeBox}>
              <Text style={styles.levelNum}>{stats.level}</Text>
            </View>
            <View style={styles.levelInfo}>
              <View style={styles.levelLabelRow}>
                <Text style={styles.levelLabel}>Niveau {stats.level}</Text>
                <Text style={styles.levelXPLabel}>
                  {stats.totalXP % 300} / 300 XP
                </Text>
              </View>
              <LevelBar progress={(stats.totalXP % 300) / 300} />
              <Text style={styles.levelNextLabel}>
                {300 - (stats.totalXP % 300)} XP jusqu'au niveau {stats.level + 1}
              </Text>
            </View>
          </View>

          {/* Milestones */}
          <View style={styles.milestones}>
            {[
              { level: 1, label: 'Débutant', icon: '🌱' },
              { level: 3, label: 'Apprenti', icon: '📚' },
              { level: 5, label: 'Expert', icon: '⚡' },
              { level: 8, label: 'Maître', icon: '🏆' },
              { level: 10, label: 'Légende', icon: '👑' },
            ].map(m => (
              <View key={m.level} style={[styles.milestone, stats.level >= m.level && styles.milestoneReached]}>
                <Text style={styles.milestoneIcon}>{m.icon}</Text>
                <Text style={[styles.milestoneLvl, stats.level >= m.level && styles.milestoneLvlReached]}>
                  Niv.{m.level}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── Level Bar ────────────────────────────────────────────────────────────────

function LevelBar({ progress }: { progress: number }) {
  const width = useSharedValue(0);
  useEffect(() => {
    width.value = withDelay(600, withTiming(Math.min(Math.max(progress, 0), 1), { duration: 800 }));
  }, [progress]);
  const animStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));
  return (
    <View style={lvlBarStyles.track}>
      <Animated.View style={[lvlBarStyles.fill, animStyle]} />
    </View>
  );
}

const lvlBarStyles = StyleSheet.create({
  track: {
    height: 10,
    backgroundColor: Colors.primaryLight,
    borderRadius: 5,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 5,
  },
});

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
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
  levelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.xpYellowLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radii.round,
  },
  levelText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: '#CC9900',
  },

  // Cards grid
  cardsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },

  // Charts
  chartCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    ...Shadow.soft,
    marginBottom: Spacing.sm,
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 160,
    gap: 4,
  },
  chartFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primaryDark,
  },
  chartFooterText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  sparklineLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sparkLabel: {
    fontSize: 10,
    color: Colors.textTertiary,
    textAlign: 'center',
    flex: 1,
  },
  emptyChart: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.sm,
  },
  emptyChartText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    textAlign: 'center',
  },

  // Level progress
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  levelBadgeBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  levelNum: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.extrabold,
    color: Colors.primaryDark,
  },
  levelInfo: {
    flex: 1,
    gap: 6,
  },
  levelLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  levelLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  levelXPLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  levelNextLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },

  // Milestones
  milestones: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  milestone: {
    alignItems: 'center',
    gap: 3,
    opacity: 0.35,
  },
  milestoneReached: {
    opacity: 1,
  },
  milestoneIcon: {
    fontSize: 22,
  },
  milestoneLvl: {
    fontSize: 10,
    color: Colors.textTertiary,
    fontWeight: FontWeight.semibold,
  },
  milestoneLvlReached: {
    color: Colors.primaryDark,
  },
});
