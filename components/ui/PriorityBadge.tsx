import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TaskPriority } from '../../types';
import { FontSize, Radii, Spacing } from '../../constants/theme';

const CONFIGS = {
  high: { bg: '#FFE5E5', color: '#FF4B4B', label: '● Haute' },
  medium: { bg: '#FFF3E0', color: '#FF9600', label: '● Moyenne' },
  low: { bg: '#E8F9D9', color: '#58CC02', label: '● Basse' },
};

interface Props {
  priority: TaskPriority;
}

export function PriorityBadge({ priority }: Props) {
  const config = CONFIGS[priority];
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radii.round,
  },
  text: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
