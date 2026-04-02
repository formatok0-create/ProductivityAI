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
import { Audio } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Radii, Shadow, Spacing } from '../../constants/theme';
import { PressableScale } from './PressableScale';
import { parseWithClaude, transcribeAudio } from '../../services/claude';
import { useAI } from '../../contexts/AIContext';
import { AIParseResult } from '../../types';

// ─── Waveform bars ───────────────────────────────────────────────────────────
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
  bar: { width: 5, borderRadius: 3, marginHorizontal: 2, alignSelf: 'center' },
});

// ─── Pulse ring ──────────────────────────────────────────────────────────────
function PulseRing({ active }: { active: boolean }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);
  useEffect(() => {
    if (active) {
      scale.value = withRepeat(
        withSequence(withTiming(1.7, { duration: 750 }), withTiming(1, { duration: 750 })),
        -1, false
      );
      opacity.value = withRepeat(
        withSequence(withTiming(0.35, { duration: 375 }), withTiming(0, { duration: 375 })),
        -1, false
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
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.danger,
  },
});

// ─── Native audio recorder hook ──────────────────────────────────────────────
function useAudioRecorder() {
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async () => {
    try {
      setError(null);
      // Request permission
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        setError('Permission microphone refusée — activez-la dans les paramètres');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsListening(true);
    } catch (e) {
      setError('Impossible de démarrer le microphone');
      setIsListening(false);
    }
  }, []);

  const stop = useCallback(async (): Promise<string | null> => {
    if (!recordingRef.current) return null;
    try {
      setIsListening(false);
      setIsTranscribing(true);
      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) {
        setIsTranscribing(false);
        return null;
      }

      // Transcribe via OnSpace AI
      const text = await transcribeAudio(uri);
      setIsTranscribing(false);
      return text;
    } catch {
      setIsTranscribing(false);
      setError('Erreur lors de la transcription');
      return null;
    }
  }, []);

  const cancel = useCallback(async () => {
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch { /* ignore */ }
      recordingRef.current = null;
    }
    setIsListening(false);
    setIsTranscribing(false);
  }, []);

  return { isListening, isTranscribing, error, start, stop, cancel };
}

// ─── Web Speech hook (browser only) ─────────────────────────────────────────
declare global {
  interface Window { SpeechRecognition: any; webkitSpeechRecognition: any; }
}

function useWebSpeech() {
  const recRef = useRef<any>(null);
  const [isListening, setIsListening] = useState(false);
  const isSupported = Platform.OS === 'web' && typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const start = useCallback((onResult: (t: string) => void) => {
    if (!isSupported) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = 'fr-FR';
    rec.interimResults = false;
    rec.continuous = false;
    recRef.current = rec;
    rec.onstart = () => setIsListening(true);
    rec.onresult = (e: any) => {
      const text = e.results[0]?.[0]?.transcript ?? '';
      if (text) onResult(text);
    };
    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);
    try { rec.start(); } catch { setIsListening(false); }
  }, [isSupported]);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setIsListening(false);
  }, []);

  return { isSupported, isListening, start, stop };
}

// ─── Main modal ──────────────────────────────────────────────────────────────
interface Props {
  visible: boolean;
  onClose: () => void;
  onResult: (result: AIParseResult) => void;
}

export function AIModal({ visible, onClose, onResult }: Props) {
  useAI();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Platform-specific hooks
  const native = useAudioRecorder();
  const web = useWebSpeech();

  const isListening = Platform.OS === 'web' ? web.isListening : native.isListening;
  const isTranscribing = Platform.OS !== 'web' && native.isTranscribing;
  const micError = Platform.OS !== 'web' ? native.error : null;

  useEffect(() => {
    if (!visible) {
      if (Platform.OS === 'web') web.stop();
      else native.cancel();
    }
  }, [visible]);

  const toggleMic = useCallback(async () => {
    if (Platform.OS === 'web') {
      if (web.isListening) {
        web.stop();
      } else {
        web.start((text) => setInput(text));
      }
      return;
    }

    // Native
    if (native.isListening) {
      const transcribed = await native.stop();
      if (transcribed) setInput(transcribed);
    } else {
      await native.start();
    }
  }, [native, web]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text) return;
    if (native.isListening) await native.cancel();
    setLoading(true);
    try {
      const result = await parseWithClaude(text);
      onResult(result);
      setInput('');
      onClose();
    } catch {
      Alert.alert('Erreur IA', 'Impossible de traiter la demande. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  }, [input, native, onResult, onClose]);

  const canSend = input.trim().length > 0 && !loading && !isListening && !isTranscribing;

  const micLabel = isTranscribing
    ? 'Transcription en cours...'
    : isListening
    ? 'En écoute... Tapez sur le micro pour arrêter'
    : 'Appuyez sur le micro et parlez';

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
            <View style={styles.micRingWrapper}>
              <PulseRing active={isListening} />
              <PressableScale
                onPress={toggleMic}
                scaleTo={0.88}
                style={[
                  styles.micBtn,
                  isListening && styles.micBtnActive,
                  isTranscribing && styles.micBtnTranscribing,
                ]}
                disabled={isTranscribing}
              >
                {isTranscribing ? (
                  <ActivityIndicator color="#fff" size="large" />
                ) : (
                  <MaterialIcons
                    name={isListening ? 'mic' : 'mic-none'}
                    size={34}
                    color="#fff"
                  />
                )}
              </PressableScale>
            </View>

            {isListening ? (
              <View style={styles.waveform}>
                {[0, 60, 120, 80, 40, 100, 30, 70, 110, 50].map((d, i) => (
                  <WaveBar key={i} delay={d} color={Colors.danger} />
                ))}
              </View>
            ) : (
              <Text style={styles.micHint}>{micLabel}</Text>
            )}

            {micError ? (
              <View style={styles.errorRow}>
                <MaterialIcons name="error-outline" size={15} color={Colors.danger} />
                <Text style={styles.errorText}>{micError}</Text>
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

          {/* Text input + send */}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              placeholder={isListening ? 'Transcription en cours...' : 'Ou tapez votre demande...'}
              placeholderTextColor={Colors.textTertiary}
              value={input}
              onChangeText={v => { if (!isListening) setInput(v); }}
              multiline
              maxLength={300}
              editable={!isListening && !isTranscribing}
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
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: Spacing.xl,
    paddingTop: Spacing.md,
    ...Shadow.strong,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center', marginBottom: Spacing.lg,
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: Spacing.lg,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  aiAvatarBox: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.teal,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  headerSubtitle: { fontSize: FontSize.sm, color: Colors.textSecondary },
  micSection: {
    alignItems: 'center', marginBottom: Spacing.lg,
    gap: Spacing.md, minHeight: 110,
  },
  micRingWrapper: {
    width: 72, height: 72,
    alignItems: 'center', justifyContent: 'center',
  },
  micBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.textSecondary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.25)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18, shadowRadius: 10, elevation: 8,
  },
  micBtnActive: { backgroundColor: Colors.danger },
  micBtnTranscribing: { backgroundColor: Colors.teal },
  waveform: {
    flexDirection: 'row', alignItems: 'center',
    height: 48, marginTop: 4,
  },
  micHint: {
    fontSize: FontSize.sm, color: Colors.textSecondary,
    textAlign: 'center', marginTop: 4, paddingHorizontal: Spacing.xl,
  },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  errorText: { fontSize: FontSize.xs, color: Colors.danger },
  examples: { marginBottom: Spacing.lg, gap: Spacing.sm },
  examplesTitle: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  examplesScroll: { gap: Spacing.sm, paddingRight: Spacing.md },
  exampleChip: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderRadius: Radii.round,
    borderWidth: 1, borderColor: Colors.primary + '40',
  },
  exampleText: { fontSize: FontSize.sm, color: Colors.primaryDark, fontWeight: FontWeight.medium },
  inputRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-end' },
  textInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: Radii.xl,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    fontSize: FontSize.md, color: Colors.text,
    borderWidth: 1.5, borderColor: Colors.border,
    maxHeight: 120, lineHeight: 22,
  },
  sendBtn: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...Shadow.green,
  },
  sendBtnDisabled: { backgroundColor: Colors.border, shadowOpacity: 0, elevation: 0 },
  hint: {
    fontSize: FontSize.xs, color: Colors.textTertiary,
    textAlign: 'center', marginTop: Spacing.md,
  },
});
