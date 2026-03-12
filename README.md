# Jarvis TR — Groq Destekli Sesli + Yazılı Yapay Zeka Asistanı

## Kurulum

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## .env

```env
GROQ_API_KEY=gsk_...
GROQ_CHAT_MODEL=llama-3.1-8b-instant
GROQ_TRANSCRIBE_MODEL=whisper-large-v3-turbo
```

## Çalıştırma

```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Aç: `http://localhost:8000`

## Notlar

- Bu sürümde OpenAI kaldırıldı, doğrudan **Groq API** kullanılır.
- Chat endpoint: Groq `chat.completions`.
- Ses çözümleme: Groq `audio.transcriptions`.
- Mikrofon akışı: SpeechRecognition denenir, gerekirse MediaRecorder fallback.
- `304 Not Modified` logu hata değildir (cache bilgisidir).
