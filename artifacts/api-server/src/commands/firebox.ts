/**
 * FireboxTechs-specific commands: branding, services, referrals, contact.
 */
import type { PluginManifest } from "../plugins/types.js";
import { ctaButtons, listMessage, carouselMessage, fmt } from "../utils/messages.js";
import type { CarouselCard } from "../utils/messages.js";
import { config } from "../lib/config.js";

const SERVICES: CarouselCard[] = [
  {
    header: {},
    body: `🎬 *CineVault*\n\nStream and discover movies and TV shows.`,
    footer: "cinevault.firebox.live",
    buttons: [
      { type: "cta_url",    displayText: "🎬 Open Service", url: "https://cinevault.firebox.live" },
      { type: "quick_reply", displayText: "ℹ️ Learn More",  id: "learn_cinevault" },
    ],
  },
  {
    header: {},
    body: `🌍 *BConnect*\n\nMarketplace, businesses, housing, jobs, and community platform.`,
    footer: "bconnect.firebox.live",
    buttons: [
      { type: "cta_url",    displayText: "🌍 Open Service", url: "https://bconnect.firebox.live" },
      { type: "quick_reply", displayText: "ℹ️ Learn More",  id: "learn_bconnect" },
    ],
  },
  {
    header: {},
    body: `💻 *CodeLab*\n\nLearn programming with AI-powered lessons and coding challenges.`,
    footer: "codelab.firebox.live",
    buttons: [
      { type: "cta_url",    displayText: "💻 Open Service", url: "https://codelab.firebox.live" },
      { type: "quick_reply", displayText: "ℹ️ Learn More",  id: "learn_codelab" },
    ],
  },
  {
    header: {},
    body: `🛡️ *Cyber Academy*\n\nLearn ethical hacking, cybersecurity, networking, and digital safety.`,
    footer: "cyberacademy.firebox.live",
    buttons: [
      { type: "cta_url",    displayText: "🛡️ Open Service", url: "https://cyberacademy.firebox.live" },
      { type: "quick_reply", displayText: "ℹ️ Learn More",  id: "learn_cyberacademy" },
    ],
  },
  {
    header: {},
    body: `🤖 *Firebox AI*\n\nAI assistant for coding, research, writing, and productivity.`,
    footer: "ai.firebox.live",
    buttons: [
      { type: "cta_url",    displayText: "🤖 Open Service", url: "https://ai.firebox.live" },
      { type: "quick_reply", displayText: "ℹ️ Learn More",  id: "learn_fireboxai" },
    ],
  },
  {
    header: {},
    body: `🚀 *Firebox Deploy*\n\nDeploy and manage your applications and websites.`,
    footer: "deploy.firebox.live",
    buttons: [
      { type: "cta_url",    displayText: "🚀 Open Service", url: "https://deploy.firebox.live" },
      { type: "quick_reply", displayText: "ℹ️ Learn More",  id: "learn_deploy" },
    ],
  },
  {
    header: {},
    body: `📇 *VCF Generator*\n\nGenerate and share contact cards instantly.`,
    footer: "vcf.firebox.live",
    buttons: [
      { type: "cta_url",    displayText: "📇 Open Service", url: "https://vcf.firebox.live" },
      { type: "quick_reply", displayText: "ℹ️ Learn More",  id: "learn_vcf" },
    ],
  },
  {
    header: {},
    body: `🌐 *FireboxTechs*\n\nExplore all FireboxTechs products, services, and updates.`,
    footer: "firebox.live",
    buttons: [
      { type: "cta_url",    displayText: "🌐 Open Website", url: "https://firebox.live" },
      { type: "quick_reply", displayText: "ℹ️ Learn More",  id: "learn_firebox" },
    ],
  },
];

export const fireboxPlugin: PluginManifest = {
  name: "firebox",
  version: "1.0.0",
  description: "FireboxTechs branding, services, and support commands",
  author: "FireboxTechs",

  commands: [
    // ─── Service Carousel ─────────────────────────────────────────────────────
    {
      name: ["carousel", "platform", "apps"],
      description: "Swipeable carousel of all FireboxTechs services",
      category: "firebox",
      async handler(ctx) {
        await ctx.sendTyping();
        const msg = carouselMessage(
          `🔥 *FireboxTechs Services*\n\nSwipe through our platforms — tap *Open Service* to visit or *Learn More* for details.`,
          SERVICES,
        );
        await ctx.reply(msg);
      },
    },

    // ─── Services (list fallback) ──────────────────────────────────────────────
    {
      name: ["services", "firebox", "what"],
      description: "View FireboxTechs services and offerings",
      category: "firebox",
      async handler(ctx) {
        await ctx.sendTyping();

        const list = listMessage(
          "🔥 FireboxTechs Services",
          "We offer a wide range of digital services. Select one to learn more:",
          "🛠️ View Services",
          [
            {
              title: "🤖 AI & Automation",
              rows: [
                { rowId: "ai_bots", title: "AI WhatsApp Bots", description: "Custom bots powered by GPT-4" },
                { rowId: "ai_automation", title: "Business Automation", description: "Automate workflows & processes" },
                { rowId: "ai_chatbots", title: "Website Chatbots", description: "AI-powered customer support" },
              ],
            },
            {
              title: "💻 Development",
              rows: [
                { rowId: "web_dev", title: "Web Development", description: "Full-stack websites & web apps" },
                { rowId: "mobile_dev", title: "Mobile Apps", description: "iOS & Android applications" },
                { rowId: "api_dev", title: "API Development", description: "RESTful APIs & integrations" },
              ],
            },
            {
              title: "🔒 Security",
              rows: [
                { rowId: "security_audit", title: "Security Audits", description: "Vulnerability assessments" },
                { rowId: "pentest_service", title: "Penetration Testing", description: "Ethical hacking services" },
              ],
            },
          ],
          "🔥 FireboxTechs — Empowering your digital experience",
        );

        await ctx.reply(list);
      },
    },

    // ─── About ───────────────────────────────────────────────────────────────
    {
      name: ["about", "info", "fireboxtechs"],
      description: "About FireboxTechs",
      category: "firebox",
      async handler(ctx) {
        await ctx.sendTyping();

        const msg = ctaButtons(
          `🔥 *About FireboxTechs*\n\n` +
            `We are a technology company focused on building intelligent, automated digital solutions for businesses and individuals.\n\n` +
            `*What we do:*\n` +
            `• 🤖 AI-powered chatbots & assistants\n` +
            `• 💻 Full-stack web & mobile development\n` +
            `• 🔒 Cybersecurity consulting\n` +
            `• ⚡ Business process automation\n` +
            `• 📊 Data analytics & insights\n\n` +
            `*Our mission:* To empower businesses with cutting-edge technology at accessible prices.`,
          [
            { id: "services", text: "🛠️ Our Services" },
            { id: "contact", text: "📞 Contact Us" },
            { id: "portfolio", text: "🎨 Portfolio" },
          ],
          "FireboxTechs — Empowering your digital experience",
          "🔥 FireboxTechs",
        );

        await ctx.reply(msg);
      },
    },

    // ─── Contact ─────────────────────────────────────────────────────────────
    {
      name: ["contact", "support", "reach"],
      description: "Get contact information and support",
      category: "firebox",
      async handler(ctx) {
        await ctx.sendTyping();

        await ctx.replyText(
          `📞 *Contact FireboxTechs*\n\n` +
            `We're here to help! Reach out via any of these channels:\n\n` +
            `📧 *Email:* support@fireboxtechs.com\n` +
            `🌐 *Website:* https://fireboxtechs.com\n` +
            `💬 *WhatsApp:* You're already here! 🔥\n` +
            `📱 *Telegram:* @fireboxtechs\n\n` +
            `🕒 *Support Hours:*\n` +
            `Monday – Friday: 9am – 6pm WAT\n` +
            `Saturday: 10am – 2pm WAT\n\n` +
            `_Average response time: under 2 hours_`,
        );
      },
    },

    // ─── Portfolio ───────────────────────────────────────────────────────────
    {
      name: ["portfolio", "projects", "work"],
      description: "View FireboxTechs portfolio and past work",
      category: "firebox",
      async handler(ctx) {
        await ctx.sendTyping();

        const list = listMessage(
          "🎨 FireboxTechs Portfolio",
          "Some of our notable projects:",
          "📂 View Projects",
          [
            {
              title: "🤖 AI Projects",
              rows: [
                { rowId: "proj_wa_bot", title: "WhatsApp AI Assistant", description: "Multi-feature bot with GPT-4 integration" },
                { rowId: "proj_cs_bot", title: "E-commerce Chatbot", description: "24/7 customer support automation" },
              ],
            },
            {
              title: "💻 Web & Mobile",
              rows: [
                { rowId: "proj_web1", title: "Business Management System", description: "Full-stack ERP for SMEs" },
                { rowId: "proj_app1", title: "Logistics Tracking App", description: "Real-time fleet & delivery tracking" },
              ],
            },
          ],
          "🔥 FireboxTechs — Building the future, today",
        );

        await ctx.reply(list);
      },
    },

    // ─── Pricing ─────────────────────────────────────────────────────────────
    {
      name: ["pricing", "cost", "rates", "quote"],
      description: "Get pricing information or request a quote",
      category: "firebox",
      async handler(ctx) {
        await ctx.sendTyping();

        const msg = ctaButtons(
          `💰 *FireboxTechs Pricing*\n\n` +
            `Our pricing is flexible and project-based. Here's a rough guide:\n\n` +
            `🤖 *AI WhatsApp Bot*\n` +
            `  Starter: from $150\n` +
            `  Professional: from $350\n` +
            `  Enterprise: Custom\n\n` +
            `💻 *Web Development*\n` +
            `  Landing Page: from $100\n` +
            `  Full Website: from $300\n` +
            `  Web App: from $500\n\n` +
            `📱 *Mobile Apps*\n` +
            `  Simple App: from $500\n` +
            `  Complex App: from $1,500\n\n` +
            `_All prices are estimates. Contact us for a detailed quote._`,
          [
            { id: "get_quote", text: "💬 Get a Quote" },
            { id: "contact", text: "📞 Contact Us" },
          ],
          "🔥 Fair prices, exceptional quality",
        );

        await ctx.reply(msg);
      },
    },

    // ─── Bot info ────────────────────────────────────────────────────────────
    {
      name: ["botinfo", "version"],
      description: "Show bot version and system information",
      category: "firebox",
      async handler(ctx) {
        await ctx.sendTyping();

        await ctx.replyText(
          `🤖 *${config.botName}*\n\n` +
            `📦 Version: 1.0.0\n` +
            `🌐 Runtime: Node.js ${process.version}\n` +
            `⚙️ Environment: ${config.nodeEnv}\n` +
            `🧠 AI Model: ${config.openaiModel}\n` +
            `🔥 Powered by FireboxTechs\n\n` +
            `_Built with ❤️ using Baileys + OpenAI_`,
        );
      },
    },
  ],
};
