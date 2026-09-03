/**
 * Message handler — routes all WhatsApp messages to Groq AI.
 * AI clarification buttons are shown only when the AI does not understand a
 * user's message. Messages starting with ! are admin commands (plugin system).
 */
import { logger } from "../lib/logger.js";
import { pluginRegistry } from "../plugins/loader.js";
import { COMMAND_PREFIX } from "../commands/registry.js";
import { chat, clearHistory, generateQuickReplies } from "../services/ai.service.js";
import { getSettings } from "../lib/settings-store.js";

// ─── Context builder ──────────────────────────────────────────────────────────

interface Ctx {
  socket: any;
  from: string;
  message: any;
  phoneNumber: string;
  pushName: string;
  isGroup: boolean;
  text: string;             // raw text or button label
  isButtonTap: boolean;     // true when text came from a quick-reply tap
  isAdminCommand: boolean;  // true when text starts with !
  command: string;          // command name without prefix (admin only)
  args: string[];
  rawArgs: string;
  replyText: (t: string) => Promise<void>;
  reply: (c: any) => Promise<void>;
  sendTyping: () => Promise<void>;
}

function buildCtx(socket: any, message: any): Ctx | null {
  const from = message.key?.remoteJid;
  if (!from || from === "status@broadcast") return null;

  const isGroup = from.endsWith("@g.us");
  const sender = isGroup
    ? (message.key?.participant ?? message.key?.remoteJid ?? "")
    : from;

  // ── Extract text ──────────────────────────────────────────────────────────
  let body: string =
    message.message?.conversation ||
    message.message?.extendedTextMessage?.text ||
    message.message?.imageMessage?.caption ||
    message.message?.videoMessage?.caption ||
    message.message?.documentMessage?.caption ||
    "";

  let isButtonTap = false;

  // Button tap detection — covers all known response formats
  if (!body) {
    // nativeFlow quick_reply → comes back as templateButtonReplyMessage in this Baileys fork
    const tpl = message.message?.templateButtonReplyMessage?.selectedId
      ?? message.message?.templateButtonReplyMessage?.selectedDisplayText;
    if (tpl) { body = tpl; isButtonTap = true; }
  }

  if (!body) {
    // interactiveResponseMessage → nativeFlowResponseMessage (standard Baileys)
    const paramsJson =
      message.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson;
    if (paramsJson) {
      try {
        const parsed = JSON.parse(paramsJson);
        const id = parsed?.id || parsed?.display_text || "";
        if (id) { body = id; isButtonTap = true; }
      } catch { /* ignore */ }
    }
  }

  if (!body) {
    // Legacy buttons
    const legacyId = message.message?.buttonsResponseMessage?.selectedButtonId;
    if (legacyId) { body = legacyId; isButtonTap = true; }
  }

  if (!body) {
    // List row selection
    const rowId = message.message?.listResponseMessage?.singleSelectReply?.selectedRowId;
    if (rowId) { body = rowId; isButtonTap = true; }
  }

  if (!body.trim()) return null;

  const phoneNumber = sender.replace(/[^0-9]/g, "");
  const pushName = message.pushName ?? "";

  const replyText = async (text: string) => {
    await socket.sendMessage(from, { text }, { quoted: message });
  };
  const reply = async (content: any) => {
    await socket.sendMessage(from, content, { quoted: message });
  };
  const sendTyping = async () => {
    await socket.sendPresenceUpdate("composing", from);
  };

  // Admin command detection (! prefix, but not a button tap)
  const isAdminCommand = !isButtonTap && body.startsWith(COMMAND_PREFIX);
  const withoutPrefix = isAdminCommand ? body.slice(COMMAND_PREFIX.length).trim() : "";
  const parts = withoutPrefix.split(/\s+/);
  const command = isAdminCommand ? (parts[0] ?? "").toLowerCase() : "";
  const args = isAdminCommand ? parts.slice(1) : [];

  return {
    socket, from, message, phoneNumber, pushName, isGroup,
    text: body.trim(), isButtonTap, isAdminCommand, command, args,
    rawArgs: args.join(" "),
    replyText, reply, sendTyping,
  };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function handleMessage(socket: any, message: any): Promise<void> {
  if (message.key?.fromMe) return;

  const ctx = buildCtx(socket, message);
  if (!ctx) return;

  // ── Admin commands (! prefix) ─────────────────────────────────────────────
  if (ctx.isAdminCommand) {
    // Special: !clear resets AI memory for this user
    if (ctx.command === "clear") {
      clearHistory(ctx.phoneNumber);
      await ctx.replyText("🧹 Conversation cleared. Let's start fresh!");
      return;
    }

    const cmdDef = pluginRegistry.getCommand(ctx.command);
    if (!cmdDef) {
      if (!ctx.isGroup) {
        await ctx.replyText(`❓ Unknown command: *${COMMAND_PREFIX}${ctx.command}*`);
      }
      return;
    }

    logger.info({ command: ctx.command, phoneNumber: ctx.phoneNumber }, "Admin command received");
    try {
      await ctx.sendTyping();
      await cmdDef.handler(ctx as any);
    } catch (err: any) {
      logger.error({ err, command: ctx.command }, "Command error");
      await ctx.replyText(`❌ Error running *${COMMAND_PREFIX}${ctx.command}*. Please try again.`);
    }
    return;
  }

  // ── AI chat ───────────────────────────────────────────────────────────────
  // Only respond to DMs — ignore group messages unless it's a button tap from the group
  if (ctx.isGroup && !ctx.isButtonTap) return;

  logger.info({ from: ctx.from, phoneNumber: ctx.phoneNumber, isButtonTap: ctx.isButtonTap }, "AI message received");

  const settings = getSettings();

  // Frame button taps as explicit selections so AI understands context
  const prompt = ctx.isButtonTap
    ? `The user tapped the quick reply button: "${ctx.text}". Respond helpfully to this choice.`
    : ctx.text;

  try {
    await ctx.sendTyping();
    const result = await chat({
      phoneNumber: ctx.phoneNumber,
      userMessage: prompt,
      // The dashboard value is authoritative: it controls the bot’s
      // personality, expertise, priorities, and response style.
      systemPrompt: settings.systemPrompt,
    });

    // Offer clarification buttons only for a new message. A button tap already
    // clarifies the user's intent, so its follow-up answer must be plain text.
    // The timeout prevents a slow second AI request from keeping the user
    // waiting indefinitely.
    const chosenLabels = ctx.isButtonTap
      ? []
      : await Promise.race([
          generateQuickReplies(prompt, result.reply),
          new Promise<string[]>((resolve) => setTimeout(() => resolve([]), 8000)),
        ]);
    const buttons = chosenLabels.map((label) => ({ id: label, text: label }));

    try {
      if (buttons.length > 0) {
        // Keep the clarification request and its options together in one card.
        await ctx.reply({ text: result.reply, footer: "FireboxTechs AI", buttons });
      } else {
        await ctx.replyText(result.reply);
      }
    } catch (err) {
      // Never lose the AI answer if a client rejects the interactive payload.
      logger.warn({ err, phoneNumber: ctx.phoneNumber }, "Combined button message failed; sending plain AI answer");
      await ctx.replyText(result.reply);
    }
  } catch (err: any) {
    logger.error({ err, phoneNumber: ctx.phoneNumber }, "AI chat error");
    await ctx.replyText("⚠️ AI is unavailable right now. Please try again in a moment.");
  } finally {
    // Stop the composing indicator once processing finishes or fails.
    await socket.sendPresenceUpdate("paused", ctx.from).catch(() => undefined);
  }
}
