# OpenClaw Molt - Notion Web Hijack Extension

This Chrome Extension acts as a "Trojan Horse" to bring your personal Sovereign AI ([OpenClaw](https://openclaw.ai)) directly into the corporate environment by hijacking the `notion.so` frontend interface.

Instead of relying on the limited and slow Notion API, this extension injects an invisible WebSocket client and a custom, draggable UI console directly into the Notion DOM. It establishes a real-time, zero-latency link between the browser tab and your OpenClaw Gateway.

## 🚀 Features

- **Frontend Takeover**: Activates automatically when you visit `*.notion.so`.
- **Floating Console**: Injects a draggable, cyberpunk-styled UI (OpenClaw Console) into the bottom right corner of the page.
- **WebSocket Direct Link**: Connects directly to your remote Gateway via Tailscale or public IP.
- **Real-time Chat**: Send commands to your AI using `Enter` (use `Shift+Enter` for newlines). Gateway responses append instantly in the console.

## 🛠️ Installation & Setup (Tailscale Environment)

The extension is pre-configured to connect to the Gateway at `ws://100.93.80.61:18789`. You must be on the same Tailscale network to use this default setup.

### 1. Download the Code
Clone or download this repository to your local machine:
```bash
git clone https://github.com/RedMogu/molt-notion-ext.git
```

### 2. Load into Chrome
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Turn on **Developer mode** in the top right corner.
3. Click **Load unpacked** in the top left corner.
4. Select the `molt-notion-ext` folder you just downloaded.
5. Make sure the extension is toggled ON.

### 3. Usage
1. Make sure your computer is connected to Tailscale.
2. Open any page on `https://www.notion.so`.
3. Look at the bottom right corner of your screen—you will see the **OpenClaw 控制台** (Console).
4. Drag the console header to move it around.
5. Type your command in the text area and press `Enter` to send it to your Gateway.

## 🔧 Configuration (Changing the IP)
If your OpenClaw Gateway is hosted on a different IP or port, you need to modify the extension code before loading it:
1. Open `content.js` in a text editor.
2. Find the line: `const ws = new WebSocket('ws://100.93.80.61:18789');`
3. Replace the IP/Port with your own Gateway endpoint.
4. Go back to `chrome://extensions/` and click the **Reload** button on the Molt-Notion extension card to apply changes.
