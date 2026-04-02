import { AIParseResult } from '../types';

// OnSpace AI — no API key needed, managed by the platform
const ONSPACE_AI_BASE_URL: string =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_ONSPACE_AI_BASE_URL) ?? '';
const ONSPACE_AI_API_KEY: string =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_ONSPACE_AI_API_KEY) ?? '';

const SYSTEM_PROMPT = `Tu es un assistant de productivité. Analyse le message de l'utilisateur et retourne UNIQUEMENT un JSON valide (sans markdown, sans explication) avec ce format exact:

Pour une tâche simple:
{"type":"task","title":"titre de la tâche","date":"YYYY-MM-DD","time":"HH:MM","repeat":"none"}

Pour une routine:
{"type":"routine","title":"titre de la routine","time":"HH:MM","repeat":"daily|weekly|monthly|none"}

Pour un projet complexe:
{"type":"project","title":"titre du projet","subtasks":["sous-tâche 1","sous-tâche 2","sous-tâche 3"]}

Règles:
- date doit être au format YYYY-MM-DD (ex: 2026-04-02)
- time doit être au format HH:MM (ex: 14:30)
- Si pas de date précisée, omets le champ date
- Si c'est complexe (plusieurs étapes), utilise type project avec subtasks
- Retourne UNIQUEMENT le JSON, rien d'autre`;

/**
 * Calls OnSpace AI (google/gemini-3-flash-preview) — no external API key required.
 * Credentials are injected automatically by the OnSpace platform via env vars.
 */
export async function parseWithClaude(userInput: string): Promise<AIParseResult> {
  if (!ONSPACE_AI_BASE_URL || !ONSPACE_AI_API_KEY) {
    console.warn('[OnSpace AI] Env vars not set. Falling back to mock.');
    return mockParseResult(userInput);
  }

  const response = await fetch(`${ONSPACE_AI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ONSPACE_AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userInput },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OnSpace AI error: ${response.status}`);
  }

  const data = await response.json();
  const text: string = data.choices?.[0]?.message?.content ?? '';

  try {
    return JSON.parse(text) as AIParseResult;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as AIParseResult;
    throw new Error('Could not parse AI response');
  }
}

// Mock for testing without API key
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
