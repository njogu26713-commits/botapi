/**
 * Rich message builders for WhatsApp via Baileys.
 * Supports: text, images, videos, audio, documents, stickers, location,
 * interactive buttons (native flow V2), quick-reply buttons, carousels,
 * and interactive lists.
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
  ptt?: boolean; // voice note
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

export interface QuickReplyButton {
  id: string;
  displayText: string;
}

export interface ButtonsMessage {
  text: string;
  footer?: string;
  buttons: QuickReplyButton[];
  headerType?: number;
}

export interface ListSection {
  title: string;
  rows: Array<{
    title: string;
    description?: string;
    rowId: string;
  }>;
}

export interface ListMessage {
  text: string;
  footer?: string;
  title?: string;
  buttonText: string;
  sections: ListSection[];
}

export interface CarouselCard {
  header: {
    imageUrl?: string;
    hasMediaAttachment?: boolean;
  };
  body: string;
  footer?: string;
  buttons: QuickReplyButton[];
}

export interface NativeFlowButton {
  name: string;
  buttonParamsJson: string;
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

// ─── Interactive — Quick Reply Buttons ───────────────────────────────────────

/**
 * Quick reply buttons message.
 * Falls back to button list on unsupported clients.
 */
export function quickReplyButtons(
  text: string,
  buttons: Array<{ id: string; text: string }>,
  footer?: string,
): any {
  return {
    text,
    footer,
    buttons: buttons.map((b) => ({
      buttonId: b.id,
      buttonText: { displayText: b.text },
      type: 1,
    })),
    headerType: 1,
  };
}

// ─── Interactive — Native Flow V2 Buttons ────────────────────────────────────

/**
 * Native Flow V2 interactive message with CTA / quick-reply buttons.
 * This is the modern WhatsApp Business API interactive format.
 */
export function nativeFlowMessage(
  bodyText: string,
  buttons: NativeFlowButton[],
  footer?: string,
  headerText?: string,
): any {
  const msg: any = {
    interactiveMessage: {
      body: { text: bodyText },
      footer: { text: footer ?? "" },
      header: headerText ? { title: headerText, hasMediaAttachment: false } : undefined,
      nativeFlowMessage: {
        buttons: buttons.map((b) => ({
          name: b.name,
          buttonParamsJson: b.buttonParamsJson,
        })),
        messageParamsJson: "",
      },
    },
  };
  return msg;
}

/**
 * Simple CTA reply buttons using Native Flow V2.
 */
export function ctaButtons(
  bodyText: string,
  buttons: Array<{ id: string; text: string }>,
  footer?: string,
  header?: string,
): any {
  return nativeFlowMessage(
    bodyText,
    buttons.map((b) => ({
      name: "quick_reply",
      buttonParamsJson: JSON.stringify({ display_text: b.text, id: b.id }),
    })),
    footer,
    header,
  );
}

/**
 * CTA URL button (opens a URL).
 */
export function ctaUrlButton(
  bodyText: string,
  buttonText: string,
  url: string,
  footer?: string,
): any {
  return nativeFlowMessage(
    bodyText,
    [
      {
        name: "cta_url",
        buttonParamsJson: JSON.stringify({ display_text: buttonText, url }),
      },
    ],
    footer,
  );
}

/**
 * CTA call button (initiates a call).
 */
export function ctaCallButton(
  bodyText: string,
  buttonText: string,
  phoneNumber: string,
  footer?: string,
): any {
  return nativeFlowMessage(
    bodyText,
    [
      {
        name: "cta_call",
        buttonParamsJson: JSON.stringify({ display_text: buttonText, phone_number: phoneNumber }),
      },
    ],
    footer,
  );
}

// ─── Interactive — List Message ───────────────────────────────────────────────

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
    listType: 1,
  };
}

// ─── Interactive — Carousel ───────────────────────────────────────────────────

/**
 * Carousel message (WhatsApp Business API).
 * Each card can have an image, body text, footer, and buttons.
 */
export function carouselMessage(
  bodyText: string,
  cards: CarouselCard[],
): any {
  return {
    interactiveMessage: {
      body: { text: bodyText },
      carouselMessage: {
        cards: cards.map((card) => ({
          header: {
            hasMediaAttachment: !!card.header.imageUrl,
            imageMessage: card.header.imageUrl
              ? { url: card.header.imageUrl, mimetype: "image/jpeg" }
              : undefined,
          },
          body: { text: card.body },
          footer: { text: card.footer ?? "" },
          buttons: card.buttons.map((b) => ({
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({ display_text: b.displayText, id: b.id }),
          })),
          nativeFlowMessage: {},
        })),
      },
    },
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Format text for WhatsApp: bold, italic, monospace.
 */
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
 * Build a menu-style text list for WhatsApp.
 */
export function buildMenu(
  title: string,
  items: Array<{ emoji?: string; label: string; desc?: string }>,
  footer?: string,
): string {
  let msg = `${fmt.bold(title)}\n\n`;
  items.forEach((item, i) => {
    const num = `${i + 1}.`;
    const emoji = item.emoji ?? "•";
    msg += `${emoji} ${fmt.bold(item.label)}`;
    if (item.desc) msg += `\n   ${item.desc}`;
    msg += "\n";
  });
  if (footer) msg += `\n${footer}`;
  return msg;
}
