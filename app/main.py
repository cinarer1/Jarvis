import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from openai import OpenAI
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

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


SYSTEM_PROMPT = (
    "Sen Türkçe konuşan, yardımsever, kısa ve anlaşılır bir asistanın. "
    "Kullanıcıya pratik adımlarla yardımcı ol."
)


def local_fallback_reply(message: str) -> str:
    lower = message.lower()
    if "saat" in lower:
        return "Şu an tam saati göremiyorum ama istersen bilgisayarında saat komutu çalıştırmanı söyleyebilirim."
    if "hava" in lower:
        return "Canlı hava verisine bağlı değilim, ama bulunduğun şehri yazarsan nasıl kontrol edeceğini anlatırım."
    return (
        "OPENAI_API_KEY tanımlı değil gibi görünüyor. "
        "Yine de çalışıyorum ✅ Mesajını aldım: "
        f"{message}"
    )


@app.get("/")
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.post("/api/chat", response_model=ChatResponse)
def chat(body: ChatRequest) -> ChatResponse:
    api_key = os.getenv("OPENAI_API_KEY")
    model = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")

    if not api_key:
        return ChatResponse(reply=local_fallback_reply(body.message), source="local-fallback")

    client = OpenAI(api_key=api_key)
    response = client.responses.create(
        model=model,
        input=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": body.message},
        ],
    )

    text_reply = response.output_text.strip() or "Şu an yanıt üretemedim, tekrar dener misin?"
    return ChatResponse(reply=text_reply, source="openai")
