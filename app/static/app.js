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
let speechRecognition = null;
let recognitionActive = false;

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

function parseErrorMessage(error) {
  if (!error) return 'Bilinmeyen hata';
  if (typeof error === 'string') return error;
  return error.message || String(error);
}

async function loadConfig() {
  try {
    const res = await fetch('/api/config');
    const data = await res.json();
    if (data.has_groq_key) {
      addMessage(`Groq bağlı. Chat: ${data.chat_model} | Transcribe: ${data.transcribe_model}`, 'bot');
      setStatus('Hazır. Groq aktif.');
    } else {
      addMessage('Groq anahtarı bulunamadı, yerel mod aktif.', 'bot');
      setStatus('Hazır. Groq anahtarı yok.');
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
    const failText = `Yanıt alınamadı: ${parseErrorMessage(error)}`;
    addMessage(failText, 'bot');
    speak(failText);
    setStatus(failText);
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

  let data = null;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Transkripsiyon JSON hatası (${res.status})`);
  }

  if (!res.ok || data.error) {
    throw new Error(data?.error || `Transkripsiyon hatası: ${res.status}`);
  }

  if (!data.text) {
    throw new Error('Ses metne çevrilemedi.');
  }

  return data.text;
}

async function startRecorderMode() {
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    throw new Error('Tarayıcı mikrofon kaydı desteklemiyor.');
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
      setStatus(`Duyuldu: ${text}`);
      await sendMessage(text);
    } catch (error) {
      const msg = `Mikrofon kaydı çözümlenemedi: ${parseErrorMessage(error)}`;
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

function setupSpeechRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;

  speechRecognition = new SR();
  speechRecognition.lang = 'tr-TR';
  speechRecognition.interimResults = false;
  speechRecognition.maxAlternatives = 1;

  speechRecognition.addEventListener('start', () => {
    recognitionActive = true;
    micBtn.textContent = '🎙️ Dinliyor...';
    setStatus('Dinleniyor...');
  });

  speechRecognition.addEventListener('result', async (event) => {
    const transcript = event.results[0][0].transcript;
    recognitionActive = false;
    micBtn.textContent = '🎙️ Konuş';
    setStatus(`Duyuldu: ${transcript}`);
    await sendMessage(transcript);
  });

  speechRecognition.addEventListener('error', async () => {
    recognitionActive = false;
    micBtn.textContent = '🎙️ Konuş';
    addMessage('SpeechRecognition başarısız oldu, kayıt moduna geçiyorum.', 'bot');
    await startRecorderMode();
  });

  speechRecognition.addEventListener('end', () => {
    recognitionActive = false;
    if (!isRecording) micBtn.textContent = '🎙️ Konuş';
  });
}

micBtn.addEventListener('click', async () => {
  try {
    if (isRecording && mediaRecorder) {
      mediaRecorder.stop();
      return;
    }

    if (speechRecognition && !recognitionActive) {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true }).then((s) => s.getTracks().forEach((t) => t.stop()));
        speechRecognition.start();
        return;
      } catch {
        // izin veya SR başarısızsa recorder moduna düş
      }
    }

    await startRecorderMode();
  } catch (error) {
    const msg = `Mikrofon açılamadı: ${parseErrorMessage(error)}`;
    addMessage(msg, 'bot');
    speak(msg);
    setStatus(msg);
  }
});

addMessage('Merhaba! Ben Jarvis TR.', 'bot');
addMessage('Mikrofona bas: önce hızlı konuşma denemesi, gerekirse otomatik kayıt moduna düşer.', 'bot');

loadConfig();
setupSpeechRecognition();
