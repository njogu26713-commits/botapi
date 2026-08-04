/**
 * AI service — wraps OpenAI-compatible API for text generation,
 * image analysis, and structured completions.
 * Supports Groq (preferred when GROQ_API_KEY is set) and OpenAI.
 */
import OpenAI from "openai";
import { config } from "../lib/config.js";
import { logger } from "../lib/logger.js";
import { Conversation } from "../database/models/Conversation.js";
import { User } from "../database/models/User.js";
import type { IConversationMessage } from "../database/models/Conversation.js";

type Provider = "groq" | "openai";

let clientCache: OpenAI | null = null;
let cachedProvider: Provider | null = null;

function resolveProvider(): Provider {
  if (config.aiProvider === "groq") return "groq";
  if (config.aiProvider === "openai") return "openai";
  // auto: prefer Groq when key is present (faster, free-tier friendly)
  return config.groqApiKey ? "groq" : "openai";
}

function getClient(): { client: OpenAI; provider: Provider; defaultModel: string } {
  const provider = resolveProvider();
  if (!clientCache || cachedProvider !== provider) {
    if (provider === "groq") {
      clientCache = new OpenAI({
        apiKey: config.groqApiKey || "gsk-no-key",
        baseURL: "https://api.groq.com/openai/v1",
      });
    } else {
      clientCache = new OpenAI({
        apiKey: config.openaiApiKey || "sk-no-key",
        baseURL: config.openaiBaseUrl,
      });
    }
    cachedProvider = provider;
    logger.info({ provider }, "AI provider initialised");
  }
  const defaultModel =
    provider === "groq" ? config.groqModel : config.openaiModel;
  return { client: clientCache!, provider, defaultModel };
}

export interface ChatOptions {
  phoneNumber: string;
  userMessage: string;
  systemPromptOverride?: string;
  model?: string;
  maxTokens?: number;
  imageUrl?: string;
  imageBase64?: string;
  imageMimeType?: string;
  resetContext?: boolean;
}

export interface ChatResult {
  reply: string;
  tokensUsed: number;
  model: string;
}

/**
 * Main chat function — maintains per-user conversation history in MongoDB.
 */
export async function chat(opts: ChatOptions): Promise<ChatResult> {
  if (!config.aiEnabled) {
    return { reply: "AI features are currently disabled.", tokensUsed: 0, model: "none" };
  }

  const { provider } = getClient();
  const hasKey = provider === "groq" ? !!config.groqApiKey : !!config.openaiApiKey;
  if (!hasKey) {
    return {
      reply: "⚠️ AI service is not configured. Please set GROQ_API_KEY or OPENAI_API_KEY.",
      tokensUsed: 0,
      model: "none",
    };
  }

  const { defaultModel } = getClient();
  const {
    phoneNumber,
    userMessage,
    systemPromptOverride,
    model = defaultModel,
    maxTokens = config.openaiMaxTokens,
    imageUrl,
    imageBase64,
    imageMimeType = "image/jpeg",
    resetContext = false,
  } = opts;

  // Get or create conversation
  let conv = await Conversation.findOne({ phoneNumber });
  if (!conv || resetContext) {
    if (conv && resetContext) {
      conv.messages = [];
      conv.totalTokensUsed = 0;
    } else {
      conv = await Conversation.create({ phoneNumber });
    }
  }

  if (systemPromptOverride) {
    conv.systemPrompt = systemPromptOverride;
  }

  // Build messages array for OpenAI
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: conv.systemPrompt },
  ];

  // Add context window (last N messages)
  const contextMessages = conv.messages.slice(-config.conversationContextWindow);
  for (const m of contextMessages) {
    messages.push({ role: m.role, content: m.content });
  }

  // Build the current user message (with optional image)
  let userContent: OpenAI.Chat.ChatCompletionContentPart[] | string = userMessage;

  if (imageUrl || imageBase64) {
    const imageSource = imageBase64
      ? `data:${imageMimeType};base64,${imageBase64}`
      : imageUrl!;

    userContent = [
      { type: "text", text: userMessage || "Describe this image." },
      {
        type: "image_url",
        image_url: { url: imageSource, detail: "auto" },
      },
    ];
  }

  messages.push({ role: "user", content: userContent as any });

  try {
    const { client, provider } = getClient();
    const completion = await client.chat.completions.create({
      model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content ?? "I couldn't generate a response.";
    const tokensUsed = completion.usage?.total_tokens ?? 0;
    logger.debug({ provider, model, tokensUsed }, "AI completion successful");

    // Save conversation history
    conv.messages.push({
      role: "user",
      content: typeof userContent === "string" ? userContent : userMessage,
      timestamp: new Date(),
    } as IConversationMessage);

    conv.messages.push({
      role: "assistant",
      content: reply,
      timestamp: new Date(),
      tokenCount: tokensUsed,
    } as IConversationMessage);

    // Trim context window
    if (conv.messages.length > config.conversationContextWindow * 2) {
      conv.messages = conv.messages.slice(-config.conversationContextWindow * 2);
    }

    conv.totalTokensUsed += tokensUsed;
    conv.lastActivity = new Date();
    await conv.save();

    // Update user stats
    await User.findOneAndUpdate(
      { phoneNumber },
      { $inc: { "stats.totalAiRequests": 1 } },
    );

    return { reply, tokensUsed, model };
  } catch (err: any) {
    logger.error({ err, phoneNumber }, "AI API error");
    const errorMessage = err?.error?.message ?? err?.message ?? "Unknown error";
    throw new Error(`AI Error: ${errorMessage}`);
  }
}

/**
 * One-shot completion without conversation history (for internal/tool use).
 */
export async function complete(
  prompt: string,
  systemPrompt?: string,
  model?: string,
): Promise<string> {
  const { client, provider, defaultModel } = getClient();
  const hasKey = provider === "groq" ? !!config.groqApiKey : !!config.openaiApiKey;
  if (!hasKey) {
    throw new Error("No AI API key configured. Set GROQ_API_KEY or OPENAI_API_KEY.");
  }

  const resolvedModel = model ?? defaultModel;
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  const completion = await client.chat.completions.create({
    model: resolvedModel,
    messages,
    max_tokens: 1024,
    temperature: 0.5,
  });

  return completion.choices[0]?.message?.content ?? "";
}

/**
 * Clear a user's conversation context.
 */
export async function clearConversation(phoneNumber: string): Promise<void> {
  await Conversation.findOneAndUpdate(
    { phoneNumber },
    { messages: [], lastActivity: new Date() },
    { upsert: true },
  );
}

/**
 * Get conversation history for a user.
 */
export async function getConversationHistory(
  phoneNumber: string,
  limit = 20,
): Promise<IConversationMessage[]> {
  const conv = await Conversation.findOne({ phoneNumber });
  if (!conv) return [];
  return conv.messages.slice(-limit);
}
