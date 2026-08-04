/**
 * Web search service using Google Custom Search API.
 * Falls back to DuckDuckGo instant answers when no API key is set.
 */
import axios from "axios";
import NodeCache from "node-cache";
import { config } from "../lib/config.js";
import { logger } from "../lib/logger.js";

const cache = new NodeCache({ stdTTL: 300 }); // 5 min cache

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface NewsResult {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  description: string;
}

/**
 * Google Custom Search
 */
export async function googleSearch(
  query: string,
  num = 5,
): Promise<SearchResult[]> {
  const cacheKey = `search:${query}:${num}`;
  const cached = cache.get<SearchResult[]>(cacheKey);
  if (cached) return cached;

  if (!config.googleApiKey || !config.googleSearchEngineId) {
    throw new Error("Google Search API not configured. Set GOOGLE_API_KEY and GOOGLE_SEARCH_ENGINE_ID.");
  }

  try {
    const res = await axios.get("https://www.googleapis.com/customsearch/v1", {
      params: {
        key: config.googleApiKey,
        cx: config.googleSearchEngineId,
        q: query,
        num: Math.min(num, 10),
      },
      timeout: 8000,
    });

    const results: SearchResult[] = (res.data.items ?? []).map((item: any) => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet,
    }));

    cache.set(cacheKey, results);
    return results;
  } catch (err: any) {
    logger.error({ err, query }, "Google Search API error");
    throw new Error("Search failed. Try again later.");
  }
}

/**
 * DuckDuckGo instant answer (no API key required).
 */
export async function duckDuckGoSearch(query: string): Promise<SearchResult[]> {
  const cacheKey = `ddg:${query}`;
  const cached = cache.get<SearchResult[]>(cacheKey);
  if (cached) return cached;

  try {
    const res = await axios.get("https://api.duckduckgo.com/", {
      params: { q: query, format: "json", no_html: "1", skip_disambig: "1" },
      timeout: 8000,
    });

    const d = res.data;
    const results: SearchResult[] = [];

    if (d.AbstractText) {
      results.push({ title: d.Heading, url: d.AbstractURL, snippet: d.AbstractText });
    }

    (d.RelatedTopics ?? []).slice(0, 4).forEach((t: any) => {
      if (t.Text && t.FirstURL) {
        results.push({ title: t.Text.split(" - ")[0] ?? t.Text, url: t.FirstURL, snippet: t.Text });
      }
    });

    cache.set(cacheKey, results);
    return results;
  } catch (err: any) {
    logger.error({ err, query }, "DuckDuckGo search error");
    throw new Error("Search failed. Try again later.");
  }
}

/**
 * Main search — uses Google if configured, falls back to DuckDuckGo.
 */
export async function search(query: string, num = 5): Promise<SearchResult[]> {
  if (config.googleApiKey && config.googleSearchEngineId) {
    return googleSearch(query, num);
  }
  return duckDuckGoSearch(query);
}

/**
 * News search using NewsAPI.org.
 */
export async function searchNews(query: string, pageSize = 5): Promise<NewsResult[]> {
  const cacheKey = `news:${query}`;
  const cached = cache.get<NewsResult[]>(cacheKey);
  if (cached) return cached;

  if (!config.newsApiKey) {
    throw new Error("News API not configured. Set NEWS_API_KEY.");
  }

  try {
    const res = await axios.get("https://newsapi.org/v2/everything", {
      params: {
        q: query,
        apiKey: config.newsApiKey,
        pageSize,
        sortBy: "publishedAt",
        language: "en",
      },
      timeout: 8000,
    });

    const results: NewsResult[] = (res.data.articles ?? []).map((a: any) => ({
      title: a.title,
      url: a.url,
      source: a.source?.name ?? "Unknown",
      publishedAt: new Date(a.publishedAt).toLocaleDateString(),
      description: a.description ?? "",
    }));

    cache.set(cacheKey, results);
    return results;
  } catch (err: any) {
    logger.error({ err, query }, "NewsAPI error");
    throw new Error("News search failed. Try again later.");
  }
}

export function formatSearchResults(results: SearchResult[], query: string): string {
  if (!results.length) return `No results found for "${query}".`;

  let msg = `🔍 *Search: ${query}*\n\n`;
  results.slice(0, 5).forEach((r, i) => {
    msg += `${i + 1}. *${r.title}*\n`;
    msg += `   ${r.snippet.slice(0, 120)}...\n`;
    msg += `   🔗 ${r.url}\n\n`;
  });
  return msg.trim();
}

export function formatNewsResults(results: NewsResult[]): string {
  if (!results.length) return "No news found.";

  let msg = `📰 *Latest News*\n\n`;
  results.slice(0, 5).forEach((r, i) => {
    msg += `${i + 1}. *${r.title}*\n`;
    msg += `   ${r.source} • ${r.publishedAt}\n`;
    if (r.description) msg += `   ${r.description.slice(0, 100)}...\n`;
    msg += `   🔗 ${r.url}\n\n`;
  });
  return msg.trim();
}
