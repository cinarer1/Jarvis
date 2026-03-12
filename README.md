# Jarvis TR — Sesli + Yazılı Yapay Zeka Asistanı

Bu proje, **Türkçe konuşabilen**, **sesten metne giriş** alabilen, **sesli yanıt verebilen** ve aynı zamanda yazışma arayüzü olan bir "Jarvis tarzı" asistan başlangıcıdır.

## Özellikler

- Türkçe metin tabanlı sohbet arayüzü
- Tarayıcı mikrofonu ile sesli komut
- SpeechRecognition hata verirse **kayıt + OpenAI transcribe fallback**
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

> `.env` dosyası otomatik yüklenir.

## Çalıştırma

```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

- Bilgisayar: `http://localhost:8000`
- Telefon (aynı ağ): `http://BILGISAYAR_IP:8000`

## Sorun giderme

### 1) API 500 hatası

- Artık backend çoğu durumda 500 yerine kontrollü JSON hata döner.
- Modelini `gpt-4o-mini` ile dene.
- `.env` dosyasının proje kökünde olduğuna emin ol.

### 2) Mikrofon çalışmıyor

- Chrome/Edge kullan.
- Tarayıcı mikrofon izni açık olsun.
- IP ile bağlanıyorsan HTTPS gerekebilir.
- SpeechRecognition başarısızsa uygulama otomatik olarak kayıt alıp `/api/transcribe` ile metne çevirir.

### 3) Hata alınca sesli yanıt kesiliyor

- Artık hata mesajları da sesli okunur (sesli yanıt açıksa).
