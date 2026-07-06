const GROQ_SPEECH_URL = 'https://api.groq.com/openai/v1/audio/speech';
const GROQ_MODEL = 'canopylabs/orpheus-v1-english';
const MAX_GROQ_TTS_CHARS = 200;
const ALLOWED_VOICES = new Set(['autumn', 'diana', 'hannah', 'austin', 'daniel', 'troy']);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== '/tts') {
      return json({ error: 'Use POST /tts with { "text": "..." }.' }, 404);
    }

    if (!env.GROQ_API_KEY) {
      return json({ error: 'GROQ_API_KEY is not configured on this worker.' }, 500);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Request body must be JSON.' }, 400);
    }

    const text = String(body.text || '').trim();
    if (!text) return json({ error: 'Missing text.' }, 400);
    if (text.length > MAX_GROQ_TTS_CHARS) {
      return json({ error: `Text is too long for one Groq speech chunk. Maximum is ${MAX_GROQ_TTS_CHARS} characters.` }, 400);
    }

    const voice = normalizeVoice(body.voice);

    const speechResponse = await fetch(GROQ_SPEECH_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        voice,
        input: text,
        response_format: 'wav'
      })
    });

    if (!speechResponse.ok) {
      const message = await speechResponse.text();
      return json({ error: 'Groq speech request failed.', detail: message }, speechResponse.status);
    }

    return new Response(speechResponse.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/wav',
        'Cache-Control': 'no-store'
      }
    });
  }
};

function normalizeVoice(input) {
  const value = String(input || '').toLowerCase();
  for (const voice of ALLOWED_VOICES) {
    if (value.includes(voice)) return voice;
  }
  if (/\b(male|david|mark|guy|george|ryan|oliver|arthur|alex|james|paul|thomas|will|matthew|eric|brian|sean|nathan)\b/i.test(value)) {
    return 'daniel';
  }
  return 'hannah';
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}
