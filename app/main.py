import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from openai import OpenAI
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
ROOT_DIR = BASE_DIR.parent

load_dotenv(ROOT_DIR / ".env")

app = FastAPI(title="Jarvis TR")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str
    source: str
    error: str | None = None


class ConfigResponse(BaseModel):
    has_openai_key: bool
    model: str


class TranscribeResponse(BaseModel):
    text: str
    source: str
    error: str | None = None


SYSTEM_PROMPT = (
    "Sen Türkçe konuşan, yardımsever, kısa ve anlaşılır bir asistanın. "
    "Kullanıcıya pratik adımlarla yardımcı ol."
)


def _api_key() -> str:
    return os.getenv("OPENAI_API_KEY", "").strip()


def _model() -> str:
    return os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip() or "gpt-4o-mini"


def local_fallback_reply(message: str) -> str:
    lower = message.lower()
    if "saat" in lower:
        return "Şu an tam saati göremiyorum ama istersen bilgisayarında saat komutu çalıştırmanı söyleyebilirim."
    if "hava" in lower:
        return "Canlı hava verisine bağlı değilim, ama bulunduğun şehri yazarsan nasıl kontrol edeceğini anlatırım."
    return f"Şu an yerel moddayım. Mesajını aldım ✅ {message}"


@app.get("/")
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/config", response_model=ConfigResponse)
def config() -> ConfigResponse:
    return ConfigResponse(has_openai_key=bool(_api_key()), model=_model())


@app.post("/api/chat", response_model=ChatResponse)
def chat(body: ChatRequest) -> ChatResponse:
    api_key = _api_key()
    model = _model()

    if not api_key:
        return ChatResponse(reply=local_fallback_reply(body.message), source="local-fallback")

    client = OpenAI(api_key=api_key)
    try:
        response = client.responses.create(
            model=model,
            input=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": body.message},
            ],
        )
        text_reply = (response.output_text or "").strip() or "Şu an yanıt üretemedim, tekrar dener misin?"
        return ChatResponse(reply=text_reply, source=f"openai.responses:{model}")
    except Exception as responses_error:
        try:
            completion = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": body.message},
                ],
            )
            content = completion.choices[0].message.content or "Şu an yanıt üretemedim, tekrar dener misin?"
            return ChatResponse(reply=content, source=f"openai.chat:{model}")
        except Exception as chat_error:
            error_detail = f"responses={responses_error.__class__.__name__}, chat={chat_error.__class__.__name__}"
            return ChatResponse(
                reply="OpenAI bağlantısında sorun oldu. Model veya API anahtarını kontrol et.",
                source="openai-error",
                error=error_detail,
            )


@app.post("/api/transcribe", response_model=TranscribeResponse)
async def transcribe(audio: UploadFile = File(...)) -> TranscribeResponse:
    api_key = _api_key()
    if not api_key:
        return TranscribeResponse(
            text="",
            source="transcribe-local",
            error="OPENAI_API_KEY bulunamadı",
        )

    try:
        client = OpenAI(api_key=api_key)
        transcript = client.audio.transcriptions.create(
            model="gpt-4o-mini-transcribe",
            file=(audio.filename or "mic.webm", await audio.read(), audio.content_type or "audio/webm"),
        )
        text = (getattr(transcript, "text", "") or "").strip()
        if not text:
            return TranscribeResponse(text="", source="openai-transcribe", error="Boş transkript")
        return TranscribeResponse(text=text, source="openai-transcribe")
    except Exception as exc:
        return TranscribeResponse(text="", source="openai-transcribe-error", error=exc.__class__.__name__)
