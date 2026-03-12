# Jarvis TR — Sesli + Yazılı Yapay Zeka Asistanı

Bu proje, **Türkçe konuşabilen**, **sesten metne giriş** alabilen, **sesli yanıt verebilen** ve aynı zamanda yazışma arayüzü olan bir "Jarvis tarzı" asistan başlangıcıdır.

## Özellikler

- Türkçe metin tabanlı sohbet arayüzü
- Tarayıcı mikrofonu ile sesli komut
- SpeechRecognition çalışmazsa kayıt + OpenAI transcribe fallback
- Asistan cevabını Türkçe sesli okuma (SpeechSynthesis)
- FastAPI backend (`/api/config`, `/api/chat`, `/api/transcribe`)

## Kurulum

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## OpenAI anahtarı

Proje köküne `.env` dosyası oluştur:

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

## Çalıştırma

```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

- Bilgisayar: `http://localhost:8000`
- Telefon (aynı ağ): `http://BILGISAYAR_IP:8000`

## Sorun giderme

### "recognition has already started" hatası

- Bu sürümde mikrofon state yönetimi düzeltildi.
- Hızlıca art arda tıklasan bile aynı anda ikinci `recognition.start()` çağrısı yapılmaz.

### API 500 hatası

- Backend, yakalanmamış hataları `server-error` veya `openai-error` olarak JSON döndürür.
- Yine 500 alırsan büyük olasılıkla dependency eksiktir: `pip install -r requirements.txt`
- Özellikle `/api/transcribe` için `python-multipart` zorunludur.

### Mikrofon çalışmıyor

- Chrome/Edge kullan.
- Tarayıcı mikrofon izni açık olsun.
- IP ile bağlanıyorsan HTTPS gerekebilir.
- SpeechRecognition başarısızsa uygulama otomatik kayıt moduna geçer.

### Hata alınca sesli yanıt kesiliyor

- Bu sürümde hata mesajları da sesli okunur (sesli yanıt açıksa).
