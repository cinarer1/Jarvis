# Jarvis TR — Sesli + Yazılı Yapay Zeka Asistanı

Bu proje, **Türkçe konuşabilen**, **sesten metne giriş** alabilen, **sesli yanıt verebilen** ve aynı zamanda yazışma arayüzü olan bir "Jarvis tarzı" asistan başlangıcıdır.

## Özellikler

- Türkçe metin tabanlı sohbet arayüzü
- Tarayıcı mikrofonu ile sesli komut (SpeechRecognition)
- Asistan cevabını Türkçe sesli okuma (SpeechSynthesis)
- FastAPI ile backend API
- OpenAI API anahtarı varsa gerçek model yanıtı
- API anahtarı yoksa yerel demo yanıtı (offline fallback)
- Telefon üzerinden erişim için `0.0.0.0` üzerinde çalıştırma

## Kurulum

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Çalıştırma

```bash
export OPENAI_API_KEY="sk-..."   # Opsiyonel ama önerilir
export OPENAI_MODEL="gpt-4.1-mini" # Opsiyonel
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Ardından:
- Bilgisayar: `http://localhost:8000`
- Aynı Wi-Fi'deki telefon: `http://BILGISAYAR_IP:8000`

> Bilgisayar IP'si için: `ip a` veya `hostname -I`

## Dosya yapısı

- `app/main.py`: FastAPI backend, chat endpoint
- `app/static/index.html`: Uygulama arayüzü
- `app/static/style.css`: Stil
- `app/static/app.js`: Sesli + yazılı sohbet mantığı

## Notlar

- Tarayıcıların SpeechRecognition desteği farklı olabilir (Chrome tabanlı tarayıcılar daha uyumlu).
- Mikrofon izni verilmelidir.
- Üretim ortamı için HTTPS, kimlik doğrulama ve rate-limit ekleyin.
