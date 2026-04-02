import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ListRenderItem,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Radii, Shadow, Spacing } from '../../constants/theme';
import { useApp } from '../../contexts/AppContext';
import { Project } from '../../types';
import { ProjectCard } from '../../components/feature/ProjectCard';
import { AddModal } from '../../components/ui/AddModal';
import { PressableScale } from '../../components/ui/PressableScale';
import { Image } from 'expo-image';

export default function ProjectsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { projects, deleteProject, addProject, getProjectProgress, getProjectTasks, tasks } = useApp();
  const [modalVisible, setModalVisible] = useState(false);

  const handleSave = async (data: any) => {
    await addProject({ ...data, id: `project-${Date.now()}`, taskIds: [] });
  };

  const renderProject: ListRenderItem<Project> = ({ item }) => {
    const progress = getProjectProgress(item.id);
    const ptasks = getProjectTasks(item.id);
    const completed = ptasks.filter(t => t.completed).length;
    return (
      <ProjectCard
        project={item}
        progress={progress}
        taskCount={ptasks.length}
        completedCount={completed}
        onPress={() => router.push(`/project/${item.id}`)}
        onDelete={() => deleteProject(item.id)}
      />
    );
  };

  // Summary stats
  const totalProjects = projects.length;
  const avgProgress = totalProjects > 0
    ? Math.round(projects.reduce((acc, p) => acc + getProjectProgress(p.id), 0) / totalProjects * 100)
    : 0;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Projets</Text>
          <Text style={styles.subtitle}>{totalProjects} projet{totalProjects !== 1 ? 's' : ''}</Text>
        </View>
        <PressableScale onPress={() => setModalVisible(true)} scaleTo={0.88} style={styles.addBtn}>
          <MaterialIcons name="add" size={26} color="#fff" />
        </PressableScale>
      </View>

      {/* Stats bar */}
      {totalProjects > 0 ? (
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalProjects}</Text>
            <Text style={styles.statLabel}>Actifs</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{avgProgress}%</Text>
            <Text style={styles.statLabel}>Progression moy.</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{tasks.filter(t => t.projectId).length}</Text>
            <Text style={styles.statLabel}>Tâches liées</Text>
          </View>
        </View>
      ) : null}

      {/* List */}
      <FlatList
        data={projects}
        keyExtractor={item => item.id}
        renderItem={renderProject}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Image
              source={require('../../assets/images/empty_state.png')}
              style={styles.emptyImg}
              contentFit="contain"
            />
            <Text style={styles.emptyTitle}>Aucun projet</Text>
            <Text style={styles.emptySubtitle}>Créez votre premier projet</Text>
          </View>
        }
      />

      <AddModal
        visible={modalVisible}
        type="project"
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
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
    backgroundColor: Colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    alignItems: 'center',
    ...Shadow.soft,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extrabold,
    color: Colors.text,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.border,
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
