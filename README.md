# Audio Backread

Backread reads uploaded PDF, EPUB, DOCX, and TXT files in the browser.

## iPhone lock-screen audio

iOS can stop browser `speechSynthesis` when the screen locks. For lock-screen playback, Backread can use a small Cloudflare Worker to generate real WAV audio with Groq, then play it through the page's hidden `<audio>` element.

1. Deploy `cloudflare-worker.js` as a Cloudflare Worker.
2. Add a Worker secret named `GROQ_API_KEY`.
3. Copy the Worker endpoint ending in `/tts`.
4. Open Backread, expand **Background audio setup**, and paste the endpoint.
5. Tap Play. The app will use generated audio mode, which can continue from the iPhone lock screen like normal media.

Without the endpoint, the app falls back to browser speech so it still works as a static GitHub Pages app.

The worker uses Groq's Orpheus English TTS model, which currently accepts short text chunks and returns WAV audio.
