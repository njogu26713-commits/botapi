/**
 * Message handler — dispatches incoming WhatsApp messages to the plugin registry.
 */
import { logger } from "../lib/logger.js";
import { pluginRegistry } from "../plugins/loader.js";
import { COMMAND_PREFIX } from "../commands/registry.js";
import { User } from "../database/models/User.js";
import { isDatabaseConnected } from "../database/index.js";
import type { CommandContext } from "../plugins/types.js";

/**
 * Build a CommandContext from a raw Baileys message.
 */
function buildContext(socket: any, message: any): CommandContext | null {
  const from = message.key?.remoteJid;
  if (!from || from === "status@broadcast") return null;

  const isGroup = from.endsWith("@g.us");
  const sender = isGroup
    ? (message.key?.participant ?? message.key?.remoteJid ?? "")
    : from;

  // Extract plain text from various message types
  let body: string =
    message.message?.conversation ||
    message.message?.extendedTextMessage?.text ||
    message.message?.imageMessage?.caption ||
    message.message?.videoMessage?.caption ||
    message.message?.documentMessage?.caption ||
    "";

  // Native Flow V2 quick-reply button tap → extract the button ID
  if (!body) {
    const nativeFlowParams =
      message.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson;
    if (nativeFlowParams) {
      try {
        const parsed = JSON.parse(nativeFlowParams);
        if (parsed?.id) body = parsed.id;
      } catch {
        /* ignore malformed JSON */
      }
    }
  }

  // Legacy buttonsResponseMessage tap
  if (!body) {
    const legacyId = message.message?.buttonsResponseMessage?.selectedButtonId;
    if (legacyId) body = legacyId;
  }

  // If the extracted ID looks like a bare command (no prefix), prepend it
  if (body && !body.startsWith(COMMAND_PREFIX) && /^[a-z_]+$/.test(body)) {
    body = `${COMMAND_PREFIX}${body}`;
  }

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

  // Detect command
  if (!body.startsWith(COMMAND_PREFIX)) {
    return {
      socket,
      from,
      message,
      text: body,
      command: "",
      args: [],
      rawArgs: body,
      isGroup,
      groupId: isGroup ? from : undefined,
      pushName,
      phoneNumber,
      reply,
      replyText,
      sendTyping,
    };
  }

  const withoutPrefix = body.slice(COMMAND_PREFIX.length).trim();
  const parts = withoutPrefix.split(/\s+/);
  const command = (parts[0] ?? "").toLowerCase();
  const args = parts.slice(1);
  const rawArgs = args.join(" ");

  return {
    socket,
    from,
    message,
    text: body,
    command,
    args,
    rawArgs,
    isGroup,
    groupId: isGroup ? from : undefined,
    pushName,
    phoneNumber,
    reply,
    replyText,
    sendTyping,
  };
}

/**
 * Upsert user record and update stats.
 */
async function touchUser(ctx: CommandContext, isCommand: boolean): Promise<void> {
  if (!isDatabaseConnected()) return; // skip instantly when DB is offline
  try {
    const update: any = {
      $set: { "stats.lastSeen": new Date(), pushName: ctx.pushName },
      $inc: { "stats.totalMessages": 1 },
    };
    if (isCommand) update.$inc["stats.totalCommands"] = 1;

    await User.findOneAndUpdate(
      { phoneNumber: ctx.phoneNumber },
      update,
      { upsert: true, new: true },
    );
  } catch (err) {
    logger.error({ err }, "Failed to upsert user");
  }
}

/**
 * Handle a single incoming message.
 */
export async function handleMessage(socket: any, message: any): Promise<void> {
  // Ignore own messages and status broadcasts
  if (message.key?.fromMe) return;

  const ctx = buildContext(socket, message);
  if (!ctx) return;

  const isCommand = ctx.command !== "";

  // Update user stats in background
  touchUser(ctx, isCommand).catch(() => {});

  if (!isCommand) return; // not a command — ignore for now

  const cmdDef = pluginRegistry.getCommand(ctx.command);
  if (!cmdDef) {
    // Unknown command — silently ignore (avoid noise in groups)
    if (!ctx.isGroup) {
      await ctx.replyText(
        `❓ Unknown command: *${COMMAND_PREFIX}${ctx.command}*\n\nSend *${COMMAND_PREFIX}help* to see all available commands.`,
      );
    }
    return;
  }

  logger.info(
    { from: ctx.from, command: ctx.command, phoneNumber: ctx.phoneNumber },
    "Command received",
  );

  try {
    await ctx.sendTyping();
    await cmdDef.handler(ctx);
  } catch (err: any) {
    logger.error({ err, command: ctx.command }, "Command handler error");
    await ctx.replyText(`❌ An error occurred while running *${COMMAND_PREFIX}${ctx.command}*. Please try again.`);
  }
}
