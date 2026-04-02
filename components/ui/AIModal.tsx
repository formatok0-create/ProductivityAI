import React, { useState, useCallback, useEffect, useRef } from 'react';
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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  cancelAnimation,
} from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Radii, Shadow, Spacing } from '../../constants/theme';
import { PressableScale } from './PressableScale';
import { parseWithClaude } from '../../services/claude';
import { useAI } from '../../contexts/AIContext';
import { AIParseResult } from '../../types';

// Conditionally import Voice to avoid crashes if not available
let Voice: any = null;
try {
  Voice = require('@react-native-voice/voice').default;
} catch {
  Voice = null;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onResult: (result: AIParseResult) => void;
}

// ─── Waveform bars ────────────────────────────────────────────────────────────
function WaveBar({ delay, color }: { delay: number; color: string }) {
  const height = useSharedValue(6);
  useEffect(() => {
    height.value = withRepeat(
      withSequence(
        withTiming(28 + Math.random() * 16, { duration: 250 + delay }),
        withTiming(6, { duration: 250 + delay })
      ),
      -1,
      false
    );
    return () => cancelAnimation(height);
  }, []);
  const style = useAnimatedStyle(() => ({
    height: height.value,
    backgroundColor: color,
  }));
  return <Animated.View style={[wave.bar, style]} />;
}

const wave = StyleSheet.create({
  bar: {
    width: 5,
    borderRadius: 3,
    marginHorizontal: 2,
    alignSelf: 'center',
  },
});

// ─── Pulse ring ───────────────────────────────────────────────────────────────
function PulseRing({ active }: { active: boolean }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);
  useEffect(() => {
    if (active) {
      scale.value = withRepeat(
        withSequence(withTiming(1.7, { duration: 750 }), withTiming(1, { duration: 750 })),
        -1,
        false
      );
      opacity.value = withRepeat(
        withSequence(withTiming(0.35, { duration: 375 }), withTiming(0, { duration: 375 })),
        -1,
        false
      );
    } else {
      cancelAnimation(scale);
      cancelAnimation(opacity);
      scale.value = withSpring(1);
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [active]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  return <Animated.View style={[pr.ring, style]} />;
}

const pr = StyleSheet.create({
  ring: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.danger,
  },
});

// ─── Main modal ───────────────────────────────────────────────────────────────
export function AIModal({ visible, onClose, onResult }: Props) {
  useAI();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [partialText, setPartialText] = useState('');
  const voiceAvailable = Voice !== null && Platform.OS !== 'web';

  // ─── Voice setup ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!voiceAvailable) return;

    Voice.onSpeechStart = () => {
      setIsListening(true);
      setVoiceError(null);
    };

    Voice.onSpeechEnd = () => {
      setIsListening(false);
    };

    Voice.onSpeechError = (e: any) => {
      setIsListening(false);
      const msg: string = e?.error?.message ?? '';
      // Ignore "no speech" errors silently
      if (!msg.includes('7') && !msg.includes('no-speech')) {
        setVoiceError('Parlez plus fort ou réessayez');
      }
    };

    Voice.onSpeechPartialResults = (e: any) => {
      const partial: string = e.value?.[0] ?? '';
      setPartialText(partial);
    };

    Voice.onSpeechResults = (e: any) => {
      const text: string = e.value?.[0] ?? '';
      if (text) {
        setInput(text);
        setPartialText('');
      }
      setIsListening(false);
    };

    return () => {
      if (Voice) {
        Voice.destroy().then(Voice.removeAllListeners).catch(() => {});
      }
    };
  }, [voiceAvailable]);

  // Stop listening when modal closes
  useEffect(() => {
    if (!visible && isListening && voiceAvailable) {
      Voice?.stop().catch(() => {});
      setIsListening(false);
    }
  }, [visible]);

  const startListening = useCallback(async () => {
    if (!voiceAvailable) {
      Alert.alert(
        'Reconnaissance vocale',
        'La reconnaissance vocale nest pas disponible sur cette plateforme. Utilisez la saisie texte.',
        [{ text: 'OK' }]
      );
      return;
    }
    try {
      setVoiceError(null);
      setPartialText('');
      setInput('');
      await Voice.start('fr-FR');
    } catch (e: any) {
      setVoiceError('Impossible de démarrer le micro. Vérifiez les permissions.');
      setIsListening(false);
    }
  }, [voiceAvailable]);

  const stopListening = useCallback(async () => {
    if (!voiceAvailable) return;
    try {
      await Voice.stop();
    } catch {
      setIsListening(false);
    }
  }, [voiceAvailable]);

  const toggleMic = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // ─── Send ──────────────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = (input || partialText).trim();
    if (!text) return;
    if (isListening) await stopListening();
    setLoading(true);
    try {
      const result = await parseWithClaude(text);
      onResult(result);
      setInput('');
      setPartialText('');
      onClose();
    } catch {
      Alert.alert('Erreur IA', 'Impossible de traiter la demande. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }, [input, partialText, isListening, stopListening, onResult, onClose]);

  const displayText = isListening ? partialText : input;
  const canSend = (input.trim() || partialText.trim()) && !loading;

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
              <View style={styles.aiAvatarBox}>
                <MaterialIcons name="auto-awesome" size={24} color="#fff" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Assistant IA</Text>
                <Text style={styles.headerSubtitle}>OnSpace AI · Gemini Flash</Text>
              </View>
            </View>
          </View>

          {/* Mic section */}
          <View style={styles.micSection}>
            {/* Pulse ring behind mic */}
            <View style={styles.micRingWrapper}>
              <PulseRing active={isListening} />
              <PressableScale
                onPress={toggleMic}
                scaleTo={0.88}
                style={[
                  styles.micBtn,
                  isListening && styles.micBtnActive,
                ]}
              >
                <MaterialIcons
                  name={isListening ? 'mic' : 'mic-none'}
                  size={34}
                  color="#fff"
                />
              </PressableScale>
            </View>

            {/* Waveform */}
            {isListening ? (
              <View style={styles.waveform}>
                {[0, 60, 120, 80, 40, 100, 30, 70, 110, 50].map((d, i) => (
                  <WaveBar key={i} delay={d} color={Colors.danger} />
                ))}
              </View>
            ) : (
              <Text style={styles.micHint}>
                {voiceAvailable
                  ? isListening
                    ? 'Parlez maintenant...'
                    : 'Appuyez sur le micro pour dicter'
                  : 'Saisie vocale non disponible sur web'}
              </Text>
            )}

            {/* Voice error */}
            {voiceError ? (
              <View style={styles.errorRow}>
                <MaterialIcons name="error-outline" size={15} color={Colors.danger} />
                <Text style={styles.errorText}>{voiceError}</Text>
              </View>
            ) : null}
          </View>

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

          {/* Text input */}
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.textInput, isListening && styles.textInputListening]}
              placeholder={isListening ? 'Transcription en cours...' : 'Ou tapez votre demande...'}
              placeholderTextColor={isListening ? Colors.danger + '80' : Colors.textTertiary}
              value={displayText}
              onChangeText={v => { if (!isListening) setInput(v); }}
              multiline
              maxLength={300}
              editable={!isListening}
            />
            <PressableScale
              onPress={handleSend}
              scaleTo={0.88}
              disabled={!canSend}
              style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <MaterialIcons name="send" size={22} color="#fff" />
              )}
            </PressableScale>
          </View>

          <Text style={styles.hint}>Propulsé par OnSpace AI</Text>
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
  aiAvatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
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
  // ── Mic section
  micSection: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
    gap: Spacing.md,
    minHeight: 110,
  },
  micRingWrapper: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 8,
  },
  micBtnActive: {
    backgroundColor: Colors.danger,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    marginTop: 4,
  },
  micHint: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  errorText: {
    fontSize: FontSize.xs,
    color: Colors.danger,
  },
  // ── Examples
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
  // ── Input row
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
  textInputListening: {
    borderColor: Colors.danger + '60',
    backgroundColor: Colors.danger + '08',
    color: Colors.danger,
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
