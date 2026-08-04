/**
 * Input validation utilities.
 */

/** Check if a string looks like a valid phone number */
export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/[^0-9]/g, "");
  return cleaned.length >= 7 && cleaned.length <= 15;
}

/** Check if a string is a valid URL */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/** Check if a string is a YouTube URL */
export function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i.test(
    url,
  );
}

/** Extract YouTube video ID from URL */
export function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i,
  );
  return match ? (match[1] ?? null) : null;
}

/** Check if text starts with a command prefix */
export function isCommand(text: string, prefix = "!"): boolean {
  return text.startsWith(prefix);
}

/** Parse a command string into name and arguments */
export function parseCommand(
  text: string,
  prefix = "!",
): { command: string; args: string[]; rawArgs: string } | null {
  if (!isCommand(text, prefix)) return null;

  const withoutPrefix = text.slice(prefix.length).trim();
  const parts = withoutPrefix.split(/\s+/);
  const command = parts[0]?.toLowerCase() ?? "";
  const args = parts.slice(1);
  const rawArgs = withoutPrefix.slice(command.length).trim();

  return { command, args, rawArgs };
}

/** Check if text is potentially spam */
export function containsSpamPatterns(text: string): boolean {
  const spamPatterns = [
    /(.)\1{10,}/i, // repeated characters
    /https?:\/\//i, // URLs (check separately)
    /\b(free|win|click|earn|dollar|bitcoin|crypto|prize)\b/i,
  ];
  return spamPatterns.some((p) => p.test(text));
}

/** Sanitize file name for safe storage */
export function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .slice(0, 100);
}

/** Check if a MIME type is an image */
export function isImageMime(mime: string): boolean {
  return mime.startsWith("image/");
}

/** Check if a MIME type is a video */
export function isVideoMime(mime: string): boolean {
  return mime.startsWith("video/");
}

/** Check if a MIME type is audio */
export function isAudioMime(mime: string): boolean {
  return mime.startsWith("audio/");
}

/** Check if a MIME type is a PDF */
export function isPdfMime(mime: string): boolean {
  return mime === "application/pdf";
}
