import { AIParseResult } from '../types';
import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';

// ─── Helper: call Edge Function with proper error handling ───────────────────
async function invokeAIParse(body: {
  type: 'text' | 'audio';
  input: string;
  mimeType?: string;
}): Promise<{ result: AIParseResult; transcription?: string }> {
  const { data, error } = await supabase.functions.invoke('ai-parse', { body });

  if (error) {
    let errorMessage = error.message;
    if (error instanceof FunctionsHttpError) {
      try {
        const statusCode = error.context?.status ?? 500;
        const textContent = await error.context?.text();
        errorMessage = `[Code: ${statusCode}] ${textContent || error.message}`;
      } catch {
        errorMessage = error.message;
      }
    }
    throw new Error(errorMessage);
  }

  return data as { result: AIParseResult; transcription?: string };
}

// ─── Parse text via OnSpace AI Edge Function ─────────────────────────────────
export async function parseWithClaude(userInput: string): Promise<AIParseResult> {
  try {
    const { result } = await invokeAIParse({ type: 'text', input: userInput });
    return result;
  } catch (e) {
    console.warn('[parseWithClaude] Edge Function failed, falling back to mock:', e);
    return mockParseResult(userInput);
  }
}

// ─── Transcribe audio via OnSpace AI Edge Function ───────────────────────────
export async function transcribeAudio(audioUri: string): Promise<string> {
  // Read audio as base64
  const base64 = await FileSystem.readAsStringAsync(audioUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const mimeType = audioUri.toLowerCase().endsWith('.m4a') ? 'audio/mp4' : 'audio/3gpp';

  const { transcription } = await invokeAIParse({
    type: 'audio',
    input: base64,
    mimeType,
  });

  return transcription ?? '';
}

// ─── Mock fallback ────────────────────────────────────────────────────────────
export function mockParseResult(input: string): AIParseResult {
  const lower = input.toLowerCase();

  if (lower.includes('projet') || lower.includes('lancer') || lower.includes('créer une app')) {
    return {
      type: 'project',
      title: input.split(' ').slice(0, 5).join(' '),
      subtasks: [
        'Phase de recherche et analyse',
        'Design et maquettes',
        'Développement',
        'Tests et validation',
        'Lancement',
      ],
    };
  }

  if (lower.includes('tous les jours') || lower.includes('chaque matin') || lower.includes('routine')) {
    return {
      type: 'routine',
      title: input,
      time: '08:00',
      repeat: 'daily',
    };
  }

  return {
    type: 'task',
    title: input,
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    repeat: 'none',
  };
}
