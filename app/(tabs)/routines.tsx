import React, { useState } from 'react';
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
import { Routine } from '../../types';
import { RoutineCard } from '../../components/feature/RoutineCard';
import { AddModal } from '../../components/ui/AddModal';
import { EditRoutineModal } from '../../components/ui/EditRoutineModal';
import { PressableScale } from '../../components/ui/PressableScale';
import { Image } from 'expo-image';

export default function RoutinesScreen() {
  const insets = useSafeAreaInsets();
  const { routines, toggleRoutine, deleteRoutine, addRoutine, stats } = useApp();
  const [modalVisible, setModalVisible] = useState(false);
  const [editRoutine, setEditRoutine] = useState<Routine | null>(null);

  const completed = routines.filter(r => r.completed).length;
  const total = routines.length;

  const handleSave = async (data: any) => {
    await addRoutine({ ...data, id: `routine-${Date.now()}` });
  };

  const renderRoutine: ListRenderItem<Routine> = ({ item }) => (
    <RoutineCard
      routine={item}
      onToggle={() => toggleRoutine(item.id)}
      onDelete={() => deleteRoutine(item.id)}
      onLongPress={() => setEditRoutine(item)}
    />
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Routines</Text>
          <Text style={styles.subtitle}>{completed}/{total} complétées</Text>
        </View>
        <PressableScale onPress={() => setModalVisible(true)} scaleTo={0.88} style={styles.addBtn}>
          <MaterialIcons name="add" size={26} color="#fff" />
        </PressableScale>
      </View>

      {/* Streak card */}
      <View style={styles.streakCard}>
        <View style={styles.streakLeft}>
          <Text style={styles.streakEmoji}>🔥</Text>
          <View>
            <Text style={styles.streakValue}>{stats.streak} jours</Text>
            <Text style={styles.streakLabel}>Streak actuel</Text>
          </View>
        </View>
        <View style={styles.streakRight}>
          <Text style={styles.streakXP}>{stats.routinesCompleted} routines</Text>
          <Text style={styles.streakXPLabel}>complétées au total</Text>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={routines}
        keyExtractor={item => item.id}
        renderItem={renderRoutine}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Image
              source={require('../../assets/images/empty_state.png')}
              style={styles.emptyImg}
              contentFit="contain"
            />
            <Text style={styles.emptyTitle}>Aucune routine</Text>
            <Text style={styles.emptySubtitle}>Créez votre première routine</Text>
          </View>
        }
      />

      <AddModal
        visible={modalVisible}
        type="routine"
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
      />

      <EditRoutineModal
        visible={editRoutine !== null}
        routine={editRoutine}
        onClose={() => setEditRoutine(null)}
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
    backgroundColor: Colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.streakOrange,
    ...Shadow.soft,
  },
  streakLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  streakEmoji: {
    fontSize: 32,
  },
  streakValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extrabold,
    color: Colors.streakOrange,
  },
  streakLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  streakRight: {
    alignItems: 'flex-end',
  },
  streakXP: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  streakXPLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 120,
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
