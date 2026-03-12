const chat = document.getElementById('chat');
const form = document.getElementById('chatForm');
const input = document.getElementById('messageInput');
const micBtn = document.getElementById('micBtn');
const speakToggleBtn = document.getElementById('speakToggleBtn');
const statusEl = document.getElementById('status');

let speakEnabled = true;
let isRecording = false;
let mediaRecorder = null;
let chunks = [];

function addMessage(text, who) {
  const div = document.createElement('div');
  div.className = `msg ${who}`;
  div.textContent = text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function setStatus(text) {
  statusEl.textContent = text;
}

function speak(text) {
  if (!text || !speakEnabled || !('speechSynthesis' in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'tr-TR';
  utterance.rate = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

async function loadConfig() {
  try {
    const res = await fetch('/api/config');
    const data = await res.json();
    if (data.has_openai_key) {
      addMessage(`OpenAI bağlı. Model: ${data.model}`, 'bot');
      setStatus(`Hazır. OpenAI aktif (${data.model}).`);
    } else {
      addMessage('OpenAI anahtarı bulunamadı, yerel mod aktif.', 'bot');
      setStatus('Hazır. OpenAI anahtarı yok.');
    }
  } catch {
    setStatus('Hazır. Konfigürasyon okunamadı.');
  }
}

async function sendMessage(message) {
  addMessage(message, 'user');
  setStatus('Yanıt hazırlanıyor...');

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });

    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      const errMsg = data?.error || `API hata: ${res.status}`;
      throw new Error(errMsg);
    }

    addMessage(data.reply, 'bot');
    if (data.error) {
      addMessage(`Teknik detay: ${data.error}`, 'bot');
    }
    speak(data.reply);
    setStatus(`Hazır. Kaynak: ${data.source}`);
  } catch (error) {
    const failText = `Yanıt alınamadı: ${error.message}`;
    addMessage(failText, 'bot');
    speak(failText);
    setStatus(`Hata: ${error.message}`);
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const message = input.value.trim();
  if (!message) return;
  input.value = '';
  await sendMessage(message);
});

speakToggleBtn.addEventListener('click', () => {
  speakEnabled = !speakEnabled;
  speakToggleBtn.textContent = `🔊 Sesli Yanıt: ${speakEnabled ? 'Açık' : 'Kapalı'}`;
});

async function transcribeBlob(blob) {
  setStatus('Ses metne çevriliyor...');
  const formData = new FormData();
  formData.append('audio', blob, 'speech.webm');

  const res = await fetch('/api/transcribe', {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || `Transkripsiyon hatası: ${res.status}`);
  }

  if (!data.text) {
    throw new Error('Ses metne çevrilemedi.');
  }

  return data.text;
}

async function startRecordingFallback() {
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    throw new Error('Tarayıcı mikrofon kaydı desteklemiyor. Chrome/Edge deneyin.');
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  chunks = [];
  mediaRecorder = new MediaRecorder(stream);

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  mediaRecorder.onstop = async () => {
    stream.getTracks().forEach((track) => track.stop());
    try {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      const text = await transcribeBlob(blob);
      input.value = text;
      setStatus(`Duyuldu: ${text}`);
      await sendMessage(text);
    } catch (error) {
      const msg = `Mikrofon kaydı çözümlenemedi: ${error.message}`;
      addMessage(msg, 'bot');
      setStatus(msg);
    } finally {
      isRecording = false;
      micBtn.textContent = '🎙️ Konuş';
    }
  };

  mediaRecorder.start();
  isRecording = true;
  micBtn.textContent = '⏹️ Durdur';
  setStatus('Kayıt başladı... Bitince tekrar butona bas.');
}

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = 'tr-TR';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.addEventListener('result', async (event) => {
    const transcript = event.results[0][0].transcript;
    input.value = transcript;
    setStatus(`Duyuldu: ${transcript}`);
    await sendMessage(transcript);
  });

  recognition.addEventListener('error', async (event) => {
    const tips = {
      'not-allowed': 'Mikrofon izni reddedildi. Tarayıcı ayarlarından izin ver.',
      'service-not-allowed': 'Tarayıcı ses servisine izin vermiyor.',
      'no-speech': 'Ses algılanmadı, tekrar dene.',
      'audio-capture': 'Mikrofon cihazı bulunamadı.',
      'network': 'SpeechRecognition ağ hatası verdi. Kayıt moduna geçiliyor...',
    };

    setStatus(tips[event.error] || `Mikrofon hatası: ${event.error}`);

    if (event.error === 'network' || event.error === 'service-not-allowed') {
      try {
        await startRecordingFallback();
      } catch (error) {
        addMessage(`Kayıt modu açılamadı: ${error.message}`, 'bot');
      }
    }
  });

  recognition.addEventListener('end', () => {
    if (!isRecording && !statusEl.textContent.startsWith('Hazır.')) {
      setStatus('Hazır.');
    }
  });
}

micBtn.addEventListener('click', async () => {
  try {
    if (isRecording && mediaRecorder) {
      mediaRecorder.stop();
      return;
    }

    if (recognition) {
      setStatus('Dinleniyor...');
      recognition.start();
      return;
    }

    await startRecordingFallback();
  } catch (error) {
    const msg = `Mikrofon açılamadı: ${error.message}`;
    addMessage(msg, 'bot');
    setStatus(msg);
  }
});

addMessage('Merhaba! Ben Jarvis TR. Türkçe yazabilir veya konuşabilirsin.', 'bot');
if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
  addMessage('Not: Mikrofon çoğu tarayıcıda HTTPS ister. Telefondan bağlanıyorsan HTTPS gerekebilir.', 'bot');
}

loadConfig();
