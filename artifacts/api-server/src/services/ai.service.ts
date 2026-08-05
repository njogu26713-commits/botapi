/**
 * AI service — Groq (or OpenAI-compatible) chat completions.
 * Conversation history stored in memory per phone number (no MongoDB needed).
 */
import OpenAI from "openai";
import { config } from "../lib/config.js";
import { logger } from "../lib/logger.js";

// ─── Client ───────────────────────────────────────────────────────────────────

function getClient(): { client: OpenAI; model: string } {
  const useGroq = !!config.groqApiKey;
  const client = useGroq
    ? new OpenAI({ apiKey: config.groqApiKey, baseURL: "https://api.groq.com/openai/v1" })
    : new OpenAI({ apiKey: config.openaiApiKey || "sk-no-key", baseURL: config.openaiBaseUrl });
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
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  const completion = await client.chat.completions.create({
    model: model ?? defaultModel,
    messages,
    max_tokens: 1024,
    temperature: 0.5,
  });
  return completion.choices[0]?.message?.content ?? "";
}

// ─── Smart quick-reply selection ─────────────────────────────────────────────

/**
 * Given the user's message, the AI's reply, and the full pool of configured
 * quick-reply buttons, ask the AI to pick which 0–3 buttons make sense as
 * natural follow-up options for this specific conversation turn.
 *
 * Returns a (possibly empty) subset of `availableLabels`.
 */
export async function selectQuickReplies(
  userMessage: string,
  aiReply: string,
  availableLabels: string[],
): Promise<string[]> {
  if (!availableLabels.length) return [];

  const hasKey = !!(config.groqApiKey || config.openaiApiKey);
  if (!hasKey) return availableLabels.slice(0, 3); // fallback — no key

  try {
    const { client, model } = getClient();

    const systemPrompt = `You decide which quick-reply buttons to show a WhatsApp user after an AI response.
You are given a pool of available buttons and must choose a subset (0 to 3) that are the most relevant follow-ups for THIS specific conversation turn.
Respond with ONLY a JSON array of button labels chosen from the pool, e.g. ["Our Services","Pricing Info"].
If none fit, respond with [].
Never invent new labels — only use labels from the pool exactly as written.`;

    const userPrompt = `Available buttons: ${JSON.stringify(availableLabels)}

User said: "${userMessage}"
AI replied: "${aiReply.slice(0, 400)}"

Which buttons (0–3) are the best follow-ups right now?`;

    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 100,
      temperature: 0.2,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "[]";
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Only keep labels that exist in the pool (prevents hallucinations)
    const pool = new Set(availableLabels);
    return (parsed as unknown[])
      .filter((l): l is string => typeof l === "string" && pool.has(l))
      .slice(0, 3);
  } catch (err) {
    logger.warn({ err }, "Quick-reply selection failed — using all buttons");
    return availableLabels.slice(0, 3);
  }
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export interface ChatOptions {
  phoneNumber: string;
  userMessage: string;
  systemPrompt?: string;
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

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: opts.systemPrompt || "You are a helpful AI assistant.",
    },
    ...history,
    { role: "user", content: opts.userMessage },
  ];

  try {
    const completion = await client.chat.completions.create({
      model,
      messages,
      max_tokens: 1024,
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
