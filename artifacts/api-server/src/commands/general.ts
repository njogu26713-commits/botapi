/**
 * General purpose commands: help, start, ai, clear, info.
 */
import type { PluginManifest } from "../plugins/types.js";
import { chat, clearConversation, getConversationHistory } from "../services/ai.service.js";
import { pluginRegistry } from "../plugins/loader.js";
import { User } from "../database/models/User.js";
import {
  ctaButtons,
  listMessage,
  buildMenu,
  fmt,
} from "../utils/messages.js";

/** Wrap an AI reply in quick-reply buttons for common follow-up actions. */
function aiReplyWithButtons(replyText: string): any {
  return ctaButtons(
    replyText,
    [
      { id: "ai_followup", text: "💬 Ask again" },
      { id: "clear",       text: "🗑️ Clear chat" },
      { id: "history",     text: "📜 History" },
    ],
    "Reply with !ai <message> • !clear to reset",
  );
}
import { formatDate } from "../utils/format.js";
import { config } from "../lib/config.js";

export const generalPlugin: PluginManifest = {
  name: "general",
  version: "1.0.0",
  description: "Core general-purpose commands",
  author: "FireboxTechs",

  commands: [
    // ─── Start / Welcome ──────────────────────────────────────────────────
    {
      name: ["start", "hi", "hello", "hey"],
      description: "Welcome message and main menu",
      category: "general",
      async handler(ctx) {
        await ctx.sendTyping();
        const name = ctx.pushName || "there";

        const msg = ctaButtons(
          `👋 Hello, *${name}*!\n\nI'm *FireboxTechs Assistant* — your AI-powered companion. I can help you with programming, cybersecurity, image analysis, file conversion, weather, news, and much more.\n\nTap a button below or send *!help* to see all commands.`,
          [
            { id: "help", text: "📋 All Commands" },
            { id: "ai_chat", text: "🤖 Chat with AI" },
            { id: "firebox_services", text: "🔥 Our Services" },
          ],
          "FireboxTechs — Empowering your digital experience",
          "🔥 FireboxTechs Assistant",
        );

        await ctx.reply(msg);
      },
    },

    // ─── Help ──────────────────────────────────────────────────────────────
    {
      name: ["help", "commands", "menu"],
      description: "Show all available commands",
      category: "general",
      async handler(ctx) {
        await ctx.sendTyping();
        const grouped = pluginRegistry.getCommandsByCategory();

        const categoryEmojis: Record<string, string> = {
          general: "⚙️", ai: "🤖", programming: "💻", security: "🔒",
          media: "🎬", utilities: "🛠️", firebox: "🔥", admin: "👑",
        };

        const sections = Object.entries(grouped)
          .filter(([cat]) => cat !== "admin")
          .map(([cat, cmds]) => ({
            title: `${categoryEmojis[cat] ?? "•"} ${cat.charAt(0).toUpperCase() + cat.slice(1)}`,
            rows: cmds.slice(0, 10).map((c) => {
              const name = Array.isArray(c.name) ? c.name[0]! : c.name;
              return {
                rowId: `!${name}`,
                title: `!${name}`,
                description: c.description,
              };
            }),
          }));

        const list = listMessage(
          "🔥 FireboxTechs Assistant",
          `Here are all available commands (prefix: *!*)\n\nSelect a command to learn more, or just type it directly.`,
          "📋 View Commands",
          sections,
          "FireboxTechs — Empowering your digital experience",
        );

        await ctx.reply(list);
      },
    },

    // ─── AI Chat ───────────────────────────────────────────────────────────
    {
      name: ["ai", "ask", "chat", "gpt"],
      description: "Chat with AI assistant",
      usage: "!ai <your question>",
      category: "ai",
      async handler(ctx) {
        if (!ctx.rawArgs) {
          await ctx.replyText(
            "💬 *AI Chat*\n\nSend me a message and I'll respond with AI!\n\n" +
              "_Usage:_ `!ai <your question>`\n\n" +
              "_Example:_ `!ai Explain quantum computing`",
          );
          return;
        }

        await ctx.sendTyping();
        try {
          const result = await chat({
            phoneNumber: ctx.phoneNumber,
            userMessage: ctx.rawArgs,
          });
          await ctx.reply(aiReplyWithButtons(result.reply));
        } catch (err: any) {
          await ctx.reply(
            aiReplyWithButtons(`❌ AI Error: ${err.message}`),
          );
        }
      },
    },

    // ─── Clear context ─────────────────────────────────────────────────────
    {
      name: ["clear", "reset", "newchat"],
      description: "Clear AI conversation history",
      category: "ai",
      async handler(ctx) {
        await clearConversation(ctx.phoneNumber);
        await ctx.replyText(
          "🗑️ *Conversation cleared!*\n\nStarting fresh. How can I help you today?",
        );
      },
    },

    // ─── History ───────────────────────────────────────────────────────────
    {
      name: ["history"],
      description: "View your recent conversation history",
      category: "ai",
      async handler(ctx) {
        await ctx.sendTyping();
        const history = await getConversationHistory(ctx.phoneNumber, 6);
        if (!history.length) {
          await ctx.replyText("📭 No conversation history yet. Send *!ai <message>* to start chatting!");
          return;
        }

        let msg = "📜 *Recent Conversation*\n\n";
        for (const m of history) {
          const role = m.role === "user" ? "👤 You" : "🤖 Assistant";
          msg += `${fmt.bold(role)}:\n${m.content.slice(0, 200)}${m.content.length > 200 ? "..." : ""}\n\n`;
        }
        await ctx.replyText(msg.trim());
      },
    },

    // ─── Profile ───────────────────────────────────────────────────────────
    {
      name: ["profile", "me", "stats"],
      description: "View your profile and usage statistics",
      category: "general",
      async handler(ctx) {
        await ctx.sendTyping();
        const user = await User.findOne({ phoneNumber: ctx.phoneNumber });

        if (!user) {
          await ctx.replyText("🔍 Profile not found. Send any message first to create one.");
          return;
        }

        const tier = user.isPremium ? "⭐ Premium" : user.isAdmin ? "👑 Admin" : "🆓 Free";
        const msg =
          `👤 *Your Profile*\n\n` +
          `📱 Phone: ${ctx.phoneNumber}\n` +
          `🏷️ Name: ${user.pushName || user.name || "Unknown"}\n` +
          `🎯 Tier: ${tier}\n` +
          `📅 Member since: ${formatDate(user.createdAt)}\n\n` +
          `📊 *Usage Stats*\n` +
          `💬 Total messages: ${user.stats.totalMessages}\n` +
          `⚡ Commands used: ${user.stats.totalCommands}\n` +
          `🤖 AI requests: ${user.stats.totalAiRequests}\n` +
          `👁️ Last seen: ${formatDate(user.stats.lastSeen)}`;

        await ctx.replyText(msg);
      },
    },

    // ─── Ping ─────────────────────────────────────────────────────────────
    {
      name: ["ping", "status"],
      description: "Check bot status and latency",
      category: "general",
      async handler(ctx) {
        const start = Date.now();
        await ctx.sendTyping();
        const latency = Date.now() - start;
        await ctx.replyText(
          `🏓 *Pong!*\n\n` +
            `✅ Bot is online\n` +
            `⚡ Latency: ${latency}ms\n` +
            `🤖 AI: ${config.aiEnabled ? "✅ Enabled" : "❌ Disabled"}\n` +
            `🌐 Node.js: ${process.version}`,
        );
      },
    },
  ],
};
