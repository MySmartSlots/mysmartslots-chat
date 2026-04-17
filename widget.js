/**
 * MySmartSlots AI Chat Widget
 * Drop this script tag on any client website:
 *   <script src="https://YOUR-RENDER-URL/widget.js" data-business="Acme Plumbing"></script>
 */
(function () {
  const script = document.currentScript;
  const businessName = script?.getAttribute("data-business") || "Us";
  const API_URL = script?.getAttribute("data-api") || "https://YOUR-RENDER-URL";

  // --- Styles ---
  const style = document.createElement("style");
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');

    #sms-chat-bubble {
      position: fixed; bottom: 24px; right: 24px; z-index: 9999;
      width: 56px; height: 56px; border-radius: 50%;
      background: #1a1a2e; box-shadow: 0 4px 20px rgba(0,0,0,0.25);
      cursor: pointer; border: none; display: flex; align-items: center; justify-content: center;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    #sms-chat-bubble:hover { transform: scale(1.08); box-shadow: 0 6px 28px rgba(0,0,0,0.32); }
    #sms-chat-bubble svg { width: 26px; height: 26px; }

    #sms-chat-window {
      position: fixed; bottom: 92px; right: 24px; z-index: 9998;
      width: 340px; max-height: 520px;
      background: #fff; border-radius: 18px;
      box-shadow: 0 12px 48px rgba(0,0,0,0.18);
      display: flex; flex-direction: column; overflow: hidden;
      font-family: 'DM Sans', sans-serif;
      transform: translateY(16px) scale(0.97); opacity: 0;
      pointer-events: none;
      transition: transform 0.25s cubic-bezier(.34,1.56,.64,1), opacity 0.2s ease;
    }
    #sms-chat-window.open {
      transform: translateY(0) scale(1); opacity: 1; pointer-events: all;
    }

    #sms-chat-header {
      background: #1a1a2e; color: #fff;
      padding: 14px 18px; display: flex; align-items: center; gap: 10px;
    }
    #sms-chat-header .avatar {
      width: 34px; height: 34px; border-radius: 50%;
      background: #e8f4ff; display: flex; align-items: center; justify-content: center;
      font-size: 16px; flex-shrink: 0;
    }
    #sms-chat-header .info { flex: 1; }
    #sms-chat-header .name { font-weight: 600; font-size: 14px; }
    #sms-chat-header .status { font-size: 11px; opacity: 0.7; margin-top: 1px; }
    #sms-chat-close {
      background: none; border: none; color: #fff; opacity: 0.6;
      cursor: pointer; font-size: 20px; line-height: 1; padding: 0;
    }
    #sms-chat-close:hover { opacity: 1; }

    #sms-chat-messages {
      flex: 1; overflow-y: auto; padding: 16px;
      display: flex; flex-direction: column; gap: 10px;
      background: #f7f8fc;
    }
    #sms-chat-messages::-webkit-scrollbar { width: 4px; }
    #sms-chat-messages::-webkit-scrollbar-thumb { background: #dde; border-radius: 4px; }

    .sms-msg {
      max-width: 82%; padding: 10px 14px; border-radius: 16px;
      font-size: 13.5px; line-height: 1.45; animation: msgIn 0.2s ease;
    }
    @keyframes msgIn { from { opacity:0; transform: translateY(6px); } to { opacity:1; transform: none; } }
    .sms-msg.bot {
      background: #fff; color: #1a1a2e;
      border-bottom-left-radius: 4px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      align-self: flex-start;
    }
    .sms-msg.user {
      background: #1a1a2e; color: #fff;
      border-bottom-right-radius: 4px;
      align-self: flex-end;
    }
    .sms-typing {
      display: flex; gap: 4px; align-items: center;
      background: #fff; padding: 10px 14px; border-radius: 16px;
      border-bottom-left-radius: 4px; align-self: flex-start;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
    }
    .sms-typing span {
      width: 7px; height: 7px; border-radius: 50%; background: #aab;
      animation: bounce 1.2s infinite ease-in-out;
    }
    .sms-typing span:nth-child(2) { animation-delay: 0.2s; }
    .sms-typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }

    #sms-chat-input-row {
      display: flex; gap: 8px; padding: 12px 14px;
      border-top: 1px solid #eef; background: #fff;
    }
    #sms-chat-input {
      flex: 1; border: 1.5px solid #e0e4f0; border-radius: 10px;
      padding: 9px 12px; font-size: 13.5px; font-family: inherit;
      outline: none; resize: none; max-height: 80px;
      transition: border-color 0.15s;
    }
    #sms-chat-input:focus { border-color: #1a1a2e; }
    #sms-chat-send {
      width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
      background: #1a1a2e; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.15s, transform 0.1s;
      align-self: flex-end;
    }
    #sms-chat-send:hover { background: #2d2d4e; }
    #sms-chat-send:active { transform: scale(0.94); }
    #sms-chat-send svg { width: 17px; height: 17px; }

    .sms-booking-card {
      background: #eefaf2; border: 1.5px solid #b2e8c8;
      border-radius: 12px; padding: 12px 14px; font-size: 13px;
      color: #1a4d30; align-self: stretch; margin-top: 4px;
    }
    .sms-booking-card strong { display: block; margin-bottom: 6px; font-size: 13.5px; }
  `;
  document.head.appendChild(style);

  // --- Bubble ---
  const bubble = document.createElement("button");
  bubble.id = "sms-chat-bubble";
  bubble.setAttribute("aria-label", "Open chat");
  bubble.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
  document.body.appendChild(bubble);

  // --- Window ---
  const win = document.createElement("div");
  win.id = "sms-chat-window";
  win.setAttribute("role", "dialog");
  win.setAttribute("aria-label", "Chat with us");
  win.innerHTML = `
    <div id="sms-chat-header">
      <div class="avatar">💬</div>
      <div class="info">
        <div class="name">${businessName}</div>
        <div class="status">AI Booking Assistant • Online</div>
      </div>
      <button id="sms-chat-close" aria-label="Close chat">×</button>
    </div>
    <div id="sms-chat-messages"></div>
    <div id="sms-chat-input-row">
      <textarea id="sms-chat-input" rows="1" placeholder="Ask a question or book an appointment…"></textarea>
      <button id="sms-chat-send" aria-label="Send">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
    </div>
  `;
  document.body.appendChild(win);

  const messagesEl = win.querySelector("#sms-chat-messages");
  const inputEl = win.querySelector("#sms-chat-input");
  const sendBtn = win.querySelector("#sms-chat-send");

  // Conversation history sent to API
  let history = [];

  // --- Helpers ---
  function addMessage(text, role) {
    const el = document.createElement("div");
    el.className = `sms-msg ${role}`;
    el.textContent = text;
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return el;
  }

  function showTyping() {
    const el = document.createElement("div");
    el.className = "sms-typing";
    el.innerHTML = "<span></span><span></span><span></span>";
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return el;
  }

  function showBookingCard(booking) {
    const card = document.createElement("div");
    card.className = "sms-booking-card";
    card.innerHTML = `<strong>✅ Booking Received!</strong>
      <div>Name: ${booking.name || "—"}</div>
      <div>Contact: ${booking.contact || "—"}</div>
      <div>Service: ${booking.service || "—"}</div>
      <div>Time: ${booking.datetime || "—"}</div>`;
    messagesEl.appendChild(card);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  async function sendMessage() {
    const text = inputEl.value.trim();
    if (!text) return;

    inputEl.value = "";
    inputEl.style.height = "auto";
    addMessage(text, "user");
    history.push({ role: "user", content: text });

    const typing = showTyping();
    sendBtn.disabled = true;

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      const data = await res.json();
      typing.remove();

      const reply = data.reply || data.error || "Sorry, something went wrong.";
      addMessage(reply, "bot");
      history.push({ role: "assistant", content: reply });

      if (data.booking) showBookingCard(data.booking);
    } catch {
      typing.remove();
      addMessage("Sorry, I couldn't connect right now. Please try again.", "bot");
    } finally {
      sendBtn.disabled = false;
      inputEl.focus();
    }
  }

  // --- Events ---
  bubble.addEventListener("click", () => {
    const isOpen = win.classList.toggle("open");
    if (isOpen && history.length === 0) {
      setTimeout(() => {
        addMessage(`Hi! 👋 I can answer questions or help you book an appointment with ${businessName}. What can I help you with?`, "bot");
      }, 300);
    }
    if (isOpen) inputEl.focus();
  });

  win.querySelector("#sms-chat-close").addEventListener("click", () => win.classList.remove("open"));

  sendBtn.addEventListener("click", sendMessage);

  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });

  // Auto-resize textarea
  inputEl.addEventListener("input", () => {
    inputEl.style.height = "auto";
    inputEl.style.height = Math.min(inputEl.scrollHeight, 80) + "px";
  });
})();
