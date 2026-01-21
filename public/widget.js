// AmarAI Chat Widget
// Embed: <script src="https://your-domain.com/widget.js" data-project-id="YOUR_PROJECT_ID"></script>

(function() {
  'use strict';

  // Config
  const script = document.currentScript;
  const projectId = script?.getAttribute('data-project-id');
  const position = script?.getAttribute('data-position') || 'bottom-right';
  const primaryColor = script?.getAttribute('data-color') || '#3B82F6';
  const greeting = script?.getAttribute('data-greeting') || 'Сайн байна уу! Танд хэрхэн туслах вэ?';
  const apiUrl = script?.src.replace('/widget.js', '') || '';

  if (!projectId) {
    console.error('AmarAI Widget: data-project-id is required');
    return;
  }

  // Generate session ID
  let sessionId = localStorage.getItem('amarai_session_' + projectId);
  if (!sessionId) {
    sessionId = 'web_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('amarai_session_' + projectId, sessionId);
  }

  // Styles
  const styles = `
    .amarai-widget-container {
      position: fixed;
      ${position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
      ${position.includes('top') ? 'top: 20px;' : 'bottom: 20px;'}
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .amarai-widget-button {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: ${primaryColor};
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .amarai-widget-button:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 20px rgba(0,0,0,0.2);
    }

    .amarai-widget-button svg {
      width: 28px;
      height: 28px;
      fill: white;
    }

    .amarai-chat-window {
      position: absolute;
      ${position.includes('right') ? 'right: 0;' : 'left: 0;'}
      ${position.includes('top') ? 'top: 70px;' : 'bottom: 70px;'}
      width: 360px;
      max-width: calc(100vw - 40px);
      height: 500px;
      max-height: calc(100vh - 100px);
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      display: none;
      flex-direction: column;
      overflow: hidden;
    }

    .amarai-chat-window.open {
      display: flex;
    }

    .amarai-chat-header {
      background: ${primaryColor};
      color: white;
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .amarai-chat-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(255,255,255,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }

    .amarai-chat-title {
      flex: 1;
    }

    .amarai-chat-title h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }

    .amarai-chat-title p {
      margin: 2px 0 0;
      font-size: 12px;
      opacity: 0.8;
    }

    .amarai-chat-close {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      padding: 4px;
      opacity: 0.8;
    }

    .amarai-chat-close:hover {
      opacity: 1;
    }

    .amarai-chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .amarai-message {
      max-width: 80%;
      padding: 10px 14px;
      border-radius: 16px;
      font-size: 14px;
      line-height: 1.4;
      word-wrap: break-word;
    }

    .amarai-message.user {
      align-self: flex-end;
      background: ${primaryColor};
      color: white;
      border-bottom-right-radius: 4px;
    }

    .amarai-message.assistant {
      align-self: flex-start;
      background: #f1f5f9;
      color: #1e293b;
      border-bottom-left-radius: 4px;
    }

    .amarai-message.typing {
      display: flex;
      gap: 4px;
      padding: 14px 18px;
    }

    .amarai-typing-dot {
      width: 8px;
      height: 8px;
      background: #94a3b8;
      border-radius: 50%;
      animation: typing 1.4s infinite ease-in-out both;
    }

    .amarai-typing-dot:nth-child(1) { animation-delay: -0.32s; }
    .amarai-typing-dot:nth-child(2) { animation-delay: -0.16s; }

    @keyframes typing {
      0%, 80%, 100% { transform: scale(0.6); opacity: 0.6; }
      40% { transform: scale(1); opacity: 1; }
    }

    .amarai-chat-input {
      border-top: 1px solid #e2e8f0;
      padding: 12px;
      display: flex;
      gap: 8px;
    }

    .amarai-chat-input input {
      flex: 1;
      padding: 10px 14px;
      border: 1px solid #e2e8f0;
      border-radius: 24px;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
    }

    .amarai-chat-input input:focus {
      border-color: ${primaryColor};
    }

    .amarai-chat-input button {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: ${primaryColor};
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.2s;
    }

    .amarai-chat-input button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .amarai-chat-input button svg {
      width: 18px;
      height: 18px;
      fill: white;
    }

    .amarai-image {
      max-width: 100%;
      border-radius: 8px;
      margin-top: 8px;
    }

    .amarai-powered {
      text-align: center;
      padding: 8px;
      font-size: 11px;
      color: #94a3b8;
      border-top: 1px solid #f1f5f9;
    }

    .amarai-powered a {
      color: ${primaryColor};
      text-decoration: none;
    }
  `;

  // Create widget
  function createWidget() {
    // Inject styles
    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);

    // Create container
    const container = document.createElement('div');
    container.className = 'amarai-widget-container';
    container.innerHTML = `
      <button class="amarai-widget-button" aria-label="Chat">
        <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/><path d="M7 9h10v2H7zm0-3h10v2H7z"/></svg>
      </button>
      <div class="amarai-chat-window">
        <div class="amarai-chat-header">
          <div class="amarai-chat-avatar">🤖</div>
          <div class="amarai-chat-title">
            <h3>AI Туслах</h3>
            <p>Онлайн</p>
          </div>
          <button class="amarai-chat-close" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
        </div>
        <div class="amarai-chat-messages">
          <div class="amarai-message assistant">${greeting}</div>
        </div>
        <div class="amarai-chat-input">
          <input type="text" placeholder="Мессеж бичих..." aria-label="Message">
          <button type="submit" aria-label="Send">
            <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </div>
        <div class="amarai-powered">
          Powered by <a href="https://amarai.mn" target="_blank">AmarAI</a>
        </div>
      </div>
    `;

    document.body.appendChild(container);

    // Elements
    const button = container.querySelector('.amarai-widget-button');
    const chatWindow = container.querySelector('.amarai-chat-window');
    const closeBtn = container.querySelector('.amarai-chat-close');
    const messagesContainer = container.querySelector('.amarai-chat-messages');
    const input = container.querySelector('.amarai-chat-input input');
    const sendBtn = container.querySelector('.amarai-chat-input button');

    let isOpen = false;
    let isSending = false;

    // Toggle chat
    function toggleChat() {
      isOpen = !isOpen;
      chatWindow.classList.toggle('open', isOpen);
      if (isOpen) {
        input.focus();
      }
    }

    button.addEventListener('click', toggleChat);
    closeBtn.addEventListener('click', toggleChat);

    // Send message
    async function sendMessage() {
      const text = input.value.trim();
      if (!text || isSending) return;

      // Add user message
      addMessage(text, 'user');
      input.value = '';
      isSending = true;
      sendBtn.disabled = true;

      // Show typing
      const typingEl = document.createElement('div');
      typingEl.className = 'amarai-message assistant typing';
      typingEl.innerHTML = '<div class="amarai-typing-dot"></div><div class="amarai-typing-dot"></div><div class="amarai-typing-dot"></div>';
      messagesContainer.appendChild(typingEl);
      scrollToBottom();

      try {
        const response = await fetch(apiUrl + '/api/widget/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: projectId,
            session_id: sessionId,
            message: text
          })
        });

        const data = await response.json();

        // Remove typing
        typingEl.remove();

        if (data.success) {
          addMessage(data.response, 'assistant', data.images);
        } else {
          addMessage('Уучлаарай, түр алдаа гарлаа.', 'assistant');
        }
      } catch (error) {
        typingEl.remove();
        addMessage('Уучлаарай, холболтын алдаа гарлаа.', 'assistant');
      }

      isSending = false;
      sendBtn.disabled = false;
      input.focus();
    }

    function addMessage(text, role, images) {
      const msgEl = document.createElement('div');
      msgEl.className = 'amarai-message ' + role;
      msgEl.textContent = text;

      if (images && images.length > 0) {
        images.forEach(imgUrl => {
          const img = document.createElement('img');
          img.src = imgUrl;
          img.className = 'amarai-image';
          img.alt = 'Product image';
          msgEl.appendChild(img);
        });
      }

      messagesContainer.appendChild(msgEl);
      scrollToBottom();
    }

    function scrollToBottom() {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Event listeners
    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createWidget);
  } else {
    createWidget();
  }
})();
