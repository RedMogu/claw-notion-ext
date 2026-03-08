let ws = null;
let pingInterval = null;
let reconnectTimeout = null;
let isEstablished = false;

// We need a way to keep track of connection parameters, usually from storage
let connectionConfig = {
    gatewayUrl: 'ws://100.93.80.61:18789',
    authToken: '',
    sessionKey: 'agent:main:chrome'
};

function connectWebSocket() {
    if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
    }
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
    }

    let wsUrl = connectionConfig.gatewayUrl;
    if (connectionConfig.authToken) {
        const separator = wsUrl.includes('?') ? '&' : '?';
        wsUrl += separator + 'token=' + connectionConfig.authToken;
    }

    try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('Background: WebSocket connected');
            isEstablished = false;

            // Send OpenClaw Connect Request - REMOVED operator.write scope
            ws.send(JSON.stringify({
                type: "req",
                id: "1",
                method: "connect",
                params: {
                    peer: {
                        id: "claw-universal-ext",
                        agent: "openclaw-control-ui",
                        version: "1.0.18"
                    },
                    scopes: [], // Removed operator.write, we only need to chat
                    auth: {
                        token: connectionConfig.authToken
                    }
                }
            }));

            // Start heartbeat
            pingInterval = setInterval(() => {
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: "req", id: "ping-" + Date.now(), method: "health" }));
                }
            }, 30000);
        };

        ws.onerror = (error) => {
            console.error('Background: WebSocket error', error);
        };

        ws.onclose = () => {
            console.log('Background: WebSocket closed. Reconnecting in 3s...');
            isEstablished = false;
            if (pingInterval) {
                clearInterval(pingInterval);
                pingInterval = null;
            }
            reconnectTimeout = setTimeout(connectWebSocket, 3000);
        };

        ws.onmessage = (event) => {
            // Forward messages from Gateway to all active tabs
            try {
                const parsed = JSON.parse(event.data);
                // We broadcast everything to content scripts to let them filter by sessionKey
                chrome.tabs.query({}, function(tabs) {
                    tabs.forEach(tab => {
                        chrome.tabs.sendMessage(tab.id, { type: 'GATEWAY_MESSAGE', data: parsed }).catch(() => {});
                    });
                });
                
                // If it's the handshake success, mark as established
                if (parsed.id === "1" && !parsed.error) {
                    isEstablished = true;
                    // Tell tabs we are ready
                    chrome.tabs.query({}, function(tabs) {
                        tabs.forEach(tab => {
                            chrome.tabs.sendMessage(tab.id, { type: 'CONNECTION_READY' }).catch(() => {});
                        });
                    });
                }
            } catch (e) {
                console.error("Background: message parse error", e);
            }
        };
    } catch (e) {
        console.error('Background: connection failed', e);
        reconnectTimeout = setTimeout(connectWebSocket, 3000);
    }
}

// Load config and connect initially
chrome.storage.local.get({ gatewayUrl: 'ws://100.93.80.61:18789', authToken: '', sessionKey: 'agent:main:chrome' }, (items) => {
    connectionConfig = items;
    connectWebSocket();
});

// Listen for config changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    let reconnectNeeded = false;
    for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
        if (key === 'gatewayUrl' || key === 'authToken') {
            connectionConfig[key] = newValue;
            reconnectNeeded = true;
        } else if (key === 'sessionKey') {
            connectionConfig[key] = newValue;
        }
    }
    if (reconnectNeeded) {
        if (ws) ws.close(); // will trigger reconnect with new config
    }
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'SEND_CHAT') {
        if (ws && ws.readyState === WebSocket.OPEN && isEstablished) {
            const payload = {
                jsonrpc: "2.0",
                method: "chat.send",
                params: {
                    message: request.message,
                    sessionKey: connectionConfig.sessionKey
                },
                id: Date.now()
            };
            ws.send(JSON.stringify(payload));
            sendResponse({ success: true });
        } else {
            sendResponse({ success: false, error: 'WebSocket not ready' });
        }
    } else if (request.type === 'GET_STATUS') {
        sendResponse({ connected: ws && ws.readyState === WebSocket.OPEN && isEstablished });
    }
    return true; // Keep message channel open for async
});
