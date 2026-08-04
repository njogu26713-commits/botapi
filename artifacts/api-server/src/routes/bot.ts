/**
 * Bot management API routes.
 * GET  /api/bot/status  — connection status + QR/pairing code
 * POST /api/bot/restart — restart the WhatsApp connection
 * POST /api/bot/logout  — log out and clear session
 * GET  /api/bot/qr      — QR code as PNG image
 */
import { Router, type IRouter } from "express";
import { whatsappConnection } from "../bot/connection.js";
import { clearSession } from "../bot/auth.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

router.get("/bot/status", (_req, res) => {
  res.json({
    connected: whatsappConnection.isReady,
    qrCode: whatsappConnection.qrCode,
    pairingCode: whatsappConnection.pairingCode,
  });
});

router.get("/bot/qr", async (_req, res) => {
  const qr = whatsappConnection.qrCode;
  if (!qr) {
    res.status(404).json({ error: "No QR code available. Bot may already be connected." });
    return;
  }

  try {
    const QRCode = await import("qrcode");
    const buffer = await QRCode.default.toBuffer(qr, {
      width: 400,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    });
    res.setHeader("Content-Type", "image/png");
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to generate QR image", detail: err.message });
  }
});

router.post("/bot/restart", async (_req, res) => {
  try {
    await whatsappConnection.restart();
    res.json({ ok: true, message: "Bot restarting..." });
  } catch (err: any) {
    logger.error({ err }, "Bot restart failed");
    res.status(500).json({ error: "Restart failed", detail: err.message });
  }
});

router.post("/bot/logout", async (_req, res) => {
  try {
    await whatsappConnection.disconnect();
    await clearSession();
    res.json({ ok: true, message: "Logged out and session cleared. Restart the server to re-authenticate." });
  } catch (err: any) {
    logger.error({ err }, "Bot logout failed");
    res.status(500).json({ error: "Logout failed", detail: err.message });
  }
});

export default router;
