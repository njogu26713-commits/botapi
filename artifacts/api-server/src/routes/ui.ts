/**
 * Admin dashboard served at GET /
 * - WhatsApp connection panel (QR / connected state)
 * - AI control panel (system prompt + quick reply buttons)
 */
import { Router, type IRouter } from "express";

const router: IRouter = Router();

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FireboxTechs — Bot Admin</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --green: #25D366;
      --green-dim: #25D36615;
      --green-border: #25D36640;
      --orange: #FFA500;
      --red: #FF4444;
      --blue: #3b82f6;
      --bg: #0c0c0e;
      --surface: #131316;
      --surface2: #1c1c20;
      --surface3: #242428;
      --border: #2a2a30;
      --text: #f0f0f0;
      --muted: #707078;
      --label: #9999a8;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 32px 16px 64px;
      gap: 20px;
    }

    /* ── Brand ─────────────────────────────────────────────── */
    .brand {
      display: flex; align-items: center; gap: 12px;
      width: 100%; max-width: 480px;
      padding-bottom: 4px;
    }
    .brand .logo { font-size: 32px; }
    .brand h1 { font-size: 20px; font-weight: 700; letter-spacing: -0.3px; }
    .brand .sub { color: var(--muted); font-size: 12px; margin-top: 2px; }
    .poll-dot {
      display: inline-block; width: 6px; height: 6px;
      background: var(--green); border-radius: 50%; margin-left: 6px;
      animation: pulse 2s ease-in-out infinite;
    }
    @keyframes pulse { 0%,100%{opacity:.25} 50%{opacity:1} }

    /* ── Card ──────────────────────────────────────────────── */
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 24px;
      width: 100%;
      max-width: 480px;
    }
    .card-title {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1.1px;
      color: var(--muted);
      margin-bottom: 16px;
    }

    /* ── Status badge ──────────────────────────────────────── */
    .badge {
      display: inline-flex; align-items: center; gap: 8px;
      border-radius: 999px; padding: 6px 16px;
      font-size: 13px; font-weight: 600;
      transition: all .3s;
    }
    .badge.connected  { background:#25D36612; border:1px solid #25D36640; color:var(--green); }
    .badge.waiting-qr { background:#FFA50012; border:1px solid #FFA50040; color:var(--orange); }
    .badge.connecting { background:#ffffff08; border:1px solid #ffffff18; color:var(--muted); }
    .spinner {
      width:16px; height:16px;
      border:2px solid currentColor; border-top-color:transparent;
      border-radius:50%;
      animation: spin .8s linear infinite; flex-shrink:0;
    }
    @keyframes spin { to { transform:rotate(360deg); } }

    /* ── QR ────────────────────────────────────────────────── */
    .qr-wrap {
      background:#fff; border-radius:12px; padding:12px;
      display:inline-block; position:relative;
    }
    .qr-wrap img { display:block; width:220px; height:220px; border-radius:4px; }
    .qr-overlay {
      position:absolute; inset:0; border-radius:12px;
      background:rgba(0,0,0,.5);
      display:flex; align-items:center; justify-content:center;
      opacity:0; transition:opacity .2s; pointer-events:none;
    }
    .qr-wrap.loading .qr-overlay { opacity:1; }

    .hint { color:var(--muted); font-size:12px; line-height:1.6; max-width:300px; text-align:center; }
    .hint strong { color:#aaa; }

    .pairing-box {
      background:#1a3028; border:1px solid #25D36635;
      border-radius:10px; padding:14px 20px; width:100%;
    }
    .pairing-label { font-size:10px; text-transform:uppercase; letter-spacing:1.2px; color:var(--muted); margin-bottom:4px; }
    .pairing-code  { font-size:30px; font-weight:700; color:var(--green); letter-spacing:5px; font-family:monospace; }

    .connected-icon { font-size:44px; }
    .connected-title { font-size:16px; font-weight:600; margin-top:4px; }
    .connected-sub { color:var(--muted); font-size:12px; margin-top:4px; }

    .btn-ghost {
      background:var(--green-dim); border:1px solid var(--green-border); color:var(--green);
      border-radius:10px; padding:9px 22px; font-size:12px; font-weight:600;
      cursor:pointer; font-family:inherit; transition:background .2s; margin-top:4px;
    }
    .btn-ghost:hover { background:#25D36620; }

    /* ── AI Control ────────────────────────────────────────── */
    .field { display:flex; flex-direction:column; gap:6px; margin-bottom:18px; }
    .field:last-child { margin-bottom:0; }
    label { font-size:12px; font-weight:600; color:var(--label); }

    textarea, input[type=text] {
      background:var(--surface2);
      border:1px solid var(--border);
      border-radius:10px;
      color:var(--text);
      font-family:inherit;
      font-size:13px;
      padding:10px 12px;
      width:100%;
      resize:vertical;
      outline:none;
      transition:border-color .2s;
    }
    textarea:focus, input[type=text]:focus {
      border-color: #25D36660;
    }
    textarea { min-height:100px; }

    /* ── Quick replies list ────────────────────────────────── */
    #qr-list { display:flex; flex-direction:column; gap:8px; margin-bottom:10px; }

    .qr-row {
      display:flex; align-items:center; gap:8px;
    }
    .qr-row input { flex:1; }
    .btn-remove {
      background:none; border:1px solid #ffffff15; border-radius:8px;
      color:var(--muted); font-size:16px; cursor:pointer;
      width:34px; height:34px; display:flex; align-items:center; justify-content:center;
      flex-shrink:0; transition:all .15s;
    }
    .btn-remove:hover { background:#ff444420; border-color:#ff444440; color:#ff6666; }

    .btn-add {
      background:none; border:1px dashed var(--border); border-radius:10px;
      color:var(--muted); font-size:13px; font-weight:500;
      cursor:pointer; font-family:inherit;
      padding:8px 0; width:100%; transition:all .2s;
    }
    .btn-add:hover { border-color:#25D36650; color:var(--green); }

    /* ── Save button ───────────────────────────────────────── */
    .btn-save {
      background: linear-gradient(135deg, #25D366, #128C7E);
      border:none; border-radius:12px;
      color:#fff; font-size:14px; font-weight:700;
      cursor:pointer; font-family:inherit;
      padding:12px 0; width:100%;
      transition:opacity .2s; margin-top:4px;
    }
    .btn-save:hover { opacity:.9; }
    .btn-save:disabled { opacity:.5; cursor:not-allowed; }

    /* ── Toast ─────────────────────────────────────────────── */
    #toast {
      position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
      background:#1c1c22; border:1px solid var(--border);
      border-radius:12px; padding:11px 22px;
      font-size:13px; font-weight:500;
      opacity:0; transition:opacity .3s;
      pointer-events:none; white-space:nowrap; z-index:99;
    }
    #toast.show { opacity:1; }
    #toast.ok  { border-color:#25D36650; color:var(--green); }
    #toast.err { border-color:#ff444450; color:#ff6666; }

    /* ── Section divider ───────────────────────────────────── */
    .section-gap { height: 4px; }
  </style>
</head>
<body>

  <div class="brand">
    <div class="logo">🔥</div>
    <div>
      <h1>FireboxTechs Bot</h1>
      <div class="sub">Admin Dashboard<span class="poll-dot"></span></div>
    </div>
  </div>

  <!-- WhatsApp connection card -->
  <div class="card" style="text-align:center;">
    <div class="card-title">WhatsApp Connection</div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:14px;">
      <div class="badge connecting" id="badge">
        <div class="spinner"></div>
        <span>Connecting…</span>
      </div>
      <div id="wa-body"></div>
      <button class="btn-ghost" id="refresh-btn" style="display:none" onclick="forceRefresh()">🔄 Refresh QR</button>
    </div>
  </div>

  <!-- AI Control Panel -->
  <div class="card">
    <div class="card-title">AI Control Panel</div>

    <div class="field">
      <label for="system-prompt">🎯 AI Personality / Focus</label>
      <textarea id="system-prompt" rows="5" placeholder="e.g. You are a helpful assistant for FireboxTechs. Focus on tech support and our services…"></textarea>
    </div>

    <div class="field">
      <label>⚡ Quick Reply Buttons (shown after every AI reply)</label>
      <div id="qr-list"></div>
      <button class="btn-add" onclick="addQR()">＋ Add Button</button>
    </div>

    <button class="btn-save" id="save-btn" onclick="saveSettings()">Save Changes</button>
  </div>

  <div id="toast"></div>

  <script>
    // ── WhatsApp polling ────────────────────────────────────────────────────
    let lastState = null;
    let qrTs = Date.now();

    const badge      = document.getElementById('badge');
    const waBody     = document.getElementById('wa-body');
    const refreshBtn = document.getElementById('refresh-btn');

    function renderWA(status) {
      const { connected, qrCode, pairingCode } = status;

      badge.className = 'badge ' + (connected ? 'connected' : qrCode ? 'waiting-qr' : 'connecting');
      badge.innerHTML = connected
        ? '<span>✅ Connected to WhatsApp</span>'
        : qrCode
          ? '<span>📱 Scan QR to connect</span>'
          : pairingCode
            ? '<span>🔢 Enter pairing code</span>'
            : '<div class="spinner"></div><span>Waiting…</span>';

      if (connected) {
        refreshBtn.style.display = 'none';
        waBody.innerHTML = \`
          <div class="connected-icon">🤖</div>
          <div class="connected-title">Bot is online!</div>
          <div class="connected-sub">Any message sent to the bot gets an AI reply.</div>\`;
      } else if (pairingCode) {
        refreshBtn.style.display = 'none';
        waBody.innerHTML = \`
          <div class="pairing-box">
            <div class="pairing-label">Pairing Code</div>
            <div class="pairing-code">\${pairingCode}</div>
          </div>
          <p class="hint">Go to <strong>WhatsApp → Settings → Linked Devices → Link with phone number</strong> and enter the code above.</p>\`;
      } else if (qrCode) {
        refreshBtn.style.display = '';
        waBody.innerHTML = \`
          <div class="qr-wrap" id="qr-frame">
            <img id="qr-img" src="/api/bot/qr?t=\${qrTs}" alt="QR Code" />
            <div class="qr-overlay"><div class="spinner" style="width:32px;height:32px;border-width:3px;color:#fff"></div></div>
          </div>
          <p class="hint">Open <strong>WhatsApp → Settings → Linked Devices → Link a Device</strong> and scan.</p>\`;
      } else {
        refreshBtn.style.display = 'none';
        waBody.innerHTML = '<p class="hint">⏳ Waiting for QR from WhatsApp servers…</p>';
      }
    }

    function stateKey(s) { return s.connected + '|' + !!s.qrCode + '|' + s.pairingCode; }

    async function poll() {
      try {
        const res = await fetch('/api/bot/status');
        if (!res.ok) return;
        const status = await res.json();
        const key = stateKey(status);
        if (key !== lastState) {
          if (status.qrCode) qrTs = Date.now();
          lastState = key;
          renderWA(status);
        } else if (status.qrCode) {
          const img = document.getElementById('qr-img');
          if (img) {
            const frame = document.getElementById('qr-frame');
            frame && frame.classList.add('loading');
            const ts = Date.now();
            const tmp = new Image();
            tmp.onload = () => { qrTs = ts; img.src = tmp.src; frame && frame.classList.remove('loading'); };
            tmp.onerror = () => { frame && frame.classList.remove('loading'); };
            tmp.src = '/api/bot/qr?t=' + ts;
          }
        }
      } catch (_) {}
    }
    function forceRefresh() { qrTs = Date.now(); lastState = null; poll(); }
    poll();
    setInterval(poll, 3000);

    // ── Quick replies editor ────────────────────────────────────────────────
    function renderQRList(items) {
      const list = document.getElementById('qr-list');
      list.innerHTML = '';
      items.forEach((qr, i) => {
        const row = document.createElement('div');
        row.className = 'qr-row';
        row.innerHTML = \`
          <input type="text" value="\${escHtml(qr.label)}" placeholder="Button label" data-idx="\${i}" oninput="onQRInput(this)" />
          <button class="btn-remove" onclick="removeQR(\${i})" title="Remove">✕</button>\`;
        list.appendChild(row);
      });
    }

    function escHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    function getQRItems() {
      return [...document.querySelectorAll('#qr-list input')].map(el => ({ label: el.value.trim() })).filter(qr => qr.label);
    }

    function onQRInput(el) { /* live update — captured on save */ }

    function addQR() {
      const items = getQRItems();
      if (items.length >= 10) { showToast('Maximum 10 buttons', 'err'); return; }
      items.push({ label: '' });
      renderQRList(items);
      // Focus last input
      const inputs = document.querySelectorAll('#qr-list input');
      inputs[inputs.length - 1]?.focus();
    }

    function removeQR(idx) {
      const items = getQRItems();
      items.splice(idx, 1);
      renderQRList(items);
    }

    // ── Load settings ───────────────────────────────────────────────────────
    async function loadSettings() {
      try {
        const res = await fetch('/api/bot/settings');
        if (!res.ok) return;
        const s = await res.json();
        document.getElementById('system-prompt').value = s.systemPrompt || '';
        renderQRList(s.quickReplies || []);
      } catch (_) {}
    }
    loadSettings();

    // ── Save settings ───────────────────────────────────────────────────────
    async function saveSettings() {
      const btn = document.getElementById('save-btn');
      btn.disabled = true;
      btn.textContent = 'Saving…';

      const settings = {
        systemPrompt: document.getElementById('system-prompt').value.trim(),
        quickReplies: getQRItems(),
      };

      try {
        const res = await fetch('/api/bot/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings),
        });
        if (res.ok) {
          showToast('✅ Settings saved!', 'ok');
        } else {
          showToast('❌ Failed to save', 'err');
        }
      } catch (_) {
        showToast('❌ Network error', 'err');
      }

      btn.disabled = false;
      btn.textContent = 'Save Changes';
    }

    // ── Toast ───────────────────────────────────────────────────────────────
    let toastTimer = null;
    function showToast(msg, type) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.className = 'show ' + type;
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { t.className = ''; }, 3000);
    }
  </script>
</body>
</html>`;

router.get("/", (_req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.setHeader("Cache-Control", "no-store");
  res.send(HTML);
});

export default router;
