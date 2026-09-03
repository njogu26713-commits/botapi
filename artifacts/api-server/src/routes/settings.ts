/**
 * Bot settings API.
 * GET  /api/bot/settings — return current settings
 * POST /api/bot/settings — save new settings
 */
import { Router, type IRouter } from "express";
import { getSettings, normalizeSettings, saveSettings } from "../lib/settings-store.js";
import { clearAllHistories } from "../services/ai.service.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

router.get("/bot/settings", (_req, res) => {
  res.json(getSettings());
});

router.post("/bot/settings", (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    if (!body || typeof body.systemPrompt !== "string") {
      res.status(400).json({ error: "Invalid settings format." });
      return;
    }

    const settings = normalizeSettings(body);
    saveSettings(settings);
    // A knowledge or persona change should start a clean conversation so old
    // assistant messages cannot compete with the newly saved instructions.
    clearAllHistories();
    logger.info({
      offeringCount: settings.offerings.length,
      activeOfferingCount: settings.offerings.filter((offering) => offering.active).length,
      personaLength: settings.systemPrompt.length,
    }, "Bot knowledge and AI persona updated");
    res.json({ ok: true });
  } catch (err: any) {
    logger.error({ err }, "Failed to save settings");
    res.status(500).json({ error: "Failed to save settings." });
  }
});

export default router;
