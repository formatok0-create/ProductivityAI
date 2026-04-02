import { corsHeaders } from '../_shared/cors.ts';

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

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('ONSPACE_AI_API_KEY');
    const baseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');

    if (!apiKey || !baseUrl) {
      return new Response(
        JSON.stringify({ error: 'OnSpace AI not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { type, input, mimeType } = body as {
      type: 'text' | 'audio';
      input: string;       // text string OR base64 audio
      mimeType?: string;   // e.g. 'audio/mp4'
    };

    let userText = input;

    // ── Step 1: if audio, transcribe first ──────────────────────────────────
    if (type === 'audio') {
      console.log('[ai-parse] Transcribing audio...');
      const transcribeRes = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Transcris exactement ce que la personne dit dans cet audio en français. Retourne uniquement la transcription, sans ponctuation supplémentaire.',
                },
                {
                  type: 'input_audio',
                  input_audio: {
                    data: input,
                    format: mimeType ?? 'audio/mp4',
                  },
                },
              ],
            },
          ],
        }),
      });

      if (!transcribeRes.ok) {
        const errText = await transcribeRes.text();
        console.error('[ai-parse] Transcription error:', errText);
        return new Response(
          JSON.stringify({ error: `Transcription failed: ${errText}` }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const transcribeData = await transcribeRes.json();
      userText = transcribeData.choices?.[0]?.message?.content ?? '';
      console.log('[ai-parse] Transcribed:', userText);
    }

    // ── Step 2: parse text into task/routine/project ─────────────────────────
    console.log('[ai-parse] Parsing text:', userText);
    const parseRes = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userText },
        ],
      }),
    });

    if (!parseRes.ok) {
      const errText = await parseRes.text();
      console.error('[ai-parse] Parse error:', errText);
      return new Response(
        JSON.stringify({ error: `Parse failed: ${errText}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const parseData = await parseRes.json();
    const rawText: string = parseData.choices?.[0]?.message?.content ?? '';
    console.log('[ai-parse] Raw AI response:', rawText);

    // Extract JSON from response
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('No JSON found in AI response');
      parsed = JSON.parse(match[0]);
    }

    return new Response(
      JSON.stringify({ result: parsed, transcription: type === 'audio' ? userText : undefined }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[ai-parse] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
