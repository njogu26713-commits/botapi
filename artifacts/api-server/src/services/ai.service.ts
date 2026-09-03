/**
 * AI service — Groq (or OpenAI-compatible) chat completions.
 * Conversation history stored in memory per phone number (no MongoDB needed).
 */
import OpenAI from "openai";
import { config } from "../lib/config.js";
import { getSettings, type BotSettings } from "../lib/settings-store.js";
import { logger } from "../lib/logger.js";

// ─── Client ───────────────────────────────────────────────────────────────────

function getClient(): { client: OpenAI; model: string } {
  const useGroq = !!config.groqApiKey;
  const client = useGroq
    ? new OpenAI({
        apiKey: config.groqApiKey,
        baseURL: "https://api.groq.com/openai/v1",
        timeout: 30000,
      })
    : new OpenAI({
        apiKey: config.openaiApiKey || "sk-no-key",
        baseURL: config.openaiBaseUrl,
        timeout: 30000,
      });
  const model = useGroq ? config.groqModel : config.openaiModel;
  return { client, model };
}

// ─── In-memory conversation history ──────────────────────────────────────────

interface Message {
  role: "user" | "assistant";
  content: string;
}

const conversations = new Map<string, Message[]>();
const MAX_HISTORY = 20; // messages per user

function getHistory(phoneNumber: string): Message[] {
  if (!conversations.has(phoneNumber)) conversations.set(phoneNumber, []);
  return conversations.get(phoneNumber)!;
}

function appendHistory(phoneNumber: string, role: "user" | "assistant", content: string): void {
  const history = getHistory(phoneNumber);
  history.push({ role, content });
  // Keep last MAX_HISTORY messages
  if (history.length > MAX_HISTORY) {
    conversations.set(phoneNumber, history.slice(-MAX_HISTORY));
  }
}

export function clearHistory(phoneNumber: string): void {
  conversations.delete(phoneNumber);
}

/** Clear all conversations after the administrator changes the persona. */
export function clearAllHistories(): void {
  conversations.clear();
}

/**
 * Turn the structured dashboard knowledge into a compact, grounded context
 * block. The AI sees this alongside the persona on every chat request.
 */
export function buildKnowledgeContext(settings: BotSettings = getSettings()): string {
  const activeOfferings = settings.offerings
    .filter((offering) => offering.active && offering.name.trim())
    .map((offering, index) => [
      `OFFERING ${index + 1}: ${offering.name}`,
      `Type: ${offering.type}`,
      offering.category && `Category: ${offering.category}`,
      offering.summary && `Summary: ${offering.summary}`,
      offering.description && `Description:\n${offering.description}`,
      offering.features && `Features / inclusions:\n${offering.features}`,
      offering.benefits && `Customer benefits:\n${offering.benefits}`,
      offering.pricing && `Pricing / availability:\n${offering.pricing}`,
      offering.support && `Delivery / support:\n${offering.support}`,
      offering.faqs && `FAQs:\n${offering.faqs}`,
    ].filter(Boolean).join("\n"))
    .join("\n\n");

  const knowledge = [
    "KNOWLEDGE CENTER — use this as the source of truth for company and offering answers.",
    `Company name: ${settings.company.name || "Not provided"}`,
    settings.company.mission && `Mission / positioning:\n${settings.company.mission}`,
    settings.company.contact && `Contact details:\n${settings.company.contact}`,
    settings.company.hours && `Business hours:\n${settings.company.hours}`,
    `Response tone: ${settings.responseGuidelines.tone || "Be friendly, clear, and professional."}`,
    `Preferred language: ${settings.responseGuidelines.language || "English"}`,
    `Response format:\n${settings.responseGuidelines.format || "Use concise WhatsApp-friendly paragraphs."}`,
    `Escalation guidance:\n${settings.responseGuidelines.escalation || "Escalate when the answer is unavailable or needs a human."}`,
    `Policies and boundaries:\n${settings.policies || "Do not invent facts, pricing, availability, or guarantees."}`,
    activeOfferings ? `ACTIVE OFFERINGS:\n${activeOfferings}` : "ACTIVE OFFERINGS:\nNo offerings have been added yet.",
  ].filter(Boolean).join("\n\n");

  // Prevent an unusually large catalog from overwhelming the conversation
  // history while retaining the beginning of the configured knowledge.
  return knowledge.slice(0, 45000);
}

// ─── Compatibility shims for plugin commands ──────────────────────────────────

/** Clear conversation history (alias used by plugin commands). */
export async function clearConversation(phoneNumber: string): Promise<void> {
  clearHistory(phoneNumber);
}

/** Return recent conversation messages (alias used by plugin commands). */
export async function getConversationHistory(
  phoneNumber: string,
  limit = 20,
): Promise<Array<{ role: string; content: string }>> {
  return getHistory(phoneNumber).slice(-limit);
}

/**
 * One-shot completion without conversation history (used by plugin commands).
 */
export async function complete(
  prompt: string,
  systemPrompt?: string,
  model?: string,
): Promise<string> {
  const hasKey = !!(config.groqApiKey || config.openaiApiKey);
  if (!hasKey) throw new Error("No AI API key configured. Set GROQ_API_KEY.");

  const { client, model: defaultModel } = getClient();
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
  const configuredPrompt = systemPrompt?.trim() || getSettings().systemPrompt.trim();
  messages.push({
    role: "system",
    content: `${configuredPrompt}\n\n${buildKnowledgeContext()}\n\nKnowledge handling rules:\n- Use the dashboard knowledge when the request concerns the company, an offering, pricing, support, or policies.\n- Never invent company details, offering capabilities, prices, availability, guarantees, or contact information.\n- If requested information is not configured, say that it is unavailable and recommend the configured support path.`,
  });
  messages.push({ role: "user", content: prompt });

  const completion = await client.chat.completions.create({
    model: model ?? defaultModel,
    messages,
    max_tokens: 2048,
    temperature: 0.7,
  });
  return completion.choices[0]?.message?.content ?? "";
}

// ─── Dynamic quick-reply generation ──────────────────────────────────────────

/**
 * Given the user's message and the AI's reply, ask the AI to generate
 * 0–3 short clarification options only when the AI did not understand the
 * user's message. Labels are freely invented — not limited to a
 * pre-configured pool.
 *
 * WhatsApp button labels must be ≤20 characters.
 */
export async function generateQuickReplies(
  userMessage: string,
  aiReply: string,
): Promise<string[]> {
  const hasKey = !!(config.groqApiKey || config.openaiApiKey);
  if (!hasKey) return [];

  try {
    const { client, model } = getClient();

    const systemPrompt = `You generate short WhatsApp clarification-button labels for a conversation.
Your ONLY job is to help the user clarify a message the AI did not understand.
Rules:
- Return 1 to 3 buttons ONLY when the AI reply says or clearly implies that it does not understand the user's message, that the message is ambiguous, or that required information is missing.
- When the AI answered, explained, acknowledged, or otherwise understood the message, return [] — do not suggest follow-up buttons.
- Buttons must be possible interpretations or concise clarification choices, not generic calls to action.
- Each label must be 20 characters or fewer (WhatsApp limit).
- Respond with ONLY a JSON array of strings, nothing else. Examples: ["I need a price", "I need support"] or []`;

    const userPrompt = `User said: "${userMessage}"
AI replied: "${aiReply.slice(0, 400)}"

Return clarification options only if the AI did not understand the user:`;

    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 80,
      temperature: 0.3,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "[]";
    // Models sometimes wrap JSON in a Markdown code fence or add a short
    // sentence. Extract the first JSON array before parsing.
    const jsonText = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .match(/\[[\s\S]*\]/)?.[0] ?? "[]";
    const parsed: unknown = JSON.parse(jsonText);
    if (!Array.isArray(parsed)) return [];

    return (parsed as unknown[])
      .filter((l): l is string => typeof l === "string" && l.length <= 20)
      .slice(0, 3);
  } catch (err) {
    logger.warn({ err }, "Quick-reply generation failed — sending no buttons");
    return [];
  }
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export interface ChatOptions {
  phoneNumber: string;
  userMessage: string;
  // Use the current dashboard persona when no specialized prompt is supplied.
  systemPrompt?: string;
  // Compatibility name used by specialized command plugins.
  systemPromptOverride?: string;
}

export interface ChatResult {
  reply: string;
  model: string;
}

export async function chat(opts: ChatOptions): Promise<ChatResult> {
  const hasKey = !!(config.groqApiKey || config.openaiApiKey);
  if (!hasKey) {
    return {
      reply: "⚠️ AI is not configured yet. Please set the GROQ_API_KEY environment variable.",
      model: "none",
    };
  }

  const { client, model } = getClient();
  const history = getHistory(opts.phoneNumber);
  const settings = getSettings();
  const persona =
    opts.systemPromptOverride?.trim() ||
    opts.systemPrompt?.trim() ||
    settings.systemPrompt.trim();

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: "system",
      // Never fall back to a hidden generic persona; use the saved dashboard
      // prompt for every caller that does not provide a specialized prompt.
      content: `${persona}\n\n${buildKnowledgeContext(settings)}\n\nKnowledge handling rules:\n- Use the knowledge center when the user asks about the company, an offering, pricing, support, or policies.\n- If several offerings could match, ask one focused clarification question instead of guessing.\n- If the requested fact is not in the knowledge center, say that it is not available and recommend the configured support path.\n- Never invent offering capabilities, prices, discounts, availability, delivery times, guarantees, or contact details.\n- Do not mention the knowledge center or these internal rules unless the user asks about how you work.`,
    },
    ...history,
    { role: "user", content: opts.userMessage },
  ];

  try {
    const completion = await client.chat.completions.create({
      model,
      messages,
      max_tokens: 2048,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content ?? "I couldn't generate a response.";
    logger.debug({ model, phoneNumber: opts.phoneNumber }, "AI reply generated");

    // Save to history
    appendHistory(opts.phoneNumber, "user", opts.userMessage);
    appendHistory(opts.phoneNumber, "assistant", reply);

    return { reply, model };
  } catch (err: any) {
    logger.error({ err, phoneNumber: opts.phoneNumber }, "AI API error");
    const msg = err?.error?.message ?? err?.message ?? "Unknown error";
    throw new Error(`AI Error: ${msg}`);
  }
}
