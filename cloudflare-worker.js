const OPENAI_SPEECH_URL = 'https://api.openai.com/v1/audio/speech';
const ALLOWED_VOICES = new Set([
  'alloy',
  'ash',
  'ballad',
  'coral',
  'echo',
  'fable',
  'marin',
  'nova',
  'onyx',
  'sage',
  'shimmer',
  'verse',
  'cedar'
]);

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

    if (!env.OPENAI_API_KEY) {
      return json({ error: 'OPENAI_API_KEY is not configured on this worker.' }, 500);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Request body must be JSON.' }, 400);
    }

    const text = String(body.text || '').trim();
    if (!text) return json({ error: 'Missing text.' }, 400);
    if (text.length > 1200) return json({ error: 'Text is too long for one speech chunk.' }, 400);

    const voice = normalizeVoice(body.voice);
    const speed = clampSpeed(Number(body.rate || 1));

    const speechResponse = await fetch(OPENAI_SPEECH_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini-tts',
        voice,
        input: text,
        speed,
        response_format: 'mp3',
        instructions: 'Read clearly in a calm audiobook style.'
      })
    });

    if (!speechResponse.ok) {
      const message = await speechResponse.text();
      return json({ error: 'OpenAI speech request failed.', detail: message }, speechResponse.status);
    }

    return new Response(speechResponse.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
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
  return 'marin';
}

function clampSpeed(value) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(2, Math.max(0.6, value));
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
