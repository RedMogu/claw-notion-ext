# OpenClaw Claw - Any Webpage Extension

A Chrome/Brave extension that injects your [OpenClaw](https://openclaw.ai) Sovereign AI directly into your Any Webpage workspace.

It establishes a direct **WebSocket** connection to your remote OpenClaw Gateway (typically over Tailscale), allowing you to interact with your personal AI Butler directly from the Any Webpage interface without relying on cloud-based API syncing.

## 🚀 Features

- **Direct WebSocket Link**: Connects directly to your OpenClaw Gateway using standard JSON-RPC.
- **Session Isolation**: Defaults to an isolated session key (`agent:main:chrome`) so your workspace chats do not leak into your primary messenger (WhatsApp, Telegram, etc.).
- **Robust Keep-Alive**: Automatically maintains connection health with the Gateway via the `health` protocol, ensuring no connection drops.

## 🛠️ Installation & Setup (Developer Mode)

Since this extension communicates via private Tailscale networks, it is not distributed on the Chrome Web Store. You must install it manually.

### 1. Prerequisites
- [Tailscale](https://tailscale.com/) installed and connected.
- Your OpenClaw Gateway running and bound to a local/Tailscale IP (`gateway.bind: "lan"`).

### 2. Download
1. Go to the [Releases](https://github.com/RedMogu/claw-universal-ext/releases) page.
2. Download the latest `claw-universal-ext-vX.X.X.tar.gz`.
3. Extract the contents into a folder (e.g., `claw-universal-ext`).

### 3. Load into Browser
1. Open Chrome or Brave and go to `chrome://extensions/`.
2. Turn on **Developer mode** (toggle in the top right corner).
3. Click **Load unpacked**.
4. Select the `claw-universal-ext` folder you just extracted.

### 4. Configure Extension
1. Once installed, click the puzzle piece icon 🧩 in your browser toolbar and click the **OpenClaw** extension to open its Options page.
2. Set your **Gateway URL** (e.g., `ws://100.x.y.z:18789`).
3. Set your **Gateway Auth Token**.
4. Set your **Session Key** (default: `agent:main:notion`).
5. Click **Save**.
6. Refresh any open Any Webpage tabs. The extension will automatically connect to your AI!

## 🔄 Recent Updates
- **v1.0.17**: Changed WebSocket keep-alive RPC method to `health` to prevent backend validation errors.
- **v1.0.16**: Implemented `sessionKey: "agent:main:notion"` isolation.
- **v1.0.15**: Added client-side filtering to gracefully ignore `ping-*` responses from the Gateway without polluting the UI.

## 🐛 Troubleshooting & Known Gotchas (Developer Notes)
If you decide to fork or modify this extension, keep these OpenClaw Gateway specifics in mind:
1. **JSON-RPC Format**: All messages sent to the Gateway must follow the `{ type: "req", id: "...", method: "..." }` pattern. Sending raw events from the client will result in an `INVALID_REQUEST` error.
2. **Heartbeats**: The correct method for keeping the WebSocket alive is `health` (not `ping`). Also, remember to filter out the `health` responses (`type: "res"`) so they don't get accidentally rendered as incoming chat messages.
3. **Session Keys**: By default, Gateway events are broadcast. Always explicitly pass a unique `sessionKey` in your `chat.send` params, and **always filter** incoming events by that same `sessionKey` to prevent other clients' chat logs from leaking into Any Webpage.
