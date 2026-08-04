/**
 * Utility commands: weather, news, search, calculator, reminders, unit converter.
 */
import type { PluginManifest } from "../plugins/types.js";
import { getWeather, formatWeather } from "../services/weather.service.js";
import {
  search,
  searchNews,
  formatSearchResults,
  formatNewsResults,
} from "../services/search.service.js";
import { fmt, ctaButtons } from "../utils/messages.js";
import { complete } from "../services/ai.service.js";
import { logger } from "../lib/logger.js";

export const utilitiesPlugin: PluginManifest = {
  name: "utilities",
  version: "1.0.0",
  description: "Useful everyday utility commands",
  author: "FireboxTechs",

  commands: [
    // ─── Weather ─────────────────────────────────────────────────────────────
    {
      name: ["weather", "w", "forecast"],
      description: "Get current weather for any city",
      usage: "!weather <city>",
      category: "utilities",
      async handler(ctx) {
        if (!ctx.rawArgs) {
          await ctx.replyText(
            "🌤️ *Weather*\n\n_Usage:_ `!weather <city name>`\n\n_Examples:_\n`!weather Lagos`\n`!weather New York`\n`!weather London`",
          );
          return;
        }

        await ctx.sendTyping();
        try {
          const data = await getWeather(ctx.rawArgs);
          await ctx.replyText(formatWeather(data));
        } catch (err: any) {
          await ctx.replyText(`❌ Weather error: ${err.message}`);
        }
      },
    },

    // ─── News ────────────────────────────────────────────────────────────────
    {
      name: ["news", "headlines"],
      description: "Search and browse latest news",
      usage: "!news <topic>",
      category: "utilities",
      async handler(ctx) {
        if (!ctx.rawArgs) {
          await ctx.replyText(
            "📰 *Latest News*\n\n_Usage:_ `!news <topic>`\n\n_Examples:_\n`!news technology`\n`!news Nigeria`\n`!news AI artificial intelligence`",
          );
          return;
        }

        await ctx.sendTyping();
        try {
          const results = await searchNews(ctx.rawArgs, 5);
          await ctx.replyText(formatNewsResults(results));
        } catch (err: any) {
          await ctx.replyText(`❌ News error: ${err.message}`);
        }
      },
    },

    // ─── Search ──────────────────────────────────────────────────────────────
    {
      name: ["search", "google", "find"],
      description: "Search the web for any topic",
      usage: "!search <query>",
      category: "utilities",
      async handler(ctx) {
        if (!ctx.rawArgs) {
          await ctx.replyText(
            "🔍 *Web Search*\n\n_Usage:_ `!search <your query>`\n\n_Example:_ `!search best Python frameworks 2024`",
          );
          return;
        }

        await ctx.sendTyping();
        try {
          const results = await search(ctx.rawArgs, 5);
          await ctx.replyText(formatSearchResults(results, ctx.rawArgs));
        } catch (err: any) {
          await ctx.replyText(`❌ Search error: ${err.message}`);
        }
      },
    },

    // ─── Calculator ──────────────────────────────────────────────────────────
    {
      name: ["calc", "calculate", "math"],
      description: "Evaluate a mathematical expression",
      usage: "!calc <expression>",
      category: "utilities",
      async handler(ctx) {
        if (!ctx.rawArgs) {
          await ctx.replyText(
            "🧮 *Calculator*\n\n_Usage:_ `!calc <expression>`\n\n_Examples:_\n`!calc 25 * 4 + 100`\n`!calc sqrt(144)`\n`!calc (15% of 200)`",
          );
          return;
        }

        await ctx.sendTyping();
        try {
          // Use AI to safely evaluate expressions including word problems
          const reply = await complete(
            `Evaluate this mathematical expression or calculation and return ONLY the numerical result with a brief label. Do not explain:\n${ctx.rawArgs}`,
            "You are a calculator. Return only the result. No explanation. No markdown. Just: Expression = Result",
          );
          await ctx.replyText(`🧮 *Calculator*\n\n${reply}`);
        } catch (err: any) {
          await ctx.replyText(`❌ Calculation error: ${err.message}`);
        }
      },
    },

    // ─── Unit Converter ──────────────────────────────────────────────────────
    {
      name: ["convert", "unit"],
      description: "Convert between units (length, weight, temperature, etc.)",
      usage: "!convert <value> <from> to <to>",
      category: "utilities",
      async handler(ctx) {
        if (!ctx.rawArgs) {
          await ctx.replyText(
            "⚖️ *Unit Converter*\n\n_Usage:_ `!convert <value> <unit> to <unit>`\n\n_Examples:_\n`!convert 100 km to miles`\n`!convert 25 celsius to fahrenheit`\n`!convert 5 kg to pounds`\n`!convert 1 USD to NGN`",
          );
          return;
        }

        await ctx.sendTyping();
        try {
          const reply = await complete(
            `Convert the following and return ONLY the result:\n${ctx.rawArgs}`,
            "You are a precise unit converter. Return only the answer in this format: 'X unit = Y unit'. No explanation. No markdown.",
          );
          await ctx.replyText(`⚖️ *Conversion*\n\n${reply}`);
        } catch (err: any) {
          await ctx.replyText(`❌ Conversion error: ${err.message}`);
        }
      },
    },

    // ─── Dictionary ──────────────────────────────────────────────────────────
    {
      name: ["define", "dict", "meaning"],
      description: "Look up the definition of a word",
      usage: "!define <word>",
      category: "utilities",
      async handler(ctx) {
        if (!ctx.rawArgs) {
          await ctx.replyText("_Usage:_ `!define <word>`\n\n_Example:_ `!define serendipity`");
          return;
        }

        await ctx.sendTyping();
        try {
          const word = ctx.rawArgs.trim().split(/\s+/)[0]!;
          const reply = await complete(
            `Define the word: "${word}"`,
            "You are a dictionary. Provide: 1) Part of speech 2) Definition 3) Example sentence 4) Synonyms. Format neatly for WhatsApp. Use emojis sparingly.",
          );
          await ctx.replyText(`📖 *${fmt.bold(word)}*\n\n${reply}`);
        } catch (err: any) {
          await ctx.replyText(`❌ Dictionary error: ${err.message}`);
        }
      },
    },

    // ─── Remind ──────────────────────────────────────────────────────────────
    {
      name: ["remind", "reminder"],
      description: "Set a reminder (e.g. !remind 30m Call John)",
      usage: "!remind <time> <message>  e.g. !remind 1h Buy groceries",
      category: "utilities",
      async handler(ctx) {
        if (!ctx.rawArgs) {
          await ctx.replyText(
            "⏰ *Reminders*\n\n_Usage:_ `!remind <time> <message>`\n\n_Time formats:_\n`30s` → 30 seconds\n`5m` → 5 minutes\n`2h` → 2 hours\n`1d` → 1 day\n\n_Examples:_\n`!remind 30m Take medicine`\n`!remind 2h Review the report`",
          );
          return;
        }

        await ctx.sendTyping();

        const match = ctx.rawArgs.match(/^(\d+)(s|m|h|d)\s+(.+)$/i);
        if (!match) {
          await ctx.replyText(
            "❌ Invalid format. Use: `!remind <time> <message>`\n\n_Example:_ `!remind 30m Take medicine`",
          );
          return;
        }

        const amount = parseInt(match[1]!, 10);
        const unit = match[2]!.toLowerCase();
        const reminderText = match[3]!;

        const msMap: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
        const delayMs = amount * (msMap[unit] ?? 60_000);

        const unitLabels: Record<string, string> = { s: "second", m: "minute", h: "hour", d: "day" };
        const label = `${amount} ${unitLabels[unit] ?? "minute"}${amount !== 1 ? "s" : ""}`;

        await ctx.replyText(
          `⏰ *Reminder set!*\n\nI'll remind you in *${label}*:\n\n_${reminderText}_`,
        );

        // Schedule the reminder (in-memory — fires once)
        setTimeout(async () => {
          try {
            await ctx.replyText(`🔔 *Reminder!*\n\n${reminderText}`);
          } catch (err) {
            logger.error({ err }, "Failed to send reminder");
          }
        }, delayMs);
      },
    },

    // ─── Summarize ───────────────────────────────────────────────────────────
    {
      name: ["summarize", "tldr", "summary"],
      description: "Summarize a long text",
      usage: "!summarize <text>",
      category: "utilities",
      async handler(ctx) {
        if (!ctx.rawArgs || ctx.rawArgs.length < 50) {
          await ctx.replyText(
            "📝 *Text Summarizer*\n\n_Usage:_ `!summarize <your long text>`\n\nPaste any article, paragraph, or text and I'll give you a concise summary.",
          );
          return;
        }

        await ctx.sendTyping();
        try {
          const reply = await complete(
            ctx.rawArgs,
            "You are a summarization expert. Provide a concise, clear summary in 3-5 bullet points. Use emojis for each bullet. Format neatly for WhatsApp.",
          );
          await ctx.replyText(`📝 *Summary*\n\n${reply}`);
        } catch (err: any) {
          await ctx.replyText(`❌ Summarization error: ${err.message}`);
        }
      },
    },

    // ─── Random ──────────────────────────────────────────────────────────────
    {
      name: ["random", "rand", "pick"],
      description: "Pick a random item from a list, or generate a random number",
      usage: "!random <item1, item2, ...>  OR  !random <min>-<max>",
      category: "utilities",
      async handler(ctx) {
        if (!ctx.rawArgs) {
          await ctx.replyText(
            "🎲 *Random Picker*\n\n_Usage:_\n`!random Pizza, Burger, Sushi` → picks one\n`!random 1-100` → random number\n`!random yes, no` → coin flip",
          );
          return;
        }

        await ctx.sendTyping();

        // Range mode: "1-100"
        const rangeMatch = ctx.rawArgs.match(/^(\d+)\s*[-–]\s*(\d+)$/);
        if (rangeMatch) {
          const min = parseInt(rangeMatch[1]!, 10);
          const max = parseInt(rangeMatch[2]!, 10);
          if (min >= max) {
            await ctx.replyText("❌ Min must be less than max.");
            return;
          }
          const result = Math.floor(Math.random() * (max - min + 1)) + min;
          await ctx.replyText(`🎲 *Random number (${min}–${max}):* ${fmt.bold(String(result))}`);
          return;
        }

        // List mode: "Pizza, Burger, Sushi"
        const items = ctx.rawArgs.split(/[,،]/).map((s) => s.trim()).filter(Boolean);
        if (items.length < 2) {
          await ctx.replyText("❌ Please provide at least 2 items separated by commas.\n\n_Example:_ `!random Pizza, Burger, Sushi`");
          return;
        }
        const picked = items[Math.floor(Math.random() * items.length)]!;
        await ctx.replyText(
          `🎲 *Random Pick*\n\nFrom: ${items.join(", ")}\n\n✅ Result: *${picked}*`,
        );
      },
    },
  ],
};
