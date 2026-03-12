const chat = document.getElementById('chat');
const form = document.getElementById('chatForm');
const input = document.getElementById('messageInput');
const micBtn = document.getElementById('micBtn');
const speakToggleBtn = document.getElementById('speakToggleBtn');
const statusEl = document.getElementById('status');

let speakEnabled = true;

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
  if (!speakEnabled || !('speechSynthesis' in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'tr-TR';
  utterance.rate = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

async function loadConfig() {
  try {
    const res = await fetch('/api/config');
    if (!res.ok) throw new Error('config okunamadı');
    const data = await res.json();

    if (data.has_openai_key) {
      addMessage(`OpenAI bağlı. Model: ${data.model}`, 'bot');
      setStatus(`Hazır. OpenAI aktif (${data.model}).`);
    } else {
      addMessage('OpenAI anahtarı bulunamadı, yerel modda çalışıyorum.', 'bot');
      addMessage('İstersen proje köküne .env dosyası açıp OPENAI_API_KEY ekleyebilirsin.', 'bot');
      setStatus('Hazır. OpenAI anahtarı yok, yerel mod aktif.');
    }
  } catch {
    setStatus('Hazır. Konfigürasyon kontrol edilemedi.');
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

    if (!res.ok) {
      throw new Error(`API hata: ${res.status}`);
    }

    const data = await res.json();
    addMessage(data.reply, 'bot');
    speak(data.reply);
    setStatus(`Hazır. Kaynak: ${data.source}`);
  } catch (error) {
    addMessage('Bir hata oluştu. Lütfen tekrar dene.', 'bot');
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

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
  const recognition = new SpeechRecognition();
  recognition.lang = 'tr-TR';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  micBtn.addEventListener('click', () => {
    setStatus('Dinleniyor...');
    recognition.start();
  });

  recognition.addEventListener('result', async (event) => {
    const transcript = event.results[0][0].transcript;
    input.value = transcript;
    setStatus(`Duyuldu: ${transcript}`);
    await sendMessage(transcript);
  });

  recognition.addEventListener('error', (event) => {
    const tips = {
      'not-allowed': 'Mikrofon izni reddedildi. Tarayıcıdan mikrofon iznini açmalısın.',
      'service-not-allowed': 'Tarayıcı ses servisine izin vermiyor. Chrome kullanmayı dene.',
      'no-speech': 'Ses algılanmadı, tekrar dene.',
      'audio-capture': 'Mikrofon cihazı bulunamadı.',
    };
    setStatus(tips[event.error] || `Mikrofon hatası: ${event.error}`);
  });

  recognition.addEventListener('end', () => {
    if (!statusEl.textContent.startsWith('Hazır.')) {
      setStatus('Hazır.');
    }
  });
} else {
  micBtn.disabled = true;
  addMessage('Tarayıcın SpeechRecognition desteklemiyor. Chrome/Edge önerilir.', 'bot');
  setStatus('Bu tarayıcı sesli giriş desteklemiyor.');
}

addMessage('Merhaba! Ben Jarvis TR. Türkçe yazabilir veya konuşabilirsin.', 'bot');
if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
  addMessage('Not: Mikrofon çoğu tarayıcıda HTTPS ister. Uzaktan bağlanırken HTTPS gerekebilir.', 'bot');
}

loadConfig();
