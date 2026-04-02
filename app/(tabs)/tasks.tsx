import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ListRenderItem,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Radii, Shadow, Spacing } from '../../constants/theme';
import { useApp } from '../../contexts/AppContext';
import { Task } from '../../types';
import { TaskCard } from '../../components/feature/TaskCard';
import { AddModal } from '../../components/ui/AddModal';
import { EditTaskModal } from '../../components/ui/EditTaskModal';
import { PressableScale } from '../../components/ui/PressableScale';
import { Image } from 'expo-image';

const FILTERS = ['Toutes', 'Aujourd\'hui', 'Complétées'];

export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const { tasks, toggleTask, deleteTask, addTask, toggleTaskTimer } = useApp();
  const [filter, setFilter] = useState('Toutes');
  const [modalVisible, setModalVisible] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const filtered = useMemo(() => {
    if (filter === 'Aujourd\'hui') return tasks.filter(t => t.date === today);
    if (filter === 'Complétées') return tasks.filter(t => t.completed);
    return tasks;
  }, [tasks, filter, today]);

  const handleSave = async (data: any) => {
    await addTask({ ...data, id: `task-${Date.now()}` });
  };

  const renderTask: ListRenderItem<Task> = ({ item }) => (
    <TaskCard
      task={item}
      onToggle={() => toggleTask(item.id)}
      onDelete={() => deleteTask(item.id)}
      onLongPress={() => setEditTask(item)}
      onTimerToggle={() => toggleTaskTimer(item.id)}
    />
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Tâches</Text>
          <Text style={styles.subtitle}>{filtered.length} élément{filtered.length !== 1 ? 's' : ''}</Text>
        </View>
        <PressableScale
          onPress={() => setModalVisible(true)}
          scaleTo={0.88}
          style={styles.addBtn}
        >
          <MaterialIcons name="add" size={26} color="#fff" />
        </PressableScale>
      </View>

      {/* Filter chips */}
      <View style={styles.filters}>
        {FILTERS.map(f => (
          <PressableScale key={f} onPress={() => setFilter(f)} scaleTo={0.92}>
            <View style={[styles.chip, filter === f && styles.chipActive]}>
              <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>{f}</Text>
            </View>
          </PressableScale>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderTask}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Image
              source={require('../../assets/images/empty_state.png')}
              style={styles.emptyImg}
              contentFit="contain"
            />
            <Text style={styles.emptyTitle}>Aucune tâche</Text>
            <Text style={styles.emptySubtitle}>Appuyez sur + pour ajouter une tâche</Text>
          </View>
        }
      />

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
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  addBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.green,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.round,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: Colors.primaryDark,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 110,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: Spacing.md,
  },
  emptyImg: {
    width: 180,
    height: 135,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
});
