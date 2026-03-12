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

function speak(text) {
  if (!speakEnabled || !('speechSynthesis' in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'tr-TR';
  utterance.rate = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

async function sendMessage(message) {
  addMessage(message, 'user');
  statusEl.textContent = 'Yanıt hazırlanıyor...';

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
    statusEl.textContent = `Hazır. Kaynak: ${data.source}`;
  } catch (error) {
    addMessage('Bir hata oluştu. Lütfen tekrar dene.', 'bot');
    statusEl.textContent = `Hata: ${error.message}`;
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
    statusEl.textContent = 'Dinleniyor...';
    recognition.start();
  });

  recognition.addEventListener('result', async (event) => {
    const transcript = event.results[0][0].transcript;
    input.value = transcript;
    statusEl.textContent = `Duyuldu: ${transcript}`;
    await sendMessage(transcript);
  });

  recognition.addEventListener('error', (event) => {
    statusEl.textContent = `Mikrofon hatası: ${event.error}`;
  });

  recognition.addEventListener('end', () => {
    if (!statusEl.textContent.startsWith('Hazır.')) {
      statusEl.textContent = 'Hazır.';
    }
  });
} else {
  micBtn.disabled = true;
  statusEl.textContent = 'Bu tarayıcı sesli giriş desteklemiyor.';
}

addMessage('Merhaba! Ben Jarvis TR. Türkçe yazabilir veya konuşabilirsin.', 'bot');
