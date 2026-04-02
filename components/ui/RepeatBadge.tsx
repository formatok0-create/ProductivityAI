import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RepeatType } from '../../types';
import { FontSize, Radii, Spacing } from '../../constants/theme';

const LABELS: Record<RepeatType, string> = {
  daily: '↻ Daily',
  weekly: '↻ Weekly',
  monthly: '↻ Monthly',
  none: '— Once',
};

const BG_COLORS: Record<RepeatType, string> = {
  daily: '#E3F6FF',
  weekly: '#F3E8FF',
  monthly: '#FFF0D6',
  none: '#F3F4F6',
};

const TEXT_COLORS: Record<RepeatType, string> = {
  daily: '#1CB0F6',
  weekly: '#CE82FF',
  monthly: '#FF9600',
  none: '#9CA3AF',
};

interface Props {
  repeat: RepeatType;
}

export function RepeatBadge({ repeat }: Props) {
  return (
    <View style={[styles.badge, { backgroundColor: BG_COLORS[repeat] }]}>
      <Text style={[styles.text, { color: TEXT_COLORS[repeat] }]}>{LABELS[repeat]}</Text>
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
  },
});
