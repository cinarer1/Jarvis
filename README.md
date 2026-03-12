# Jarvis TR — Sesli + Yazılı Yapay Zeka Asistanı

Bu proje, **Türkçe konuşabilen**, **sesten metne giriş** alabilen, **sesli yanıt verebilen** ve aynı zamanda yazışma arayüzü olan bir "Jarvis tarzı" asistan başlangıcıdır.

## Özellikler

- Türkçe metin tabanlı sohbet arayüzü
- Tarayıcı mikrofonu ile sesli komut (SpeechRecognition)
- Asistan cevabını Türkçe sesli okuma (SpeechSynthesis)
- FastAPI ile backend API
- OpenAI API anahtarı varsa gerçek model yanıtı
- API anahtarı yoksa yerel modda devam etme
- Telefon üzerinden erişim için `0.0.0.0` üzerinde çalıştırma

## Kurulum

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## OpenAI anahtarı (.env ile önerilen)

Proje kökünde `.env` dosyası oluştur:

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4.1-mini
```

> Uygulama `.env` dosyasını otomatik yükler.

Windows'ta `.env` dosyası kesinlikle **proje kökünde** olmalı (README'nin olduğu klasör).

## Çalıştırma

```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Ardından:
- Bilgisayar: `http://localhost:8000`
- Aynı Wi-Fi'deki telefon: `http://BILGISAYAR_IP:8000`

> Bilgisayar IP'si için: `ip a` veya `hostname -I`

## VS Code notu (Windows)

- VS Code terminalinde **proje kökünde** ol.
- `app` klasörünün içine girip `uvicorn app.main:app` çalıştırırsan `No module named 'app'` hatası alırsın.

Doğru örnek:

```powershell
cd C:\...\Jarvis
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Mikrofon çalışmıyorsa

- Chrome veya Edge kullan (SpeechRecognition desteği daha iyi).
- Mikrofon iznini tarayıcıdan aç.
- Uzak cihazdan (telefon vb.) erişiyorsan bazı tarayıcılar HTTPS ister.
- `localhost` üzerinde test genelde en sorunsuz yöntemdir.

## Sık görülen iki sorun

1. **"OpenAI bağlantısında sorun oldu"**
   - `.env` dosyasının proje kökünde olduğundan emin ol.
   - `OPENAI_API_KEY=sk-...` satırında tırnak kullanma.
   - Girdiğin model hesabında açık olmalı (`gpt-4.1-mini` yerine gerekirse `gpt-4o-mini` dene).
   - Uygulama açıldığında sohbet ekranında `OpenAI bağlı. Model: ...` mesajını görmelisin.

2. **Mikrofon çalışmıyor**
   - Tarayıcı izinlerinde mikrofonu `Allow/İzin ver` yap.
   - Telefonla IP üzerinden açıyorsan tarayıcı HTTPS isteyebilir; önce bilgisayarda `localhost` ile test et.
   - Uygulama artık hata durumunda ekranda nedenini yazar (izin, cihaz, ağ vb.).
