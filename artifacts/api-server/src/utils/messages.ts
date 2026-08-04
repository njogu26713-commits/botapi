/**
 * Rich message builders for WhatsApp via @itsliaaa/baileys.
 *
 * sendMessage() input formats (what this module builds):
 *   - Native flow interactive  → { nativeFlow: [...], text, footer }
 *   - List message             → { sections, buttonText, title, text, footer }
 *   - Carousel (needs images)  → { cards: [...], text, footer }
 *   - Plain text               → { text }
 *
 * The old approach pre-built { interactiveMessage: {...} } (proto output format),
 * which Baileys rejects as "Invalid media type". These builders now produce the
 * correct *input* format that generateWAMessageContent() accepts.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TextMessage {
  text: string;
  mentions?: string[];
}

export interface ImageMessage {
  image: Buffer | { url: string };
  caption?: string;
  mimetype?: string;
}

export interface VideoMessage {
  video: Buffer | { url: string };
  caption?: string;
  mimetype?: string;
  gifPlayback?: boolean;
}

export interface AudioMessage {
  audio: Buffer | { url: string };
  mimetype?: string;
  ptt?: boolean;
}

export interface DocumentMessage {
  document: Buffer | { url: string };
  mimetype: string;
  fileName: string;
  caption?: string;
}

export interface StickerMessage {
  sticker: Buffer | { url: string };
  mimetype?: string;
}

export interface LocationMessage {
  location: {
    degreesLatitude: number;
    degreesLongitude: number;
    name?: string;
    address?: string;
  };
}

export interface ListSection {
  title: string;
  rows: Array<{
    title: string;
    description?: string;
    rowId: string;
  }>;
}

export interface CarouselCard {
  header: {
    imageUrl?: string;
    hasMediaAttachment?: boolean;
  };
  body: string;
  footer?: string;
  buttons: CarouselFlexButton[];
}

export interface CarouselFlexButton {
  type: "quick_reply" | "cta_url";
  displayText: string;
  id?: string;
  url?: string;
}

// ─── Text ────────────────────────────────────────────────────────────────────

export function textMessage(text: string, mentions?: string[]): TextMessage {
  return mentions ? { text, mentions } : { text };
}

// ─── Media ───────────────────────────────────────────────────────────────────

export function imageMessage(
  image: Buffer | string,
  caption?: string,
): ImageMessage {
  return {
    image: typeof image === "string" ? { url: image } : image,
    caption,
    mimetype: "image/jpeg",
  };
}

export function videoMessage(
  video: Buffer | string,
  caption?: string,
  gif = false,
): VideoMessage {
  return {
    video: typeof video === "string" ? { url: video } : video,
    caption,
    mimetype: "video/mp4",
    gifPlayback: gif,
  };
}

export function audioMessage(audio: Buffer | string, ptt = false): AudioMessage {
  return {
    audio: typeof audio === "string" ? { url: audio } : audio,
    mimetype: ptt ? "audio/ogg; codecs=opus" : "audio/mpeg",
    ptt,
  };
}

export function documentMessage(
  document: Buffer | string,
  fileName: string,
  mimetype = "application/octet-stream",
  caption?: string,
): DocumentMessage {
  return {
    document: typeof document === "string" ? { url: document } : document,
    mimetype,
    fileName,
    caption,
  };
}

export function stickerMessage(sticker: Buffer | string): StickerMessage {
  return {
    sticker: typeof sticker === "string" ? { url: sticker } : sticker,
    mimetype: "image/webp",
  };
}

export function locationMessage(
  latitude: number,
  longitude: number,
  name?: string,
  address?: string,
): LocationMessage {
  return {
    location: {
      degreesLatitude: latitude,
      degreesLongitude: longitude,
      name,
      address,
    },
  };
}

// ─── Interactive — Native Flow V2 Buttons ────────────────────────────────────

/**
 * Native Flow interactive message with quick-reply or CTA buttons.
 *
 * Baileys input format: { nativeFlow: [...], text, footer }
 * Each button: { id, text } → quick_reply
 *              { url, text } → cta_url
 *              { call, text } → cta_call
 */
export function nativeFlowMessage(
  bodyText: string,
  buttons: Array<{ id?: string; url?: string; call?: string; text: string }>,
  footer?: string,
): any {
  return {
    text: bodyText,
    footer,
    nativeFlow: buttons,
  };
}

/**
 * CTA quick-reply buttons (most common interactive type).
 */
export function ctaButtons(
  bodyText: string,
  buttons: Array<{ id: string; text: string }>,
  footer?: string,
  _header?: string, // header text is not supported in native flow; kept for API compatibility
): any {
  return nativeFlowMessage(bodyText, buttons, footer);
}

/**
 * Single CTA URL button.
 */
export function ctaUrlButton(
  bodyText: string,
  buttonText: string,
  url: string,
  footer?: string,
): any {
  return nativeFlowMessage(bodyText, [{ url, text: buttonText }], footer);
}

/**
 * Single CTA call button.
 */
export function ctaCallButton(
  bodyText: string,
  buttonText: string,
  phoneNumber: string,
  footer?: string,
): any {
  return nativeFlowMessage(bodyText, [{ call: phoneNumber, text: buttonText }], footer);
}

// ─── Interactive — List Message ───────────────────────────────────────────────

/**
 * List/menu message with categorised rows.
 *
 * Baileys input format: { sections, buttonText, title, text, footer }
 */
export function listMessage(
  title: string,
  bodyText: string,
  buttonText: string,
  sections: ListSection[],
  footer?: string,
): any {
  return {
    title,
    text: bodyText,
    footer,
    buttonText,
    sections,
  };
}

// ─── Interactive — Carousel ───────────────────────────────────────────────────

/**
 * Carousel message. Each card MUST have an imageUrl — Baileys requires a valid
 * image/video header per card. Cards without an image are rendered as list rows
 * in a fallback list message instead.
 */
export function carouselMessage(
  bodyText: string,
  cards: CarouselCard[],
): any {
  const cardsWithImages = cards.filter((c) => c.header.imageUrl);
  const cardsWithoutImages = cards.filter((c) => !c.header.imageUrl);

  // If all cards have images, use the proper carousel format
  if (cardsWithImages.length === cards.length) {
    return {
      text: bodyText,
      cards: cards.map((card) => ({
        image: { url: card.header.imageUrl! },
        caption: card.body,
        footer: card.footer,
        nativeFlow: card.buttons.map((b) =>
          b.type === "cta_url"
            ? { url: b.url!, text: b.displayText }
            : { id: b.id ?? b.displayText, text: b.displayText },
        ),
      })),
    };
  }

  // Fallback: render as a list message when cards have no images
  const rows = (cardsWithoutImages.length > 0 ? cardsWithoutImages : cards).map((card, i) => ({
    rowId: card.buttons[0]?.id ?? `item_${i}`,
    title: card.body.split("\n")[0]?.replace(/[*_]/g, "").trim().slice(0, 24) ?? `Item ${i + 1}`,
    description: card.footer ?? "",
  }));

  return listMessage(
    "🔥 FireboxTechs Services",
    bodyText,
    "🛠️ View Services",
    [{ title: "Available", rows }],
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const fmt = {
  bold: (s: string) => `*${s}*`,
  italic: (s: string) => `_${s}_`,
  mono: (s: string) => `\`\`\`${s}\`\`\``,
  code: (s: string) => `\`${s}\``,
  strike: (s: string) => `~${s}~`,
  quote: (s: string) => `> ${s}`,
  header: (s: string) => `*── ${s} ──*`,
  divider: () => "─────────────────",
  newline: () => "\n",
};

/**
 * Build a plain-text menu string for WhatsApp (no interactive buttons).
 */
export function buildMenu(
  title: string,
  items: Array<{ emoji?: string; label: string; desc?: string }>,
  footer?: string,
): string {
  let msg = `${fmt.bold(title)}\n\n`;
  items.forEach((item) => {
    const emoji = item.emoji ?? "•";
    msg += `${emoji} ${fmt.bold(item.label)}`;
    if (item.desc) msg += `\n   ${item.desc}`;
    msg += "\n";
  });
  if (footer) msg += `\n${footer}`;
  return msg;
}
