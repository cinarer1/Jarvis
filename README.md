# Jarvis TR — Sesli + Yazılı Yapay Zeka Asistanı

Bu proje, Türkçe yazışma + sesli giriş/çıkış destekleyen bir asistan örneğidir.

## Kurulum

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## .env

Proje köküne `.env` oluştur:

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

## Önemli değişiklikler (stabilite için)

- Mikrofon akışı artık **tamamen kayıt modu (MediaRecorder)** ile çalışır.
  - `🎙️ Konuş` → kayıt başlar
  - `⏹️ Durdur` → kayıt biter, sunucu transcribe eder
- Böylece `SpeechRecognition` kaynaklı `recognition has already started` hatası tamamen devre dışı bırakıldı.
- Chat tarafında OpenAI cevabı tip güvenli normalize edilir; `TypeError` durumlarında kontrollü hata döner.

## Log notu

`304 Not Modified` bir hata değildir, tarayıcı cache bilgisidir.
