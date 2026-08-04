/**
 * General formatting utilities for WhatsApp messages.
 */

/** Format bytes to human-readable size */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/** Format milliseconds to human-readable duration */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/** Truncate text to max length with ellipsis */
export function truncate(text: string, maxLen = 1000): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + "...";
}

/** Format a Date to a readable WhatsApp string */
export function formatDate(date: Date): string {
  return date.toLocaleString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Format number with commas */
export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

/** Strip HTML tags from a string */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>?/gm, "").trim();
}

/** Normalize phone number to WhatsApp JID format */
export function toJid(phone: string): string {
  const clean = phone.replace(/[^0-9]/g, "");
  return clean.endsWith("@s.whatsapp.net") ? phone : `${clean}@s.whatsapp.net`;
}

/** Extract plain phone number from JID */
export function fromJid(jid: string): string {
  return jid.replace(/@.+$/, "").replace(/[^0-9]/g, "");
}

/** Check if a JID is a group */
export function isGroupJid(jid: string): boolean {
  return jid.endsWith("@g.us");
}

/** Escape special markdown characters for plain text output */
export function escapeMarkdown(text: string): string {
  return text.replace(/[*_~`]/g, "\\$&");
}

/** Build a simple progress bar */
export function progressBar(current: number, total: number, width = 10): string {
  const filled = Math.round((current / total) * width);
  const empty = width - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

/** Convert code block language hints to WhatsApp mono */
export function codeToWhatsApp(code: string): string {
  return "```" + code + "```";
}

/** Split long text into WhatsApp-safe chunks (max 4096 chars each) */
export function splitMessage(text: string, maxChunkLen = 4000): string[] {
  if (text.length <= maxChunkLen) return [text];

  const chunks: string[] = [];
  let current = "";
  const lines = text.split("\n");

  for (const line of lines) {
    if (current.length + line.length + 1 > maxChunkLen) {
      if (current) chunks.push(current.trim());
      current = line;
    } else {
      current += (current ? "\n" : "") + line;
    }
  }

  if (current) chunks.push(current.trim());
  return chunks;
}

/** Sanitize user input to prevent injection */
export function sanitize(input: string): string {
  return input.replace(/[<>]/g, "").trim().slice(0, 2000);
}
