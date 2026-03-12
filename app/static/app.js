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

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error || `API hata: ${res.status}`);
    }

    addMessage(data.reply, 'bot');
    if (data.error) addMessage(`Teknik detay: ${data.error}`, 'bot');
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
  const formData = new FormData();
  formData.append('audio', blob, 'speech.webm');

  const res = await fetch('/api/transcribe', {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data?.error || `Transkripsiyon hatası: ${res.status}`);
  }
  if (!data.text) {
    throw new Error('Ses metne çevrilemedi.');
  }
  return data.text;
}

async function startRecording() {
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
      setStatus('Ses metne çevriliyor...');
      const blob = new Blob(chunks, { type: 'audio/webm' });
      const text = await transcribeBlob(blob);
      input.value = text;
      setStatus(`Duyuldu: ${text}`);
      await sendMessage(text);
    } catch (error) {
      const msg = `Mikrofon kaydı çözümlenemedi: ${error.message}`;
      addMessage(msg, 'bot');
      speak(msg);
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

micBtn.addEventListener('click', async () => {
  try {
    if (isRecording && mediaRecorder) {
      mediaRecorder.stop();
      return;
    }

    await startRecording();
  } catch (error) {
    const msg = `Mikrofon açılamadı: ${error.message}`;
    addMessage(msg, 'bot');
    speak(msg);
    setStatus(msg);
  }
});

addMessage('Merhaba! Ben Jarvis TR. Türkçe yazabilir veya konuşabilirsin.', 'bot');
addMessage('Mikrofon için kayıt modu kullanılıyor: Başlatmak için 🎙️ Konuş butonuna bas, bitince tekrar bas.', 'bot');
if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
  addMessage('Not: Mikrofon çoğu tarayıcıda HTTPS ister. Telefondan bağlanıyorsan HTTPS gerekebilir.', 'bot');
}

loadConfig();
