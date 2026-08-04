/**
 * Sub-menu commands — triggered by Quick Reply button taps from !menu.
 * Each sub-menu shows a focused set of commands for a category.
 */
import type { PluginManifest } from "../plugins/types.js";
import { ctaButtons, buildMenu, nativeFlowMessage } from "../utils/messages.js";
import { config } from "../lib/config.js";

/** Shared footer */
const FOOTER = "FireboxTechs — Empowering your digital experience";

/** Back-to-menu button appended to every sub-menu */
const backButton = { id: "menu", text: "🔙 Back to Menu" };

export const menusPlugin: PluginManifest = {
  name: "menus",
  version: "1.0.0",
  description: "Main menu and sub-menu navigation",
  author: "FireboxTechs",

  commands: [
    // ─── Main Menu ────────────────────────────────────────────────────────────
    {
      name: ["main_menu", "mainmenu"],
      description: "Show the main commands menu",
      category: "general",
      async handler(ctx) {
        await ctx.sendTyping();
        const msg = ctaButtons(
          `📋 *MAIN MENU*\n` +
          `━━━━━━━━━━━━━━━━━━━━\n\n` +
          `🤖 *AI & Chat*\n` +
          `  › !ai — Chat with AI assistant\n` +
          `  › !clear — Reset conversation\n` +
          `  › !history — View chat history\n\n` +
          `🛠️ *Utilities*\n` +
          `  › !weather — Current weather\n` +
          `  › !news — Latest headlines\n` +
          `  › !search — Search the web\n` +
          `  › !calc — Calculator\n` +
          `  › !define — Dictionary\n\n` +
          `👤 *Account*\n` +
          `  › !profile — Your profile & stats\n` +
          `  › !ping — Bot status\n\n` +
          `💡 _Tap a menu below or type a command_`,
          [
            { id: "owner_menu",    text: "👑 Owner Menu" },
            { id: "download_menu", text: "⬇️ Download Menu" },
            { id: "group_menu",    text: "👥 Group Menu" },
            backButton,
          ],
          FOOTER,
          "🔥 FireboxTechs Assistant",
        );
        await ctx.reply(msg);
      },
    },

    // ─── Owner Menu ───────────────────────────────────────────────────────────
    {
      name: ["owner_menu", "ownermenu", "admin"],
      description: "Show owner / admin commands",
      category: "general",
      async handler(ctx) {
        await ctx.sendTyping();
        const msg = ctaButtons(
          `👑 *OWNER MENU*\n` +
          `━━━━━━━━━━━━━━━━━━━━\n\n` +
          `⚙️ *Bot Management*\n` +
          `  › !botinfo — Bot version & system info\n` +
          `  › !ping — Latency & health check\n` +
          `  › !profile — User profile & stats\n\n` +
          `🔥 *FireboxTechs*\n` +
          `  › !about — About FireboxTechs\n` +
          `  › !services — Our services\n` +
          `  › !carousel — Service showcase\n` +
          `  › !contact — Contact & support\n\n` +
          `🤖 *AI Controls*\n` +
          `  › !ai <msg> — Chat with AI\n` +
          `  › !clear — Clear AI context\n\n` +
          `⚠️ _Owner commands are for bot administrators_`,
          [
            { id: "main_menu",     text: "📋 Main Menu" },
            { id: "download_menu", text: "⬇️ Download Menu" },
            { id: "group_menu",    text: "👥 Group Menu" },
            backButton,
          ],
          FOOTER,
          "👑 Owner Panel",
        );
        await ctx.reply(msg);
      },
    },

    // ─── Download Menu ────────────────────────────────────────────────────────
    {
      name: ["download_menu", "downloadmenu", "dl"],
      description: "Show media download commands",
      category: "general",
      async handler(ctx) {
        await ctx.sendTyping();
        const msg = ctaButtons(
          `⬇️ *DOWNLOAD MENU*\n` +
          `━━━━━━━━━━━━━━━━━━━━\n\n` +
          `🎬 *Video & Audio*\n` +
          `  › !yt <url/title> — YouTube video info & links\n` +
          `  › !youtube <url> — Alias for !yt\n\n` +
          `🖼️ *Images & Media*\n` +
          `  › !analyze — AI image analysis\n` +
          `    _(send image with caption !analyze)_\n` +
          `  › !sticker — Convert image to sticker\n` +
          `    _(send image with caption !sticker)_\n\n` +
          `🔧 *Tools*\n` +
          `  › !qr <text/url> — Generate QR code\n` +
          `  › !translate <lang> <text> — Translate text\n\n` +
          `💡 _Example: !yt Never Gonna Give You Up_`,
          [
            { id: "main_menu",  text: "📋 Main Menu" },
            { id: "owner_menu", text: "👑 Owner Menu" },
            { id: "group_menu", text: "👥 Group Menu" },
            backButton,
          ],
          FOOTER,
          "⬇️ Download & Media",
        );
        await ctx.reply(msg);
      },
    },

    // ─── Group Menu ───────────────────────────────────────────────────────────
    {
      name: ["group_menu", "groupmenu", "group"],
      description: "Show group management commands",
      category: "general",
      async handler(ctx) {
        await ctx.sendTyping();
        const msg = ctaButtons(
          `👥 *GROUP MENU*\n` +
          `━━━━━━━━━━━━━━━━━━━━\n\n` +
          `📊 *Information*\n` +
          `  › !ping — Check bot is active in group\n` +
          `  › !botinfo — Bot version & runtime info\n\n` +
          `🤖 *AI in Groups*\n` +
          `  › !ai <question> — Ask the AI assistant\n` +
          `  › !code <query> — Get coding help\n` +
          `  › !explain <code> — Explain code snippet\n\n` +
          `🔒 *Security*\n` +
          `  › !security — Cybersecurity guidance\n` +
          `  › !hash — Cryptography help\n` +
          `  › !owasp — OWASP Top 10\n\n` +
          `⚠️ _Some commands may be restricted in groups_`,
          [
            { id: "main_menu",     text: "📋 Main Menu" },
            { id: "owner_menu",    text: "👑 Owner Menu" },
            { id: "download_menu", text: "⬇️ Download Menu" },
            backButton,
          ],
          FOOTER,
          "👥 Group Commands",
        );
        await ctx.reply(msg);
      },
    },
  ],
};
