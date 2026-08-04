/**
 * Programming & debugging help commands.
 */
import type { PluginManifest } from "../plugins/types.js";
import { chat, complete } from "../services/ai.service.js";
import { fmt, ctaButtons } from "../utils/messages.js";

export const programmingPlugin: PluginManifest = {
  name: "programming",
  version: "1.0.0",
  description: "Programming, debugging, and development help",
  author: "FireboxTechs",

  commands: [
    {
      name: ["code", "debug", "fix"],
      description: "Get AI help with code debugging",
      usage: "!code <description or paste code>",
      category: "programming",
      async handler(ctx) {
        if (!ctx.rawArgs) {
          await ctx.replyText(
            "💻 *Code Debugger*\n\n" +
              "Paste your code or describe your problem.\n\n" +
              "_Usage:_ `!code <your code or problem>`\n\n" +
              "_Example:_ `!code My Python function isn't returning the correct value`",
          );
          return;
        }

        await ctx.sendTyping();
        try {
          const result = await chat({
            phoneNumber: ctx.phoneNumber,
            userMessage: ctx.rawArgs,
            systemPromptOverride:
              "You are an expert programming assistant. Help debug, fix, and explain code. " +
              "Format code blocks using triple backticks. Be concise and practical. " +
              "If given code, identify bugs and provide corrected version with explanation.",
          });
          await ctx.replyText(result.reply);
        } catch (err: any) {
          await ctx.replyText(`❌ Error: ${err.message}`);
        }
      },
    },

    {
      name: ["explain", "howto"],
      description: "Explain code or a programming concept",
      usage: "!explain <code or concept>",
      category: "programming",
      async handler(ctx) {
        if (!ctx.rawArgs) {
          await ctx.replyText("_Usage:_ `!explain <code or concept>`");
          return;
        }
        await ctx.sendTyping();
        try {
          const result = await chat({
            phoneNumber: ctx.phoneNumber,
            userMessage: `Please explain this clearly and concisely: ${ctx.rawArgs}`,
            systemPromptOverride:
              "You are a patient programming teacher. Explain concepts clearly with examples. " +
              "Use simple language. Format code with backticks.",
          });
          await ctx.replyText(result.reply);
        } catch (err: any) {
          await ctx.replyText(`❌ Error: ${err.message}`);
        }
      },
    },

    {
      name: ["generate", "gen", "write"],
      description: "Generate code for a specific task",
      usage: "!generate <what you need>",
      category: "programming",
      async handler(ctx) {
        if (!ctx.rawArgs) {
          await ctx.replyText("_Usage:_ `!generate <description of what to build>`\n\n_Example:_ `!generate a REST API endpoint in Node.js for user authentication`");
          return;
        }
        await ctx.sendTyping();
        try {
          const result = await chat({
            phoneNumber: ctx.phoneNumber,
            userMessage: `Generate production-ready code for: ${ctx.rawArgs}`,
            systemPromptOverride:
              "You are an expert software engineer. Write clean, production-ready code. " +
              "Include comments. Handle errors. Follow best practices. Format with code blocks.",
          });
          await ctx.replyText(result.reply);
        } catch (err: any) {
          await ctx.replyText(`❌ Error: ${err.message}`);
        }
      },
    },

    {
      name: ["regex", "regexp"],
      description: "Generate or explain regular expressions",
      usage: "!regex <description or pattern>",
      category: "programming",
      async handler(ctx) {
        if (!ctx.rawArgs) {
          await ctx.replyText("_Usage:_ `!regex <what you want to match>`\n\n_Example:_ `!regex valid email addresses`");
          return;
        }
        await ctx.sendTyping();
        try {
          const prompt = `For this request: "${ctx.rawArgs}"\n\nProvide:\n1. The regex pattern\n2. What it matches\n3. Example usage in JavaScript\n4. Edge cases to watch out for`;
          const reply = await complete(
            prompt,
            "You are a regex expert. Provide precise, working regular expressions with clear explanations.",
          );
          await ctx.replyText(reply || "Could not generate regex.");
        } catch (err: any) {
          await ctx.replyText(`❌ Error: ${err.message}`);
        }
      },
    },

    {
      name: ["devhelp", "webdev", "appdev"],
      description: "Website and app development assistance",
      usage: "!devhelp <your question>",
      category: "programming",
      async handler(ctx) {
        if (!ctx.rawArgs) {
          const menu = ctaButtons(
            "🌐 *Web & App Development Help*\n\nI can help with:\n• HTML, CSS, JavaScript\n• React, Vue, Angular\n• Node.js, Python, PHP\n• REST APIs & GraphQL\n• Database design\n• Deployment & DevOps",
            [
              { id: "frontend", text: "🎨 Frontend" },
              { id: "backend", text: "⚙️ Backend" },
              { id: "database", text: "🗄️ Database" },
            ],
            "Just type !devhelp <your question>",
          );
          await ctx.reply(menu);
          return;
        }
        await ctx.sendTyping();
        try {
          const result = await chat({
            phoneNumber: ctx.phoneNumber,
            userMessage: ctx.rawArgs,
            systemPromptOverride:
              "You are a full-stack web and app development expert. Provide practical, production-ready guidance. " +
              "Cover frontend (React, Vue), backend (Node.js, Python), databases, and deployment. " +
              "Share code examples when helpful.",
          });
          await ctx.replyText(result.reply);
        } catch (err: any) {
          await ctx.replyText(`❌ Error: ${err.message}`);
        }
      },
    },

    {
      name: ["sql"],
      description: "SQL query help and generation",
      usage: "!sql <your question or schema>",
      category: "programming",
      async handler(ctx) {
        if (!ctx.rawArgs) {
          await ctx.replyText("_Usage:_ `!sql <describe your query need>`\n\n_Example:_ `!sql Get all users who registered in the last 30 days with their order count`");
          return;
        }
        await ctx.sendTyping();
        try {
          const reply = await complete(
            ctx.rawArgs,
            "You are a SQL expert. Generate efficient, optimized SQL queries. Explain what the query does. Support MySQL, PostgreSQL, and SQLite variations.",
          );
          await ctx.replyText(reply || "Could not generate SQL.");
        } catch (err: any) {
          await ctx.replyText(`❌ Error: ${err.message}`);
        }
      },
    },
  ],
};
