/**
 * Cybersecurity learning commands.
 */
import type { PluginManifest } from "../plugins/types.js";
import { chat, complete } from "../services/ai.service.js";
import { listMessage, ctaButtons } from "../utils/messages.js";

const SECURITY_TOPICS = [
  { title: "🔐 OWASP Top 10", description: "Web application security risks", rowId: "owasp" },
  { title: "🛡️ Network Security", description: "Firewalls, IDS, VPN, protocols", rowId: "network" },
  { title: "💉 SQL Injection", description: "Understanding & preventing SQLi", rowId: "sqli" },
  { title: "🎭 Social Engineering", description: "Phishing, vishing, pretexting", rowId: "social_eng" },
  { title: "🔑 Cryptography", description: "Encryption, hashing, PKI", rowId: "crypto" },
  { title: "🕵️ Pen Testing", description: "Penetration testing methodology", rowId: "pentest" },
  { title: "🧬 Malware Analysis", description: "Types, detection, reverse engineering", rowId: "malware" },
  { title: "☁️ Cloud Security", description: "AWS, GCP, Azure security best practices", rowId: "cloud_sec" },
];

export const securityPlugin: PluginManifest = {
  name: "security",
  version: "1.0.0",
  description: "Cybersecurity learning and assistance",
  author: "FireboxTechs",

  commands: [
    {
      name: ["security", "cyber", "hacking"],
      description: "Cybersecurity help and learning",
      usage: "!security <topic or question>",
      category: "security",
      async handler(ctx) {
        if (!ctx.rawArgs) {
          const list = listMessage(
            "🔒 Cybersecurity Learning",
            "Choose a topic to learn about, or ask any security question directly:\n\n_Example:_ `!security How does SQL injection work?`",
            "📚 Browse Topics",
            [{ title: "🎓 Security Topics", rows: SECURITY_TOPICS }],
            "For educational purposes only — always act ethically",
          );
          await ctx.reply(list);
          return;
        }

        await ctx.sendTyping();
        try {
          const result = await chat({
            phoneNumber: ctx.phoneNumber,
            userMessage: ctx.rawArgs,
            systemPromptOverride:
              "You are a cybersecurity expert and educator. Provide accurate, educational information about cybersecurity concepts. " +
              "Always emphasize ethical use and legal compliance. Focus on defense and understanding vulnerabilities to protect systems, not exploit them. " +
              "Include practical examples and real-world applications.",
          });
          await ctx.replyText(result.reply);
        } catch (err: any) {
          await ctx.replyText(`❌ Error: ${err.message}`);
        }
      },
    },

    {
      name: ["pentest", "ctf"],
      description: "Penetration testing methodology help",
      usage: "!pentest <question>",
      category: "security",
      async handler(ctx) {
        if (!ctx.rawArgs) {
          await ctx.replyText(
            "🕵️ *Pen Testing Help*\n\n" +
              "Ask about penetration testing methodology, tools, and techniques.\n\n" +
              "Common tools: Nmap, Metasploit, Burp Suite, Wireshark, Nikto\n\n" +
              "_Usage:_ `!pentest <your question>`\n\n" +
              "⚠️ *Only use on systems you own or have written permission to test.*",
          );
          return;
        }
        await ctx.sendTyping();
        try {
          const result = await chat({
            phoneNumber: ctx.phoneNumber,
            userMessage: ctx.rawArgs,
            systemPromptOverride:
              "You are an ethical hacking expert. Explain penetration testing methodology, tools, and techniques for educational purposes. " +
              "Always emphasize that these should only be used on systems the tester owns or has written authorization to test. " +
              "Cover reconnaissance, scanning, exploitation, post-exploitation, and reporting phases.",
          });
          await ctx.replyText(result.reply);
        } catch (err: any) {
          await ctx.replyText(`❌ Error: ${err.message}`);
        }
      },
    },

    {
      name: ["hash", "encrypt", "decrypt"],
      description: "Learn about cryptographic concepts",
      usage: "!hash <algorithm or question>",
      category: "security",
      async handler(ctx) {
        if (!ctx.rawArgs) {
          await ctx.replyText(
            "🔑 *Cryptography*\n\n" +
              "Ask about:\n• Hash functions (MD5, SHA-256, bcrypt)\n• Symmetric encryption (AES, DES)\n• Asymmetric encryption (RSA, ECC)\n• TLS/SSL, JWT, OAuth\n\n" +
              "_Usage:_ `!hash <your question>`",
          );
          return;
        }
        await ctx.sendTyping();
        try {
          const reply = await complete(
            ctx.rawArgs,
            "You are a cryptography expert. Explain cryptographic concepts clearly, with examples. Cover algorithms, use cases, strengths, and weaknesses.",
          );
          await ctx.replyText(reply || "No response.");
        } catch (err: any) {
          await ctx.replyText(`❌ Error: ${err.message}`);
        }
      },
    },

    {
      name: ["malware", "virus", "ransomware"],
      description: "Learn about malware types and defense",
      usage: "!malware <topic>",
      category: "security",
      async handler(ctx) {
        if (!ctx.rawArgs) {
          const menu = ctaButtons(
            "🧬 *Malware & Threat Intelligence*\n\nLearn about different malware types and how to defend against them.",
            [
              { id: "malware_types", text: "🦠 Types of Malware" },
              { id: "ransomware", text: "💰 Ransomware" },
              { id: "malware_defense", text: "🛡️ Defense Strategies" },
            ],
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
              "You are a malware analyst and threat intelligence expert. Explain malware concepts for educational and defensive purposes. " +
              "Cover types (viruses, trojans, ransomware, spyware), analysis techniques, indicators of compromise, and mitigation strategies.",
          });
          await ctx.replyText(result.reply);
        } catch (err: any) {
          await ctx.replyText(`❌ Error: ${err.message}`);
        }
      },
    },

    {
      name: ["owasp"],
      description: "OWASP Top 10 web vulnerabilities",
      category: "security",
      async handler(ctx) {
        await ctx.sendTyping();
        const reply = await complete(
          "Explain the OWASP Top 10 web application security risks in a concise, structured way. Include the risk name, brief description, and key mitigation for each.",
          "You are a web security expert. Be concise but thorough. Format nicely for WhatsApp.",
        );
        await ctx.replyText(reply || "Could not fetch OWASP info.");
      },
    },
  ],
};
