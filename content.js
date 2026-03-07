(function() {
  if (document.getElementById('openclaw-console')) return;

  chrome.storage.local.get({ gatewayUrl: 'ws://100.93.80.61:18789', authToken: '' }, (items) => {
    let wsUrl = items.gatewayUrl;
    if (items.authToken) {
      const separator = wsUrl.includes('?') ? '&' : '?';
      wsUrl += separator + 'token=' + items.authToken;
    }

    let ws = null;
    let pingInterval = null;
    let reconnectTimeout = null;
    setTimeout(() => { isEstablished = true; }, 500);

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
    header.innerText = 'OpenClaw 控制台';
    header.style.padding = '8px 12px';
    header.style.backgroundColor = '#1e1e1e';
    header.style.borderTopLeftRadius = '8px';
    header.style.borderTopRightRadius = '8px';
    header.style.cursor = 'move';
    header.style.fontWeight = 'bold';
    header.style.fontSize = '14px';
    header.style.userSelect = 'none';

    // 用于显示历史对话的区域
    const historyDiv = document.createElement('div');
    historyDiv.style.flex = '1';
    historyDiv.style.padding = '8px';
    historyDiv.style.overflowY = 'auto';
    historyDiv.style.display = 'flex';
    historyDiv.style.flexDirection = 'column';
    historyDiv.style.gap = '8px';
    historyDiv.style.fontSize = '13px';
    historyDiv.style.fontFamily = 'monospace';

    const textarea = document.createElement('textarea');
    textarea.style.height = '60px';
    textarea.style.margin = '8px';
    textarea.style.backgroundColor = '#1e1e1e';
    textarea.style.color = '#00ff00';
    textarea.style.border = '1px solid #444';
    textarea.style.borderRadius = '4px';
    textarea.style.padding = '8px';
    textarea.style.resize = 'none';
    textarea.style.fontFamily = 'monospace';
    textarea.placeholder = '输入指令并按 Enter 发送...';

    // 封装附加消息的函数
    function appendMessage(msg, color = '#00ff00') {
      const msgEl = document.createElement('div');
      msgEl.style.color = color;
      msgEl.style.whiteSpace = 'pre-wrap';
      msgEl.style.wordBreak = 'break-all';
      msgEl.textContent = msg;
      historyDiv.appendChild(msgEl);
      historyDiv.scrollTop = historyDiv.scrollHeight;
    }

    // 动作2：监听 textarea 的回车键
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault(); // 阻止默认换行
        const text = textarea.value.trim();
        if (text) {
          appendMessage('You: ' + text, '#aaaaaa');
          if (ws && ws.readyState === WebSocket.OPEN) {
            const payload = {
                jsonrpc: "2.0",
                method: "chat.send",
                params: {
                    message: text,
                    sessionKey: "agent:main:notion"
                },
                id: Date.now()
            };
            console.log('%c[发送到 Gateway]', 'background: #222; color: #f39c12; font-size: 16px; font-weight: bold;', payload);
            ws.send(JSON.stringify(payload));
          } else {
            appendMessage('[System]: WebSocket 未连接', '#ff5555');
          }
          textarea.value = '';
        }
      }
    });

    function connectWebSocket() {
      if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }

      ws = new WebSocket(wsUrl);

      // 动作3：监听 WebSocket 接收到的消息
      ws.onmessage = (e) => {
        console.log('%c[Gateway 原始消息]', 'background: #222; color: #bada55; font-size: 16px; font-weight: bold;', e.data);
        
        try {
          const parsed = JSON.parse(e.data);
          if (parsed.type === "res" && parsed.id === "1" && parsed.payload?.protocol) {
            console.log("Gateway Handshake Accepted!", parsed.payload);
            isEstablished = true;
            appendMessage('[System]: Gateway 握手成功！', '#55ff55');
            return;
          }
          if (parsed.type === "event" && ["connect.challenge", "tick", "health", "presence"].includes(parsed.event)) return;
          if (parsed.type === "res" && typeof parsed.id === "string" && parsed.id.startsWith("ping-")) return;
        } catch(err) {}

        if (!isEstablished) return;

        appendMessage('Server: ' + e.data, '#00aa00');
      };

      ws.onopen = () => {
        isEstablished = false;
        appendMessage(`[System]: WebSocket 已连接 (${wsUrl})`, '#55aaff');
        
        // Send proper OpenClaw Connect Request
        ws.send(JSON.stringify({
          type: "req",
          id: "1",
          method: "connect",
          params: {
            minProtocol: 3,
            maxProtocol: 3,
            client: {
              id: "webchat-ui",
              version: "1.0",
              platform: "browser",
              mode: "ui"
            },
            auth: {
              token: items.authToken
            }
          }
        }));

        pingInterval = setInterval(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "req", id: "ping-" + Date.now(), method: "ping" }));
          }
        }, 30000);
      };

      ws.onerror = () => {
        appendMessage('[System]: WebSocket 发生错误', '#ff5555');
      };

      ws.onclose = () => {
        appendMessage('[System]: WebSocket 连接断开', '#ffaa00');
        if (pingInterval) {
          clearInterval(pingInterval);
          pingInterval = null;
        }
        // 重连机制
        appendMessage('[System]: 尝试在 3 秒后重连...', '#ffaa00');
        reconnectTimeout = setTimeout(() => {
          connectWebSocket();
        }, 3000);
      };
    }

    connectWebSocket();

    container.appendChild(header);
    container.appendChild(historyDiv);
    container.appendChild(textarea);
    document.body.appendChild(container);

    let isDragging = false;
    let offsetX, offsetY;

    header.addEventListener('mousedown', (e) => {
      isDragging = true;
      const rect = container.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      container.style.left = (e.clientX - offsetX) + 'px';
      container.style.top = (e.clientY - offsetY) + 'px';
      container.style.right = 'auto'; 
      container.style.bottom = 'auto';
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  });
})();
