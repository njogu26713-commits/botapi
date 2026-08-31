import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const config = {
  // Server
  port: Number(process.env["PORT"] ?? 5000),
  nodeEnv: optional("NODE_ENV", "development"),
  basePath: optional("BASE_PATH", "/api"),

  // MongoDB
  mongoUri: optional("MONGODB_URI", "mongodb://localhost:27017/fireboxtechs"),

  // JWT for admin API
  jwtSecret: optional("JWT_SECRET", "change-me-in-production-super-secret-key"),
  jwtExpiresIn: optional("JWT_EXPIRES_IN", "7d"),

  // Admin credentials (fallback for first-run setup)
  adminUsername: optional("ADMIN_USERNAME", "admin"),
  adminPassword: optional("ADMIN_PASSWORD", "admin123"),

  // WhatsApp / Baileys
  sessionDir: optional("SESSION_DIR", "./sessions"),
  botName: optional("BOT_NAME", "FireboxTechs Assistant"),
  botNumber: optional("BOT_NUMBER", ""), // phone number for pairing code
  pairingCode: optional("USE_PAIRING_CODE", "false") === "true",

  // AI provider selection: "groq" | "openai" | "auto" (auto = groq if key set, else openai)
  aiProvider: optional("AI_PROVIDER", "auto"),

  // Groq
  groqApiKey: optional("GROQ_API_KEY", ""),
  // Current Groq production replacement for the retired Llama 3.3 70B model.
  groqModel: optional("GROQ_MODEL", "openai/gpt-oss-120b"),

  // OpenAI (also used as OpenAI-compatible base)
  openaiApiKey: optional("OPENAI_API_KEY", ""),
  openaiBaseUrl: optional("OPENAI_BASE_URL", "https://api.openai.com/v1"),
  openaiModel: optional("OPENAI_MODEL", "gpt-4o"),
  openaiMaxTokens: Number(optional("OPENAI_MAX_TOKENS", "2048")),

  // Weather API (OpenWeatherMap)
  weatherApiKey: optional("WEATHER_API_KEY", ""),

  // News API
  newsApiKey: optional("NEWS_API_KEY", ""),

  // Google Custom Search
  googleApiKey: optional("GOOGLE_API_KEY", ""),
  googleSearchEngineId: optional("GOOGLE_SEARCH_ENGINE_ID", ""),

  // YouTube (yt-dlp path or API key)
  ytDlpPath: optional("YT_DLP_PATH", "yt-dlp"),

  // Webhook
  webhookUrl: optional("WEBHOOK_URL", ""),
  webhookSecret: optional("WEBHOOK_SECRET", ""),

  // Rate limiting
  rateLimitWindowMs: Number(optional("RATE_LIMIT_WINDOW_MS", "60000")),
  rateLimitMaxRequests: Number(optional("RATE_LIMIT_MAX_REQUESTS", "30")),
  rateLimitAiWindowMs: Number(optional("RATE_LIMIT_AI_WINDOW_MS", "60000")),
  rateLimitAiMaxRequests: Number(optional("RATE_LIMIT_AI_MAX_REQUESTS", "10")),

  // Feature flags
  aiEnabled: optional("AI_ENABLED", "true") === "true",
  mediaDownloadEnabled: optional("MEDIA_DOWNLOAD_ENABLED", "true") === "true",
  webhookEnabled: optional("WEBHOOK_ENABLED", "false") === "true",

  // Anti-spam
  antispamEnabled: optional("ANTISPAM_ENABLED", "true") === "true",
  antispamThreshold: Number(optional("ANTISPAM_THRESHOLD", "5")),

  // Context window for AI conversations
  conversationContextWindow: Number(optional("CONVERSATION_CONTEXT_WINDOW", "20")),
} as const;

export type Config = typeof config;
