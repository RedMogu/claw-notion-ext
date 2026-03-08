(function() {
  if (document.getElementById('openclaw-console')) return;

  let sessionKeyCache = 'agent:main:chrome';
  chrome.storage.local.get({ sessionKey: 'agent:main:chrome' }, (items) => {
      sessionKeyCache = items.sessionKey;
  });

  chrome.storage.onChanged.addListener((changes) => {
      if (changes.sessionKey) {
          sessionKeyCache = changes.sessionKey.newValue;
      }
  });

  const container = document.createElement('div');
  container.id = 'openclaw-console';
  container.style.position = 'fixed';
  container.style.bottom = '20px';
  container.style.right = '20px';
  container.style.width = '350px';
  container.style.height = '400px';
  container.style.backgroundColor = '#2c2c2c';
  container.style.color = '#ffffff';
  container.style.border = '1px solid #555';
  container.style.borderRadius = '8px';
  container.style.boxShadow = '0 8px 24px rgba(0,0,0,0.5)';
  container.style.zIndex = '999999';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.fontFamily = 'sans-serif';

  const header = document.createElement('div');
  header.innerText = 'OpenClaw Universal';
  header.style.padding = '8px 12px';
  header.style.backgroundColor = '#1e1e1e';
  header.style.borderTopLeftRadius = '8px';
  header.style.borderTopRightRadius = '8px';
  header.style.cursor = 'move';
  header.style.fontWeight = 'bold';
  header.style.fontSize = '14px';
  header.style.userSelect = 'none';

  const historyDiv = document.createElement('div');
  historyDiv.style.flex = '1';
  historyDiv.style.padding = '8px';
  historyDiv.style.overflowY = 'auto';
  historyDiv.style.display = 'flex';
  historyDiv.style.flexDirection = 'column';
  historyDiv.style.gap = '8px';

  const inputArea = document.createElement('div');
  inputArea.style.padding = '8px';
  inputArea.style.backgroundColor = '#1e1e1e';
  inputArea.style.borderBottomLeftRadius = '8px';
  inputArea.style.borderBottomRightRadius = '8px';
  inputArea.style.display = 'flex';
  inputArea.style.gap = '8px';

  const textarea = document.createElement('textarea');
  textarea.style.flex = '1';
  textarea.style.height = '40px';
  textarea.style.resize = 'none';
  textarea.style.backgroundColor = '#333';
  textarea.style.color = '#fff';
  textarea.style.border = '1px solid #555';
  textarea.style.borderRadius = '4px';
  textarea.style.padding = '4px';
  textarea.style.outline = 'none';
  textarea.placeholder = 'Chat or summarize selected text...';

  const sendBtn = document.createElement('button');
  sendBtn.innerText = 'Send';
  sendBtn.style.backgroundColor = '#0a7f5a';
  sendBtn.style.color = '#fff';
  sendBtn.style.border = 'none';
  sendBtn.style.borderRadius = '4px';
  sendBtn.style.padding = '0 12px';
  sendBtn.style.cursor = 'pointer';

  inputArea.appendChild(textarea);
  inputArea.appendChild(sendBtn);
  container.appendChild(header);
  container.appendChild(historyDiv);
  container.appendChild(inputArea);
  document.body.appendChild(container);

  // Simple drag logic
  let isDragging = false;
  let offsetX = 0, offsetY = 0;
  header.addEventListener('mousedown', (e) => {
    isDragging = true;
    const rect = container.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
  });
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const x = e.clientX - offsetX;
    const y = e.clientY - offsetY;
    container.style.right = 'auto';
    container.style.bottom = 'auto';
    container.style.left = x + 'px';
    container.style.top = y + 'px';
  });
  document.addEventListener('mouseup', () => {
    isDragging = false;
  });

  function appendMessage(msg, color) {
    const msgEl = document.createElement('div');
    msgEl.style.backgroundColor = color || '#333';
    msgEl.style.padding = '6px 10px';
    msgEl.style.borderRadius = '6px';
    msgEl.style.fontSize = '13px';
    msgEl.style.lineHeight = '1.4';
    msgEl.style.whiteSpace = 'pre-wrap';
    msgEl.style.wordBreak = 'break-all';
    msgEl.textContent = msg;
    historyDiv.appendChild(msgEl);
    historyDiv.scrollTop = historyDiv.scrollHeight;
  }

  function handleSend() {
    const text = textarea.value.trim();
    const selectedDOMText = window.getSelection().toString().trim();
    const currentUrl = window.location.href;
    const currentTitle = document.title;
    let finalMessage = text;

    if (selectedDOMText && text) {
         finalMessage = `${text}\n\n[Context from ${currentTitle} (${currentUrl})]:\n"""\n${selectedDOMText}\n"""`;
    } else if (selectedDOMText && !text) {
         finalMessage = `Please explain or summarize this:\n\n[Context from ${currentTitle} (${currentUrl})]:\n"""\n${selectedDOMText}\n"""`;
    } else if (text && !selectedDOMText) {
         finalMessage = `${text}\n\n[User is currently viewing: ${currentTitle} (${currentUrl})]`;
    }

    if (finalMessage) {
      appendMessage('You: ' + finalMessage, '#aaaaaa');
      
      // Delegate sending to the background script
      chrome.runtime.sendMessage({ type: 'SEND_CHAT', message: finalMessage }, (response) => {
          if (response && !response.success) {
              appendMessage('[System]: ' + (response.error || 'Failed to send via background'), '#ff5555');
          }
      });
      textarea.value = '';
    }
  }

  sendBtn.addEventListener('click', handleSend);
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // Listen for messages FROM the background script
  chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === 'CONNECTION_READY') {
          appendMessage('[System]: WebSocket Connected', '#0a7f5a');
      } else if (msg.type === 'GATEWAY_MESSAGE') {
          const parsed = msg.data;
          const payload = parsed.payload || parsed.result || {};
          
          if (parsed.method === "chat.message" || parsed.event === "chat.message") {
              if (payload.sessionKey && payload.sessionKey !== sessionKeyCache) {
                  return;
              }
              const role = payload.message?.role || 'system';
              if (role === 'user') return;
              
              const content = payload.message?.content || payload.message?.text || '';
              if (!content) return;
              
              let speaker = "Cat Butler";
              if (payload.message?.identity?.name) {
                  speaker = payload.message.identity.name;
              }
              appendMessage(speaker + ': ' + content, '#005577');
          }
      }
  });

  // Initial status check
  chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
      if (response && response.connected) {
          appendMessage('[System]: WebSocket is ready', '#0a7f5a');
      } else {
          appendMessage('[System]: Connecting in background...', '#888');
      }
  });

})();