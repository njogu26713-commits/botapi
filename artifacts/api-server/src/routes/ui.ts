/**
 * Simple HTML status page served at the root of the API.
 * Shows connection status and QR code for WhatsApp pairing.
 */
import { Router, type IRouter } from "express";
import { whatsappConnection } from "../bot/connection.js";

const router: IRouter = Router();

router.get("/", (_req, res) => {
  const connected = whatsappConnection.isReady;
  const hasQr = !!whatsappConnection.qrCode;
  const pairingCode = whatsappConnection.pairingCode;

  const statusColor = connected ? "#25D366" : hasQr ? "#FFA500" : "#FF4444";
  const statusText = connected
    ? "✅ Connected to WhatsApp"
    : hasQr
    ? "📱 Scan QR Code to connect"
    : "⏳ Connecting...";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FireboxTechs Bot</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0f0f0f;
      color: #fff;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 24px;
      padding: 24px;
    }
    .logo { font-size: 48px; }
    h1 { font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
    .subtitle { color: #999; font-size: 14px; }
    .card {
      background: #1a1a1a;
      border: 1px solid #2a2a2a;
      border-radius: 16px;
      padding: 32px;
      text-align: center;
      max-width: 420px;
      width: 100%;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: ${statusColor}20;
      border: 1px solid ${statusColor}60;
      color: ${statusColor};
      border-radius: 999px;
      padding: 8px 20px;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 24px;
    }
    .qr-wrap {
      background: #fff;
      border-radius: 12px;
      padding: 16px;
      display: inline-block;
      margin-bottom: 16px;
    }
    .qr-wrap img { display: block; width: 240px; height: 240px; }
    .hint { color: #888; font-size: 13px; line-height: 1.5; }
    .hint strong { color: #ccc; }
    .connected-msg { font-size: 18px; margin: 8px 0 4px; }
    .connected-sub { color: #888; font-size: 14px; }
    .pairing {
      background: #1e3a2e;
      border: 1px solid #25D36640;
      border-radius: 12px;
      padding: 16px 24px;
      margin-bottom: 16px;
    }
    .pairing-label { color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
    .pairing-code { font-size: 32px; font-weight: 700; color: #25D366; letter-spacing: 4px; margin-top: 6px; font-family: monospace; }
    .endpoints {
      background: #1a1a1a;
      border: 1px solid #2a2a2a;
      border-radius: 12px;
      padding: 20px;
      max-width: 420px;
      width: 100%;
      text-align: left;
    }
    .endpoints h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #666; margin-bottom: 12px; }
    .endpoint { display: flex; gap: 10px; padding: 8px 0; border-bottom: 1px solid #222; align-items: baseline; }
    .endpoint:last-child { border-bottom: none; }
    .method { font-size: 11px; font-weight: 700; color: #25D366; font-family: monospace; min-width: 36px; }
    .path { font-size: 13px; font-family: monospace; color: #ccc; }
    .desc { font-size: 12px; color: #666; margin-left: auto; }
    .refresh-btn {
      background: #25D36615;
      border: 1px solid #25D36640;
      color: #25D366;
      border-radius: 8px;
      padding: 10px 24px;
      font-size: 14px;
      cursor: pointer;
      font-family: inherit;
      font-weight: 600;
      transition: background 0.2s;
    }
    .refresh-btn:hover { background: #25D36625; }
  </style>
  ${!connected ? '<meta http-equiv="refresh" content="15">' : ""}
</head>
<body>
  <div class="logo">🔥</div>
  <h1>FireboxTechs Bot</h1>
  <p class="subtitle">WhatsApp AI Assistant</p>

  <div class="card">
    <div class="status-badge">${statusText}</div>

    ${
      connected
        ? `<div class="connected-msg">🤖 Bot is online</div>
           <p class="connected-sub">Send <strong>!help</strong> to your bot to see all commands.</p>`
        : pairingCode
        ? `<div class="pairing">
             <div class="pairing-label">Pairing Code</div>
             <div class="pairing-code">${pairingCode}</div>
           </div>
           <p class="hint">Go to <strong>WhatsApp → Settings → Linked Devices → Link with phone number</strong> and enter the code above.</p>`
        : hasQr
        ? `<div class="qr-wrap">
             <img src="/api/bot/qr?t=${Date.now()}" alt="WhatsApp QR Code" />
           </div>
           <p class="hint">Open <strong>WhatsApp → Settings → Linked Devices → Link a Device</strong> and scan the QR code above.</p>`
        : `<p class="hint">⏳ Waiting for QR code from WhatsApp servers...</p>`
    }
  </div>

  ${
    !connected
      ? `<button class="refresh-btn" onclick="location.reload()">🔄 Refresh</button>`
      : ""
  }

  <div class="endpoints">
    <h2>API Endpoints</h2>
    <div class="endpoint"><span class="method">GET</span><span class="path">/api/healthz</span><span class="desc">Health check</span></div>
    <div class="endpoint"><span class="method">GET</span><span class="path">/api/bot/status</span><span class="desc">Connection status (JSON)</span></div>
    <div class="endpoint"><span class="method">GET</span><span class="path">/api/bot/qr</span><span class="desc">QR code image</span></div>
    <div class="endpoint"><span class="method">POST</span><span class="path">/api/bot/restart</span><span class="desc">Restart connection</span></div>
    <div class="endpoint"><span class="method">POST</span><span class="path">/api/bot/logout</span><span class="desc">Log out &amp; clear session</span></div>
  </div>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html");
  res.send(html);
});

export default router;
