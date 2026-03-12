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

## Önemli: `proxies` TypeError düzeltmesi

Eğer şu hata geliyorsa:

`TypeError: Client.__init__() got an unexpected keyword argument 'proxies'`

bu, `openai` ile `httpx` sürüm uyumsuzluğudur. Bu repo artık `httpx==0.27.2` pinli geliyor.

Mutlaka temiz kurulum yap:

```bash
# proje kökünde
rm -rf .venv
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Windows PowerShell:

```powershell
Remove-Item -Recurse -Force .venv
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Mikrofon notu

- Mikrofon butonu önce SpeechRecognition dener.
- O başarısız olursa otomatik kayıt (MediaRecorder) moduna geçer.
- Tarayıcı izinleri kapalıysa mikrofon çalışmaz.
