/**
 * Admin dashboard served at GET /
 * - WhatsApp connection panel (QR / connected state)
 * - AI control panel (system prompt + conditional clarification buttons)
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
      align-items: stretch;
      padding: 28px clamp(14px, 2.5vw, 40px) 64px;
      gap: 20px;
    }

    /* ── Brand ─────────────────────────────────────────────── */
    .brand {
      display: flex; align-items: center; gap: 12px;
      width: 100%; max-width: 1440px;
      margin: 0 auto;
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
      max-width: 1440px;
      margin: 0 auto;
      padding: clamp(20px, 2.4vw, 34px);
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

    textarea, input[type=text], select {
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

    /* ── Knowledge center ───────────────────────────────────── */
    .section-heading {
      display:flex; align-items:flex-start; justify-content:space-between;
      gap:14px; margin:24px 0 12px;
    }
    .section-heading:first-of-type { margin-top:4px; }
    .section-heading h3 { font-size:14px; font-weight:700; letter-spacing:-.2px; }
    .section-heading p { color:var(--muted); font-size:11px; line-height:1.5; margin-top:4px; }
    .section-kicker { color:var(--green); font-size:10px; font-weight:700; letter-spacing:1.2px; text-transform:uppercase; }
    .knowledge-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .knowledge-grid .field { margin-bottom:4px; }
    .field-wide { grid-column:1 / -1; }
    .knowledge-grid label { display:flex; align-items:center; gap:6px; }
    .field-hint { color:var(--muted); font-size:11px; line-height:1.45; margin-top:5px; }
    input[type=text], textarea { min-height:40px; }
    textarea.compact { min-height:78px; }
    .offering-list { display:flex; flex-direction:column; gap:12px; }
    .offering-card {
      background:var(--surface2); border:1px solid var(--border); border-radius:14px;
      padding:14px; box-shadow:0 8px 20px #00000015;
    }
    .offering-card-head { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:12px; }
    .offering-card-title { font-size:13px; font-weight:700; }
    .offering-card-subtitle { color:var(--muted); font-size:11px; margin-top:3px; }
    .offering-actions { display:flex; align-items:center; gap:8px; }
    .offering-status { background:none; border:0; color:var(--green); cursor:pointer; font-family:inherit; font-size:10px; font-weight:700; letter-spacing:.7px; padding:4px 0; text-transform:uppercase; }
    .offering-status.inactive { color:var(--muted); }
    .btn-icon, .btn-add {
      background:none; border:1px solid var(--border); border-radius:9px;
      color:var(--muted); font-size:12px; font-weight:600; cursor:pointer; font-family:inherit;
      transition:all .2s;
    }
    .btn-icon { width:32px; height:32px; }
    .btn-icon:hover { background:#ff444420; border-color:#ff444450; color:#ff7777; }
    .btn-add { border-style:dashed; padding:10px 12px; width:100%; }
    .btn-add:hover { border-color:#25D36660; color:var(--green); background:#25D36608; }
    .offering-empty {
      border:1px dashed var(--border); border-radius:12px; color:var(--muted);
      font-size:12px; line-height:1.5; padding:18px; text-align:center;
    }
    select {
      appearance:none; background-image:linear-gradient(45deg, transparent 50%, var(--muted) 50%), linear-gradient(135deg, var(--muted) 50%, transparent 50%);
      background-position:calc(100% - 16px) 17px, calc(100% - 11px) 17px; background-repeat:no-repeat; background-size:5px 5px, 5px 5px;
      padding-right:30px;
    }
    .knowledge-callout {
      background:linear-gradient(135deg,#25D36610,#3b82f608); border:1px solid #25D36625;
      border-radius:12px; color:#c9e9d4; font-size:12px; line-height:1.55; padding:12px 14px;
    }
    .knowledge-callout strong { color:var(--green); }
    @media (max-width: 560px) {
      .knowledge-grid { grid-template-columns:1fr; }
      .field-wide { grid-column:auto; }
      .section-heading { margin-top:20px; }
    }

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
      <textarea id="system-prompt" rows="5" placeholder="Write exactly how you want the bot to behave, what it should focus on, and how it should answer…"></textarea>
      <p class="hint" style="text-align:left;margin-top:6px;">This instruction directly controls the bot’s personality, expertise, priorities, and response style.</p>
    </div>

    <div class="knowledge-callout">
      <strong>How this works:</strong> the AI uses the information below as its support knowledge. It will answer from the matching offering or service, ask a focused question when the request is unclear, and avoid inventing details that are not configured here. Clarification buttons still appear only when needed.
    </div>

    <div class="section-heading">
      <div><div class="section-kicker">01 · Identity</div><h3>Company profile</h3><p>Give the assistant the context it needs to represent your business accurately.</p></div>
    </div>
    <div class="knowledge-grid">
      <div class="field">
        <label for="company-name">Company name</label>
        <input id="company-name" type="text" placeholder="e.g. FireboxTechs" />
      </div>
      <div class="field">
        <label for="company-hours">Business hours</label>
        <input id="company-hours" type="text" placeholder="e.g. Mon–Fri, 8:00–17:00" />
      </div>
      <div class="field field-wide">
        <label for="company-mission">Mission / positioning</label>
        <textarea id="company-mission" class="compact" placeholder="What your business does, who it serves, and what makes the offering valuable…"></textarea>
      </div>
      <div class="field field-wide">
        <label for="company-contact">Contact and support channels</label>
        <textarea id="company-contact" class="compact" placeholder="Phone, email, website, office location, or the preferred human-support route…"></textarea>
      </div>
    </div>

    <div class="section-heading">
      <div><div class="section-kicker">02 · Voice</div><h3>Response guidelines</h3><p>Control how the assistant communicates without mixing style rules into offering facts.</p></div>
    </div>
    <div class="knowledge-grid">
      <div class="field">
        <label for="guideline-tone">Tone</label>
        <input id="guideline-tone" type="text" placeholder="Friendly, clear, professional" />
      </div>
      <div class="field">
        <label for="guideline-language">Preferred language</label>
        <input id="guideline-language" type="text" placeholder="English" />
      </div>
      <div class="field field-wide">
        <label for="guideline-format">Response format</label>
        <textarea id="guideline-format" class="compact" placeholder="Short WhatsApp paragraphs, numbered steps, simple bullets…"></textarea>
      </div>
      <div class="field field-wide">
        <label for="guideline-escalation">Escalation rule</label>
        <textarea id="guideline-escalation" class="compact" placeholder="When should the assistant recommend human support, and what should it tell the user to do?"></textarea>
      </div>
    </div>

    <div class="section-heading">
      <div><div class="section-kicker">03 · Catalog</div><h3>Offerings catalog</h3><p>Add offerings, services, packages, subscriptions, courses, events, promotions, or any other offering.</p></div>
    </div>
    <div id="offering-list" class="offering-list"></div>
    <button class="btn-add" type="button" onclick="addOffering()">＋ Add offering</button>

    <div class="section-heading">
      <div><div class="section-kicker">04 · Guardrails</div><h3>Policies and boundaries</h3><p>Set the rules the assistant must follow when information is missing or sensitive.</p></div>
    </div>
    <div class="field">
      <textarea id="policies" class="compact" placeholder="Do not invent prices, availability, guarantees, or policies. Explain when a human is needed…"></textarea>
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
        // A QR reference expires after a short period. Expose the existing
        // restart endpoint so the dashboard can recover without a redeploy.
        refreshBtn.style.display = '';
        refreshBtn.textContent = '🔄 Start / Refresh QR';
        waBody.innerHTML = '<p class="hint">⏳ Waiting for a new QR from WhatsApp servers…</p>';
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
    async function forceRefresh() {
      refreshBtn.disabled = true;
      refreshBtn.textContent = '⏳ Restarting…';
      try {
        await fetch('/api/bot/restart', { method: 'POST' });
      } catch (_) {
        // The normal polling loop will show the latest state.
      } finally {
        qrTs = Date.now();
        lastState = null;
        refreshBtn.disabled = false;
        poll();
      }
    }
    poll();
    setInterval(poll, 3000);

    // ── Offering knowledge editor ─────────────────────────────────────────────
    let offerings = [];

    function valueOrEmpty(value) { return typeof value === 'string' ? value : ''; }

    function normalizeOffering(offering, index) {
        offering = offering && typeof offering === 'object' ? offering : {};
        const summary = valueOrEmpty(offering.summary) || valueOrEmpty(offering.description);
      return {
        id: valueOrEmpty(offering.id) || ('offering_' + (index + 1)),
        type: valueOrEmpty(offering.type) || 'custom',
        name: valueOrEmpty(offering.name),
        category: valueOrEmpty(offering.category),
        summary: summary,
        description: valueOrEmpty(offering.description) || summary,
        features: valueOrEmpty(offering.features),
        benefits: valueOrEmpty(offering.benefits),
        pricing: valueOrEmpty(offering.pricing),
        support: valueOrEmpty(offering.support),
        faqs: valueOrEmpty(offering.faqs),
        active: offering.active !== false,
      };
    }

    function newOffering() {
      return normalizeOffering({
        id: 'offering_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        active: true,
      }, offerings.length);
    }

    function offeringField(offering, key, labelText, placeholder, multiline, wide, onInput, options) {
      const wrapper = document.createElement('div');
      wrapper.className = 'field' + (wide ? ' field-wide' : '');
      const label = document.createElement('label');
      label.textContent = labelText;
      const control = document.createElement(options ? 'select' : multiline ? 'textarea' : 'input');
      if (!options && !multiline) control.type = 'text';
      if (multiline) control.className = 'compact';
      control.placeholder = placeholder;
      if (options) {
        options.forEach(function (option) {
          const item = document.createElement('option');
          item.value = option.value;
          item.textContent = option.label;
          control.appendChild(item);
        });
      }
      control.value = offering[key] || (options && options[0] ? options[0].value : '');
      control.addEventListener('input', function () {
        offering[key] = control.value;
        if (onInput) onInput(control.value);
      });
      wrapper.append(label, control);
      return wrapper;
    }

    function offeringTypeLabel(type) {
      const labels = {
        product: 'Product', service: 'Service', package: 'Package', subscription: 'Subscription',
        solution: 'Solution', course: 'Course', event: 'Event', promotion: 'Promotion', custom: 'Custom',
      };
      return labels[type] || 'Custom';
    }

    function renderOfferings() {
      const list = document.getElementById('offering-list');
      list.replaceChildren();
      if (!offerings.length) {
        const empty = document.createElement('div');
        empty.className = 'offering-empty';
        empty.textContent = 'No offerings added yet. Add your first product, service, package, subscription, course, event, promotion, or custom offering.';
        list.appendChild(empty);
        return;
      }

      offerings.forEach(function (offering, index) {
        const card = document.createElement('div');
        card.className = 'offering-card';

        const head = document.createElement('div');
        head.className = 'offering-card-head';
        const titleBlock = document.createElement('div');
        const title = document.createElement('div');
        title.className = 'offering-card-title';
        title.textContent = offering.name || 'Untitled offering';
        const subtitle = document.createElement('div');
        subtitle.className = 'offering-card-subtitle';
        subtitle.textContent = offeringTypeLabel(offering.type) + (offering.category ? ' · ' + offering.category : '');
        titleBlock.append(title, subtitle);

        const actions = document.createElement('div');
        actions.className = 'offering-actions';
        const status = document.createElement('button');
        status.type = 'button';
        status.className = 'offering-status' + (offering.active ? '' : ' inactive');
        status.textContent = offering.active ? 'Active' : 'Paused';
        status.title = 'Click to toggle whether the AI can use this offering';
        status.addEventListener('click', function () {
          offering.active = !offering.active;
          status.className = 'offering-status' + (offering.active ? '' : ' inactive');
          status.textContent = offering.active ? 'Active' : 'Paused';
        });
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'btn-icon';
        remove.textContent = '×';
        remove.title = 'Remove this offering';
        remove.addEventListener('click', function () {
          offerings.splice(index, 1);
          renderOfferings();
        });
        actions.append(status, remove);
        head.append(titleBlock, actions);

        const grid = document.createElement('div');
        grid.className = 'knowledge-grid';
        grid.append(
          offeringField(offering, 'type', 'Offering type', '', false, false, function (value) {
            subtitle.textContent = offeringTypeLabel(value) + (offering.category ? ' · ' + offering.category : '');
          }, [
            { value: 'product', label: 'Product' },
            { value: 'service', label: 'Service' },
            { value: 'package', label: 'Package' },
            { value: 'subscription', label: 'Subscription' },
            { value: 'solution', label: 'Solution' },
            { value: 'course', label: 'Course / training' },
            { value: 'event', label: 'Event' },
            { value: 'promotion', label: 'Promotion' },
            { value: 'custom', label: 'Other / custom' },
          ]),
          offeringField(offering, 'name', 'Name', 'e.g. Managed IT Support', false, false, function (value) {
            title.textContent = value || 'Untitled offering';
          }),
          offeringField(offering, 'category', 'Category', 'e.g. Cybersecurity, consulting, software', false, false, function (value) {
            subtitle.textContent = offeringTypeLabel(offering.type) + (value ? ' · ' + value : '');
          }),
          offeringField(offering, 'summary', 'Short summary', 'What is this offering?', true, true),
          offeringField(offering, 'description', 'Full description', 'Explain the offering in detail: who it is for, what it includes, and how it works.', true, true),
          offeringField(offering, 'features', 'Features and inclusions', 'What does the customer receive? Add one item per line.', true, true),
          offeringField(offering, 'benefits', 'Customer benefits', 'What problem does it solve or what outcome does it provide?', true, true),
          offeringField(offering, 'pricing', 'Pricing and availability', 'Price range, quote process, plans, stock, or availability rules.', true, true),
          offeringField(offering, 'support', 'Delivery and support', 'Onboarding, delivery timeline, support channel, or service terms.', true, true),
          offeringField(offering, 'faqs', 'Frequently asked questions', 'Add common questions and answers. One Q&A per line or paragraph.', true, true),
        );
        card.append(head, grid);
        list.appendChild(card);
      });
    }

    function getValue(id) {
      const element = document.getElementById(id);
      return element ? element.value.trim() : '';
    }

    function setValue(id, value) {
      const element = document.getElementById(id);
      if (element) element.value = value || '';
    }

    function addOffering() {
      offerings.push(newOffering());
      renderOfferings();
      const cards = document.querySelectorAll('.offering-card');
      cards[cards.length - 1]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // ── Load settings ───────────────────────────────────────────────────────
    async function loadSettings() {
      try {
        const res = await fetch('/api/bot/settings');
        if (!res.ok) return;
        const s = await res.json();
        setValue('system-prompt', s.systemPrompt);
        setValue('company-name', s.company && s.company.name);
        setValue('company-mission', s.company && s.company.mission);
        setValue('company-contact', s.company && s.company.contact);
        setValue('company-hours', s.company && s.company.hours);
        setValue('guideline-tone', s.responseGuidelines && s.responseGuidelines.tone);
        setValue('guideline-language', s.responseGuidelines && s.responseGuidelines.language);
        setValue('guideline-format', s.responseGuidelines && s.responseGuidelines.format);
        setValue('guideline-escalation', s.responseGuidelines && s.responseGuidelines.escalation);
        setValue('policies', s.policies);
        offerings = Array.isArray(s.offerings) ? s.offerings.map(normalizeOffering) : [];
        renderOfferings();
      } catch (_) {
        renderOfferings();
      }
    }
    loadSettings();

    // ── Save settings ───────────────────────────────────────────────────────
    async function saveSettings() {
      const btn = document.getElementById('save-btn');
      btn.disabled = true;
      btn.textContent = 'Saving…';

      const settings = {
        systemPrompt: getValue('system-prompt'),
        company: {
          name: getValue('company-name'),
          mission: getValue('company-mission'),
          contact: getValue('company-contact'),
          hours: getValue('company-hours'),
        },
        responseGuidelines: {
          tone: getValue('guideline-tone'),
          language: getValue('guideline-language'),
          format: getValue('guideline-format'),
          escalation: getValue('guideline-escalation'),
        },
        offerings: offerings,
        policies: getValue('policies'),
        // Keep the legacy field for older API clients. It is intentionally empty:
        // clarification buttons are generated dynamically only when needed.
        quickReplies: [],
      };

      try {
        const res = await fetch('/api/bot/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings),
        });
        if (res.ok) {
          showToast('✓ Knowledge center saved', 'ok');
        } else {
          showToast('Failed to save knowledge center', 'err');
        }
      } catch (_) {
        showToast('Network error while saving', 'err');
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
