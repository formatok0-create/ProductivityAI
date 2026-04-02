import React, { useState, useCallback } from 'react';
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
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Radii, Shadow, Spacing } from '../../constants/theme';
import { PressableScale } from './PressableScale';
import { parseWithClaude, mockParseResult } from '../../services/claude';
import { useAI } from '../../contexts/AIContext';
import { AIParseResult } from '../../types';

interface Props {
  visible: boolean;
  onClose: () => void;
  onResult: (result: AIParseResult) => void;
}

export function AIModal({ visible, onClose, onResult }: Props) {
  const { apiKey, setApiKey } = useAI();
  const [input, setInput] = useState('');
  const [keyInput, setKeyInput] = useState(apiKey);
  const [loading, setLoading] = useState(false);
  const [showKeyField, setShowKeyField] = useState(false);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text) return;
    setLoading(true);
    try {
      let result: AIParseResult;
      if (apiKey) {
        result = await parseWithClaude(text, apiKey);
      } else {
        result = mockParseResult(text);
      }
      onResult(result);
      setInput('');
      onClose();
    } catch (err) {
      Alert.alert('Erreur IA', 'Impossible de traiter la demande. Vérifiez votre clé API.');
    } finally {
      setLoading(false);
    }
  }, [input, apiKey, onResult, onClose]);

  const saveKey = useCallback(() => {
    setApiKey(keyInput.trim());
    setShowKeyField(false);
  }, [keyInput, setApiKey]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />

        <View style={styles.sheet}>
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Image
                source={require('../../assets/images/mic_visual.png')}
                style={styles.aiAvatar}
                contentFit="cover"
              />
              <View>
                <Text style={styles.headerTitle}>Assistant IA</Text>
                <Text style={styles.headerSubtitle}>
                  {apiKey ? 'Claude API' : 'Mode démo'}
                </Text>
              </View>
            </View>
            <PressableScale onPress={() => setShowKeyField(v => !v)} scaleTo={0.9}>
              <View style={styles.keyBtn}>
                <MaterialIcons name="vpn-key" size={18} color={apiKey ? Colors.primary : Colors.textTertiary} />
              </View>
            </PressableScale>
          </View>

          {/* API Key field */}
          {showKeyField ? (
            <View style={styles.keySection}>
              <Text style={styles.keyLabel}>Clé API Anthropic</Text>
              <View style={styles.keyRow}>
                <TextInput
                  style={styles.keyInput}
                  placeholder="sk-ant-..."
                  placeholderTextColor={Colors.textTertiary}
                  value={keyInput}
                  onChangeText={setKeyInput}
                  secureTextEntry
                  autoCapitalize="none"
                />
                <PressableScale onPress={saveKey} scaleTo={0.9}>
                  <View style={styles.saveKeyBtn}>
                    <MaterialIcons name="check" size={20} color="#fff" />
                  </View>
                </PressableScale>
              </View>
            </View>
          ) : null}

          {/* Examples */}
          <View style={styles.examples}>
            <Text style={styles.examplesTitle}>Exemples :</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.examplesScroll}>
              {[
                'Rappel meeting demain 14h',
                'Méditer chaque matin',
                'Créer une app de productivité',
              ].map(ex => (
                <PressableScale key={ex} onPress={() => setInput(ex)} scaleTo={0.95}>
                  <View style={styles.exampleChip}>
                    <Text style={styles.exampleText}>{ex}</Text>
                  </View>
                </PressableScale>
              ))}
            </ScrollView>
          </View>

          {/* Input */}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              placeholder="Décrivez votre tâche, routine ou projet..."
              placeholderTextColor={Colors.textTertiary}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={300}
              autoFocus
            />
            <PressableScale
              onPress={handleSend}
              scaleTo={0.88}
              disabled={loading || !input.trim()}
              style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <MaterialIcons name="send" size={22} color="#fff" />
              )}
            </PressableScale>
          </View>

          <Text style={styles.hint}>
            {apiKey ? 'Propulsé par Claude (Anthropic)' : 'Entrez votre clé API pour activer Claude'}
          </Text>

          <View style={{ height: Platform.OS === 'ios' ? 24 : 8 }} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: Spacing.xl,
    paddingTop: Spacing.md,
    ...Shadow.strong,
  },
  handle: {
    width: 40,
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
    marginBottom: Spacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  aiAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  keyBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keySection: {
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  keyLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.semibold,
  },
  keyRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  keyInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.sm,
    color: Colors.text,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  saveKeyBtn: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  examples: {
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  examplesTitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  examplesScroll: {
    gap: Spacing.sm,
    paddingRight: Spacing.md,
  },
  exampleChip: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.round,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  exampleText: {
    fontSize: FontSize.sm,
    color: Colors.primaryDark,
    fontWeight: FontWeight.medium,
  },
  inputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: Radii.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    borderWidth: 1.5,
    borderColor: Colors.border,
    maxHeight: 120,
    lineHeight: 22,
  },
  sendBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.green,
  },
  sendBtnDisabled: {
    backgroundColor: Colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  hint: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
});
