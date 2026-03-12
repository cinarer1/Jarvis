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

### `304 Not Modified` logu

- Bu bir hata değildir. Tarayıcı `style.css`/`app.js` dosyalarını cache’den kullandığını söyler.

### `recognition has already started`

- Bu sürümde mikrofon state yönetimi düzeltildi.
- İkinci `recognition.start()` çağrısı engellenir.

### `server-error` / `TypeError`

- API yanıt metni tip güvenli şekilde normalize edilir.
- OpenAI bazı modellerde içerik tipini liste dönebilir; bu sürüm bunu metne çevirir.

### Mikrofon dinlemiyor

- Chrome/Edge kullan.
- Tarayıcı mikrofon iznini aç.
- Uygulama önce mikrofon iznini ister, sonra dinlemeyi başlatır.
- SpeechRecognition başarısızsa kayıt moduna geçer.

### Hata alınca sesli yanıt kesiliyor

- Hata mesajları da sesli okunur (sesli yanıt açıksa).
