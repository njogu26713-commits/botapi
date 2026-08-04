/**
 * Authentication state management for Baileys.
 * Supports multi-file auth state stored in the sessions directory.
 */
import path from "node:path";
import fs from "node:fs/promises";
import { logger } from "../lib/logger.js";
import { config } from "../lib/config.js";

/**
 * Ensure the sessions directory exists before using it.
 */
export async function ensureSessionDir(): Promise<void> {
  const dir = path.resolve(config.sessionDir);
  await fs.mkdir(dir, { recursive: true });
  logger.info({ sessionDir: dir }, "Session directory ready");
}

/**
 * Delete the current session (forces re-authentication).
 */
export async function clearSession(): Promise<void> {
  const dir = path.resolve(config.sessionDir);
  try {
    await fs.rm(dir, { recursive: true, force: true });
    await fs.mkdir(dir, { recursive: true });
    logger.info("Session cleared successfully");
  } catch (err) {
    logger.error({ err }, "Failed to clear session");
    throw err;
  }
}

/**
 * Check if a valid session already exists.
 */
export async function sessionExists(): Promise<boolean> {
  const dir = path.resolve(config.sessionDir);
  try {
    const files = await fs.readdir(dir);
    return files.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get the absolute session directory path.
 */
export function getSessionDir(): string {
  return path.resolve(config.sessionDir);
}
