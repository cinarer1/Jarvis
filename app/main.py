import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from groq import Groq
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
    has_groq_key: bool
    chat_model: str
    transcribe_model: str


class TranscribeResponse(BaseModel):
    text: str
    source: str
    error: str | None = None


SYSTEM_PROMPT = (
    "Sen Türkçe konuşan, yardımsever, kısa ve anlaşılır bir asistanın. "
    "Kullanıcıya pratik adımlarla yardımcı ol."
)


def _api_key() -> str:
    return os.getenv("GROQ_API_KEY", "").strip()


def _chat_model() -> str:
    return os.getenv("GROQ_CHAT_MODEL", "llama-3.1-8b-instant").strip() or "llama-3.1-8b-instant"


def _transcribe_model() -> str:
    return os.getenv("GROQ_TRANSCRIBE_MODEL", "whisper-large-v3-turbo").strip() or "whisper-large-v3-turbo"


def _coerce_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        return " ".join(str(item) for item in value)
    return str(value)


def _safe_error(exc: Exception) -> str:
    cls = exc.__class__.__name__
    msg = str(exc).strip()
    if not msg:
        return cls
    msg = msg.replace("\n", " ")[:180]
    return f"{cls}: {msg}"


def _groq_client() -> tuple[Groq | None, str | None]:
    try:
        return Groq(api_key=_api_key()), None
    except Exception as exc:
        return None, _safe_error(exc)


def local_fallback_reply(message: str) -> str:
    return f"Şu an yerel moddayım. Mesajını aldım ✅ {message}"


@app.get("/")
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/config", response_model=ConfigResponse)
def config() -> ConfigResponse:
    return ConfigResponse(
        has_groq_key=bool(_api_key()),
        chat_model=_chat_model(),
        transcribe_model=_transcribe_model(),
    )


@app.post("/api/chat", response_model=ChatResponse)
def chat(body: ChatRequest) -> ChatResponse:
    try:
        if not _api_key():
            return ChatResponse(reply=local_fallback_reply(body.message), source="local-fallback")

        client, client_err = _groq_client()
        if not client:
            return ChatResponse(
                reply="Groq istemcisi başlatılamadı. Anahtarı kontrol et.",
                source="groq-client-error",
                error=client_err,
            )

        models_to_try = []
        primary = _chat_model()
        for candidate in (primary, "llama-3.1-8b-instant", "llama-3.3-70b-versatile"):
            if candidate and candidate not in models_to_try:
                models_to_try.append(candidate)

        last_error = "unknown"
        for model in models_to_try:
            try:
                completion = client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": body.message},
                    ],
                )
                content = _coerce_text(completion.choices[0].message.content).strip()
                if not content:
                    content = "Şu an yanıt üretemedim, tekrar dener misin?"
                return ChatResponse(reply=content, source=f"groq.chat:{model}")
            except Exception as exc:
                last_error = _safe_error(exc)

        return ChatResponse(
            reply="Groq bağlantısında sorun oldu. Model veya API anahtarını kontrol et.",
            source="groq-error",
            error=last_error,
        )
    except Exception as uncaught:
        return ChatResponse(
            reply="Sunucuda beklenmedik bir hata oluştu. Lütfen tekrar dene.",
            source="server-error",
            error=_safe_error(uncaught),
        )


@app.post("/api/transcribe", response_model=TranscribeResponse)
async def transcribe(audio: UploadFile = File(...)) -> TranscribeResponse:
    try:
        if not _api_key():
            return TranscribeResponse(text="", source="transcribe-local", error="GROQ_API_KEY bulunamadı")

        file_bytes = await audio.read()
        if not file_bytes:
            return TranscribeResponse(text="", source="groq-transcribe", error="Boş ses dosyası")

        client, client_err = _groq_client()
        if not client:
            return TranscribeResponse(text="", source="groq-client-error", error=client_err)

        transcript = client.audio.transcriptions.create(
            model=_transcribe_model(),
            file=(audio.filename or "mic.webm", file_bytes),
            language="tr",
            response_format="verbose_json",
        )
        text = _coerce_text(getattr(transcript, "text", "")).strip()
        if not text:
            return TranscribeResponse(text="", source="groq-transcribe", error="Boş transkript")
        return TranscribeResponse(text=text, source="groq-transcribe")
    except Exception as exc:
        return TranscribeResponse(text="", source="groq-transcribe-error", error=_safe_error(exc))
