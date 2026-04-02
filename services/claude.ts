import { AIParseResult } from '../types';
import { CLAUDE_API_KEY } from '../contexts/AIContext';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

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
 * Calls Claude API using the key from the environment variable.
 * NEVER pass the key as a parameter from the UI — read it from the env.
 */
export async function parseWithClaude(userInput: string): Promise<AIParseResult> {
  const apiKey = CLAUDE_API_KEY;
  if (!apiKey) {
    console.warn('[Claude] No API key found. Falling back to mock. Set EXPO_PUBLIC_ANTHROPIC_API_KEY in .env');
    return mockParseResult(userInput);
  }

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userInput }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text ?? '';

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
