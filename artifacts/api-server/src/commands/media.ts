/**
 * Media commands: image analysis, QR generation, YouTube, file conversion.
 */
import type { PluginManifest } from "../plugins/types.js";
import { chat } from "../services/ai.service.js";
import { translate, parseLanguage, getLanguageName } from "../services/translation.service.js";
import { ctaButtons, fmt } from "../utils/messages.js";
import { logger } from "../lib/logger.js";

export const mediaPlugin: PluginManifest = {
  name: "media",
  version: "1.0.0",
  description: "Media processing: image analysis, QR codes, translation, YouTube",
  author: "FireboxTechs",

  commands: [
    // ─── Image Analysis ───────────────────────────────────────────────────
    {
      name: ["analyze", "describe", "img"],
      description: "AI analysis of an image (send image with caption !analyze)",
      usage: "Send an image with caption !analyze [question]",
      category: "ai",
      async handler(ctx) {
        await ctx.sendTyping();

        // Check if the message has an image
        const msg = ctx.message;
        const imageMsg =
          msg?.message?.imageMessage ||
          msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;

        if (!imageMsg) {
          await ctx.replyText(
            "🖼️ *Image Analysis*\n\nTo analyze an image:\n1. Send an image\n2. Add caption: `!analyze` or `!analyze <specific question>`\n\nOr reply to an image with `!analyze`",
          );
          return;
        }

        try {
          // Download image
          const { downloadMediaMessage } = await import("@itsliaaa/baileys") as any;
          const buffer: Buffer = await downloadMediaMessage(msg, "buffer", {});
          const base64 = buffer.toString("base64");
          const mimeType = imageMsg.mimetype || "image/jpeg";

          const question = ctx.rawArgs || "Describe this image in detail.";
          const result = await chat({
            phoneNumber: ctx.phoneNumber,
            userMessage: question,
            imageBase64: base64,
            imageMimeType: mimeType,
          });

          await ctx.replyText(`🔍 *Image Analysis*\n\n${result.reply}`);
        } catch (err: any) {
          logger.error({ err }, "Image analysis error");
          await ctx.replyText(`❌ Image analysis failed: ${err.message}`);
        }
      },
    },

    // ─── QR Code Generation ───────────────────────────────────────────────
    {
      name: ["qr", "qrcode"],
      description: "Generate a QR code from text or URL",
      usage: "!qr <text or URL>",
      category: "utilities",
      async handler(ctx) {
        if (!ctx.rawArgs) {
          await ctx.replyText("_Usage:_ `!qr <text or URL>`\n_Example:_ `!qr https://fireboxtechs.com`");
          return;
        }
        await ctx.sendTyping();
        try {
          const QRCode = await import("qrcode");
          const buffer = await QRCode.default.toBuffer(ctx.rawArgs, {
            width: 400,
            margin: 2,
            color: { dark: "#000000", light: "#ffffff" },
          });

          await ctx.reply({
            image: buffer,
            caption: `✅ QR Code generated for:\n${ctx.rawArgs}`,
            mimetype: "image/png",
          });
        } catch (err: any) {
          await ctx.replyText(`❌ QR code error: ${err.message}`);
        }
      },
    },

    // ─── Translation ──────────────────────────────────────────────────────
    {
      name: ["translate", "tr"],
      description: "Translate text to any language",
      usage: "!translate <lang> <text>  OR  !translate <text> to <lang>",
      category: "utilities",
      async handler(ctx) {
        if (!ctx.rawArgs) {
          await ctx.replyText(
            "🌍 *Translation*\n\n" +
              "_Usage:_\n" +
              "`!translate french Hello world`\n" +
              "`!translate Hello world to Spanish`\n" +
              "`!translate fr Hello world`\n\n" +
              "Supports 25+ languages!",
          );
          return;
        }

        await ctx.sendTyping();

        let targetLang: string | null = null;
        let textToTranslate = ctx.rawArgs;

        // Pattern: "!translate <lang> <text>"
        const firstWord = ctx.args[0]?.toLowerCase() ?? "";
        const langFromFirst = parseLanguage(firstWord);
        if (langFromFirst) {
          targetLang = langFromFirst;
          textToTranslate = ctx.args.slice(1).join(" ");
        } else {
          // Pattern: "<text> to <lang>"
          const toIndex = ctx.args.findLastIndex((a) => a.toLowerCase() === "to");
          if (toIndex > 0) {
            const langWord = ctx.args.slice(toIndex + 1).join(" ");
            targetLang = parseLanguage(langWord);
            if (targetLang) {
              textToTranslate = ctx.args.slice(0, toIndex).join(" ");
            }
          }
        }

        if (!targetLang) {
          await ctx.replyText("❌ Could not identify target language. Try: `!translate french <text>`");
          return;
        }

        if (!textToTranslate.trim()) {
          await ctx.replyText("❌ No text to translate. Usage: `!translate french Hello world`");
          return;
        }

        try {
          const result = await translate(textToTranslate, targetLang);
          const langName = getLanguageName(targetLang);
          const detected = getLanguageName(result.detectedLanguage);

          await ctx.replyText(
            `🌍 *Translation*\n\n` +
              `📝 Original (${detected}):\n${result.originalText}\n\n` +
              `✅ ${langName}:\n${fmt.bold(result.translatedText)}`,
          );
        } catch (err: any) {
          await ctx.replyText(`❌ Translation failed: ${err.message}`);
        }
      },
    },

    // ─── YouTube ─────────────────────────────────────────────────────────
    {
      name: ["yt", "youtube", "ytdl"],
      description: "Get YouTube video info (download links)",
      usage: "!yt <YouTube URL>",
      category: "media",
      async handler(ctx) {
        if (!ctx.rawArgs) {
          await ctx.replyText(
            "🎬 *YouTube Helper*\n\n_Usage:_ `!yt <YouTube URL>`\n\n_Example:_ `!yt https://youtube.com/watch?v=dQw4w9WgXcQ`\n\n_Note:_ This feature requires yt-dlp to be installed on the server.",
          );
          return;
        }
        await ctx.sendTyping();
        try {
          const { isYouTubeUrl } = await import("../utils/validators.js");
          if (!isYouTubeUrl(ctx.rawArgs)) {
            await ctx.replyText("❌ Please provide a valid YouTube URL.");
            return;
          }

          const { execFile } = await import("node:child_process");
          const { promisify } = await import("node:util");
          const execFileAsync = promisify(execFile);

          const { stdout } = await execFileAsync("yt-dlp", [
            "--dump-json",
            "--no-playlist",
            ctx.rawArgs,
          ]);

          const info = JSON.parse(stdout);
          const duration = Math.floor(info.duration / 60);
          const secs = info.duration % 60;

          const msg = ctaButtons(
            `🎬 *${info.title}*\n\n` +
              `👤 ${info.uploader}\n` +
              `⏱️ ${duration}:${String(secs).padStart(2, "0")}\n` +
              `👁️ ${(info.view_count ?? 0).toLocaleString()} views\n` +
              `📅 ${info.upload_date}\n\n` +
              `🔗 ${ctx.rawArgs}`,
            [
              { id: `yt_audio_${ctx.rawArgs}`, text: "🎵 Audio Only" },
              { id: `yt_video_${ctx.rawArgs}`, text: "🎬 Video (360p)" },
            ],
            "Download options",
          );

          await ctx.reply(msg);
        } catch (err: any) {
          if (err.message?.includes("yt-dlp")) {
            await ctx.replyText(
              "❌ yt-dlp is not installed on the server. Ask the admin to install it with: `pip install yt-dlp`",
            );
          } else {
            await ctx.replyText(`❌ YouTube error: ${err.message}`);
          }
        }
      },
    },

    // ─── Sticker ─────────────────────────────────────────────────────────
    {
      name: ["sticker", "s"],
      description: "Convert an image to a sticker",
      usage: "Send image with caption !sticker",
      category: "media",
      async handler(ctx) {
        await ctx.sendTyping();
        const msg = ctx.message;
        const imageMsg = msg?.message?.imageMessage;

        if (!imageMsg) {
          await ctx.replyText(
            "🎨 *Sticker Maker*\n\nSend an image with the caption `!sticker` to convert it to a sticker.",
          );
          return;
        }

        try {
          const { downloadMediaMessage } = await import("@itsliaaa/baileys") as any;
          const buffer: Buffer = await downloadMediaMessage(msg, "buffer", {});

          const sharp = await import("sharp");
          const stickerBuffer = await sharp.default(buffer)
            .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .webp()
            .toBuffer();

          await ctx.reply({ sticker: stickerBuffer, mimetype: "image/webp" });
        } catch (err: any) {
          await ctx.replyText(`❌ Sticker error: ${err.message}`);
        }
      },
    },
  ],
};
