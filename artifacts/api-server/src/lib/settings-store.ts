/**
 * Bot settings — persisted to data/bot-settings.json.
 * Loaded once at startup; updated in-memory and written on save.
 * No database required.
 */
import fs from "node:fs";
import path from "node:path";

export interface QuickReply {
  label: string;
}

export interface BotSettings {
  systemPrompt: string;
  quickReplies: QuickReply[];
}

const SETTINGS_FILE = path.resolve(process.cwd(), "data/bot-settings.json");

const DEFAULT_SETTINGS: BotSettings = {
  systemPrompt:
    "You are a helpful, friendly AI assistant for FireboxTechs. Answer questions clearly and concisely. If you don't know something, say so honestly.",
  quickReplies: [
    { label: "Our Services" },
    { label: "Get Support" },
    { label: "Pricing Info" },
    { label: "Talk to a Human" },
  ],
};

let current: BotSettings = DEFAULT_SETTINGS;

/** Load settings from disk (called once at startup). */
export function loadSettings(): void {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, "utf8");
      current = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {
    current = { ...DEFAULT_SETTINGS };
  }
}

/** Return current settings (in-memory, always fast). */
export function getSettings(): BotSettings {
  return current;
}

/** Persist updated settings to disk and update in-memory copy. */
export function saveSettings(settings: BotSettings): void {
  current = settings;
  const dir = path.dirname(SETTINGS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf8");
}
