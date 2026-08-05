/**
 * Bot settings API.
 * GET  /api/bot/settings — return current settings
 * POST /api/bot/settings — save new settings
 */
import { Router, type IRouter } from "express";
import { getSettings, saveSettings, type BotSettings } from "../lib/settings-store.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

router.get("/bot/settings", (_req, res) => {
  res.json(getSettings());
});

router.post("/bot/settings", (req, res) => {
  try {
    const body = req.body as Partial<BotSettings>;

    if (typeof body.systemPrompt !== "string" || !Array.isArray(body.quickReplies)) {
      res.status(400).json({ error: "Invalid settings format." });
      return;
    }

    const settings: BotSettings = {
      systemPrompt: body.systemPrompt.trim(),
      quickReplies: body.quickReplies
        .filter((qr) => typeof qr?.label === "string" && qr.label.trim())
        .map((qr) => ({ label: qr.label.trim() }))
        .slice(0, 10), // max 10 buttons
    };

    saveSettings(settings);
    logger.info({ quickReplyCount: settings.quickReplies.length }, "Bot settings updated");
    res.json({ ok: true });
  } catch (err: any) {
    logger.error({ err }, "Failed to save settings");
    res.status(500).json({ error: "Failed to save settings." });
  }
});

export default router;
