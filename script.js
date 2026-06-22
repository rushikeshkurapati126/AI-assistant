/* ── State ──────────────────────────────────── */
let currentMode = "auto";
let history = [];          // [{role, content}, ...]
let isTyping = false;

const modeLabels = {
  auto:      "⚡ Auto Mode",
  factual:   "🔍 Factual Mode",
  summarize: "📄 Summarize Mode",
  creative:  "✦ Creative Mode",
  advice:    "💡 Advice Mode",
};

/* ── DOM refs ───────────────────────────────── */
const chatMessages   = document.getElementById("chatMessages");
const userInput      = document.getElementById("userInput");
const sendBtn        = document.getElementById("sendBtn");
const clearBtn       = document.getElementById("clearBtn");
const activeModeBadge = document.getElementById("activeModeBadge");

/* ── Mode switching ─────────────────────────── */
document.querySelectorAll(".mode-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentMode = btn.dataset.mode;
    activeModeBadge.textContent = modeLabels[currentMode];
  });
});

/* ── Suggestion chips ───────────────────────── */
document.querySelectorAll(".suggestion-chip").forEach(chip => {
  chip.addEventListener("click", () => {
    userInput.value = chip.dataset.text;
    autoResize();
    sendMessage();
  });
});

/* ── Textarea auto-resize ───────────────────── */
function autoResize() {
  userInput.style.height = "auto";
  userInput.style.height = Math.min(userInput.scrollHeight, 140) + "px";
}
userInput.addEventListener("input", autoResize);

/* ── Send on Enter (Shift+Enter = newline) ──── */
userInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});
sendBtn.addEventListener("click", sendMessage);

/* ── Clear chat ─────────────────────────────── */
clearBtn.addEventListener("click", () => {
  history = [];
  chatMessages.innerHTML = `
    <div class="welcome-block">
      <h1 class="welcome-title">What can I help with?</h1>
      <p class="welcome-sub">Ask me anything — factual questions, summaries, creative writing, or advice.</p>
      <div class="suggestions">
        <button class="suggestion-chip" data-text="What is the capital of France?">🌍 Capital of France?</button>
        <button class="suggestion-chip" data-text="Write a short poem about the ocean.">✦ Poem about the ocean</button>
        <button class="suggestion-chip" data-text="Give me tips for studying effectively.">💡 Study tips</button>
        <button class="suggestion-chip" data-text="Summarize: Artificial intelligence is transforming industries by automating tasks, improving decision-making, and enabling new capabilities that were previously impossible. From healthcare to finance, AI is reshaping how we work and live.">📄 Summarize a text</button>
      </div>
    </div>`;
  // Re-bind chips
  document.querySelectorAll(".suggestion-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      userInput.value = chip.dataset.text;
      autoResize();
      sendMessage();
    });
  });
});

/* ── Core send function ─────────────────────── */
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text || isTyping) return;

  // Remove welcome block if present
  const welcome = chatMessages.querySelector(".welcome-block");
  if (welcome) welcome.remove();

  appendMessage("user", text);
  history.push({ role: "user", content: text });

  userInput.value = "";
  userInput.style.height = "auto";
  sendBtn.disabled = true;
  isTyping = true;

  const typingId = showTyping();

  try {
    const res = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, mode: currentMode, history }),
    });

    const data = await res.json();
    removeTyping(typingId);

    if (data.error) {
      appendMessage("ai", "⚠️ Error: " + data.error);
    } else {
      appendMessage("ai", data.reply);
      history.push({ role: "assistant", content: data.reply });
    }
  } catch (err) {
    removeTyping(typingId);
    appendMessage("ai", "⚠️ Network error. Please try again.");
  }

  sendBtn.disabled = false;
  isTyping = false;
}

/* ── Render helpers ─────────────────────────── */
function appendMessage(role, content) {
  const msg = document.createElement("div");
  msg.className = `message ${role}`;

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = role === "user" ? "U" : "◈";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = content;

  msg.appendChild(avatar);
  msg.appendChild(bubble);
  chatMessages.appendChild(msg);
  scrollToBottom();
}

function showTyping() {
  const id = "typing-" + Date.now();
  const msg = document.createElement("div");
  msg.className = "message ai";
  msg.id = id;
  msg.innerHTML = `
    <div class="avatar">◈</div>
    <div class="bubble typing-dots">
      <span></span><span></span><span></span>
    </div>`;
  chatMessages.appendChild(msg);
  scrollToBottom();
  return id;
}

function removeTyping(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}
