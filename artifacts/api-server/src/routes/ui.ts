/**
 * Web UI served at the root of the API server.
 * Displays WhatsApp connection status and QR code for pairing.
 * Polls /api/bot/status every 3 s via JS — no full-page refresh needed.
 */
import { Router, type IRouter } from "express";

const router: IRouter = Router();

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FireboxTechs Bot — WhatsApp Setup</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --green: #25D366;
      --green-dim: #25D36620;
      --green-border: #25D36640;
      --orange: #FFA500;
      --red: #FF4444;
      --bg: #0d0d0d;
      --surface: #161616;
      --surface2: #1f1f1f;
      --border: #2a2a2a;
      --text: #f0f0f0;
      --muted: #888;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 20px;
      padding: 32px 16px;
    }

    .brand { display: flex; align-items: center; gap: 12px; }
    .brand .logo { font-size: 36px; line-height: 1; }
    .brand h1 { font-size: 22px; font-weight: 700; letter-spacing: -0.4px; }
    .brand .sub { color: var(--muted); font-size: 13px; margin-top: 2px; }

    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 32px;
      width: 100%;
      max-width: 400px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
    }

    /* Status badge */
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border-radius: 999px;
      padding: 7px 18px;
      font-size: 13px;
      font-weight: 600;
      transition: background 0.3s, border-color 0.3s, color 0.3s;
    }
    .badge.connected  { background: #25D36618; border: 1px solid #25D36650; color: var(--green); }
    .badge.waiting-qr { background: #FFA50018; border: 1px solid #FFA50050; color: var(--orange); }
    .badge.connecting { background: #ffffff10; border: 1px solid #ffffff20; color: var(--muted); }

    /* Spinner */
    .spinner {
      width: 18px; height: 18px;
      border: 2px solid currentColor;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      flex-shrink: 0;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* QR area */
    .qr-section { display: flex; flex-direction: column; align-items: center; gap: 12px; width: 100%; }

    .qr-frame {
      background: #fff;
      border-radius: 14px;
      padding: 14px;
      display: inline-block;
      position: relative;
      box-shadow: 0 0 0 1px rgba(0,0,0,.08);
    }
    .qr-frame img {
      display: block;
      width: 240px;
      height: 240px;
      border-radius: 4px;
    }
    .qr-frame .qr-overlay {
      position: absolute;
      inset: 0;
      border-radius: 14px;
      background: rgba(0,0,0,.55);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s;
      pointer-events: none;
    }
    .qr-frame.loading .qr-overlay { opacity: 1; }

    .hint { color: var(--muted); font-size: 13px; line-height: 1.6; max-width: 320px; }
    .hint strong { color: #bbb; }

    /* Pairing code */
    .pairing-box {
      background: #1a3028;
      border: 1px solid #25D36635;
      border-radius: 12px;
      padding: 16px 24px;
      width: 100%;
    }
    .pairing-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1.2px; color: var(--muted); margin-bottom: 6px; }
    .pairing-code  { font-size: 34px; font-weight: 700; color: var(--green); letter-spacing: 5px; font-family: 'Courier New', monospace; }

    /* Connected state */
    .connected-icon { font-size: 48px; line-height: 1; }
    .connected-title { font-size: 17px; font-weight: 600; }
    .connected-sub { color: var(--muted); font-size: 13px; }
    kbd {
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: 5px;
      padding: 2px 7px;
      font-family: monospace;
      font-size: 12px;
      color: var(--green);
    }

    /* Refresh button */
    .btn-refresh {
      background: var(--green-dim);
      border: 1px solid var(--green-border);
      color: var(--green);
      border-radius: 10px;
      padding: 10px 26px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      transition: background 0.2s;
    }
    .btn-refresh:hover { background: #25D36628; }

    /* Endpoints table */
    .endpoints {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 18px 20px;
      width: 100%;
      max-width: 400px;
    }
    .endpoints-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1.2px; color: #555; margin-bottom: 10px; }
    .ep { display: flex; align-items: baseline; gap: 8px; padding: 7px 0; border-bottom: 1px solid #1e1e1e; }
    .ep:last-child { border-bottom: none; }
    .ep .m { font-size: 10px; font-weight: 700; color: var(--green); font-family: monospace; min-width: 32px; }
    .ep .p { font-size: 12px; font-family: monospace; color: #bbb; }
    .ep .d { font-size: 11px; color: #555; margin-left: auto; }

    /* Poll indicator */
    .poll-dot {
      width: 6px; height: 6px;
      background: var(--green);
      border-radius: 50%;
      display: inline-block;
      margin-left: 6px;
      animation: pulse 2s ease-in-out infinite;
    }
    @keyframes pulse { 0%,100%{opacity:.3} 50%{opacity:1} }
  </style>
</head>
<body>

  <div class="brand">
    <div class="logo">🔥</div>
    <div>
      <h1>FireboxTechs Bot</h1>
      <div class="sub">WhatsApp AI Assistant<span class="poll-dot" title="Live status"></span></div>
    </div>
  </div>

  <div class="card" id="card">
    <div class="badge connecting" id="badge">
      <div class="spinner"></div>
      <span id="badge-text">Connecting…</span>
    </div>
    <div id="body-content"></div>
  </div>

  <button class="btn-refresh" id="refresh-btn" style="display:none" onclick="forceRefresh()">
    🔄 Refresh QR
  </button>

  <div class="endpoints">
    <div class="endpoints-title">API Endpoints</div>
    <div class="ep"><span class="m">GET</span><span class="p">/api/healthz</span><span class="d">Health check</span></div>
    <div class="ep"><span class="m">GET</span><span class="p">/api/bot/status</span><span class="d">Status (JSON)</span></div>
    <div class="ep"><span class="m">GET</span><span class="p">/api/bot/qr</span><span class="d">QR image</span></div>
    <div class="ep"><span class="m">POST</span><span class="p">/api/bot/restart</span><span class="d">Restart bot</span></div>
    <div class="ep"><span class="m">POST</span><span class="p">/api/bot/logout</span><span class="d">Log out</span></div>
  </div>

  <script>
    let lastState = null;
    let qrTimestamp = Date.now();
    let pollTimer = null;

    const badge      = document.getElementById('badge');
    const badgeText  = document.getElementById('badge-text');
    const bodyContent = document.getElementById('body-content');
    const refreshBtn = document.getElementById('refresh-btn');

    function render(status) {
      const { connected, qrCode, pairingCode } = status;
      const hasQr = !!qrCode;

      // --- Badge ---
      badge.className = 'badge ' + (connected ? 'connected' : hasQr ? 'waiting-qr' : 'connecting');
      if (connected) {
        badge.innerHTML = '<span>✅ Connected to WhatsApp</span>';
      } else if (hasQr) {
        badge.innerHTML = '<span>📱 Scan QR Code to connect</span>';
      } else if (pairingCode) {
        badge.innerHTML = '<span>🔢 Enter pairing code</span>';
      } else {
        badge.innerHTML = '<div class="spinner"></div><span id="badge-text">Waiting for QR…</span>';
      }

      // --- Body ---
      if (connected) {
        refreshBtn.style.display = 'none';
        bodyContent.innerHTML = \`
          <div class="connected-icon">🤖</div>
          <div class="connected-title">Bot is online!</div>
          <p class="connected-sub">Send <kbd>!help</kbd> to your bot number to see all commands.</p>
        \`;
      } else if (pairingCode) {
        refreshBtn.style.display = 'none';
        bodyContent.innerHTML = \`
          <div class="pairing-box">
            <div class="pairing-label">Pairing Code</div>
            <div class="pairing-code">\${pairingCode}</div>
          </div>
          <p class="hint">Go to <strong>WhatsApp → Settings → Linked Devices → Link with phone number</strong> and enter the code above.</p>
        \`;
      } else if (hasQr) {
        refreshBtn.style.display = '';
        bodyContent.innerHTML = \`
          <div class="qr-section">
            <div class="qr-frame" id="qr-frame">
              <img id="qr-img" src="/api/bot/qr?t=\${qrTimestamp}" alt="WhatsApp QR Code" />
              <div class="qr-overlay"><div class="spinner" style="width:36px;height:36px;border-width:3px;color:#fff"></div></div>
            </div>
            <p class="hint">Open <strong>WhatsApp → Settings → Linked Devices → Link a Device</strong> and scan the QR code above.</p>
          </div>
        \`;
      } else {
        refreshBtn.style.display = 'none';
        bodyContent.innerHTML = \`<p class="hint">⏳ Waiting for QR code from WhatsApp servers…</p>\`;
      }
    }

    function stateKey(s) {
      return \`\${s.connected}|\${!!s.qrCode}|\${s.pairingCode}\`;
    }

    async function poll() {
      try {
        const res = await fetch('/api/bot/status');
        if (!res.ok) return;
        const status = await res.json();
        const key = stateKey(status);

        if (key !== lastState) {
          // State changed — if QR is now available, bump timestamp for fresh image
          if (status.qrCode) qrTimestamp = Date.now();
          lastState = key;
          render(status);
        } else if (status.qrCode) {
          // QR still shown — silently refresh the image to catch rotations
          const img = document.getElementById('qr-img');
          if (img) {
            const frame = document.getElementById('qr-frame');
            frame && frame.classList.add('loading');
            const newTs = Date.now();
            const tmp = new Image();
            tmp.onload = () => {
              qrTimestamp = newTs;
              img.src = tmp.src;
              frame && frame.classList.remove('loading');
            };
            tmp.onerror = () => { frame && frame.classList.remove('loading'); };
            tmp.src = '/api/bot/qr?t=' + newTs;
          }
        }
      } catch (_) { /* server restarting — next tick will retry */ }
    }

    function forceRefresh() {
      qrTimestamp = Date.now();
      lastState = null; // force re-render
      poll();
    }

    // Initial render + start polling every 3 s
    poll();
    pollTimer = setInterval(poll, 3000);
  </script>
</body>
</html>`;

router.get("/", (_req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.setHeader("Cache-Control", "no-store");
  res.send(HTML);
});

export default router;
