# Jarvis TR — Sesli + Yazılı Yapay Zeka Asistanı

## Kurulum

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## .env

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_TRANSCRIBE_MODEL=whisper-1
```

## Çalıştırma

```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Aç: `http://localhost:8000`

## Bu sürümde düzeltilenler

- Mikrofon butonu önce `SpeechRecognition` dener, başarısız olursa otomatik `MediaRecorder` kayıt moduna geçer.
- `recognition has already started` yarış durumuna karşı `recognitionActive` kontrolü eklendi.
- `/api/chat` dönüşleri tip güvenli normalize edilir (`TypeError` riskini düşürür).
- `/api/transcribe` hataları artık daha açıklayıcı döner (`ExceptionClass: message`).
- OpenAI chat için model fallback sırası: `.env` modeli → `gpt-4o-mini` → `gpt-3.5-turbo`.

## Notlar

- `304 Not Modified` hata değildir (cache logudur).
- Mikrofon için tarayıcı izinleri açık olmalı.
