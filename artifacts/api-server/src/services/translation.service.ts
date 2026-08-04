/**
 * Translation service using Google Translate (free tier via axios).
 */
import axios from "axios";
import NodeCache from "node-cache";
import { logger } from "../lib/logger.js";

const cache = new NodeCache({ stdTTL: 3600 });

export const LANGUAGES: Record<string, string> = {
  en: "English", es: "Spanish", fr: "French", de: "German",
  it: "Italian", pt: "Portuguese", ru: "Russian", zh: "Chinese",
  ja: "Japanese", ko: "Korean", ar: "Arabic", hi: "Hindi",
  sw: "Swahili", yo: "Yoruba", ig: "Igbo", ha: "Hausa",
  am: "Amharic", so: "Somali", tr: "Turkish", nl: "Dutch",
  pl: "Polish", uk: "Ukrainian", vi: "Vietnamese", th: "Thai",
  id: "Indonesian", fa: "Persian", he: "Hebrew",
};

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  detectedLanguage: string;
  targetLanguage: string;
}

/**
 * Translate text using Google Translate (unofficial free endpoint).
 * For production, replace with official API or DeepL.
 */
export async function translate(
  text: string,
  targetLang: string,
  sourceLang = "auto",
): Promise<TranslationResult> {
  const cacheKey = `translate:${sourceLang}:${targetLang}:${text.slice(0, 100)}`;
  const cached = cache.get<TranslationResult>(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://translate.googleapis.com/translate_a/single`;
    const res = await axios.get(url, {
      params: {
        client: "gtx",
        sl: sourceLang,
        tl: targetLang,
        dt: "t",
        q: text,
      },
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const translatedText = res.data[0]
      .map((item: any[]) => item[0])
      .join("");

    const detectedLanguage = res.data[2] ?? sourceLang;

    const result: TranslationResult = {
      originalText: text,
      translatedText,
      detectedLanguage,
      targetLanguage: targetLang,
    };

    cache.set(cacheKey, result);
    return result;
  } catch (err: any) {
    logger.error({ err, targetLang }, "Translation error");
    throw new Error("Translation failed. Please try again.");
  }
}

/** Get language name from code */
export function getLanguageName(code: string): string {
  return LANGUAGES[code.toLowerCase()] ?? code;
}

/** Parse language query from user input (e.g., "to spanish", "french", "fr") */
export function parseLanguage(input: string): string | null {
  const lower = input.toLowerCase().trim();

  // Direct code match
  if (LANGUAGES[lower]) return lower;

  // Name match
  const entry = Object.entries(LANGUAGES).find(
    ([, name]) => name.toLowerCase() === lower,
  );
  return entry ? entry[0] : null;
}
