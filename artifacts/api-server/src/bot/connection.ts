/**
 * WhatsApp connection manager using @itsliaaa/baileys.
 * Handles connection lifecycle, QR code generation, reconnection logic.
 */
import path from "node:path";
import { EventEmitter } from "node:events";
import { logger } from "../lib/logger.js";
import { config } from "../lib/config.js";

// Dynamic import to avoid bundling issues with baileys
async function loadBaileys() {
  const baileys = await import("@itsliaaa/baileys");
  return baileys;
}

export type BotSocket = Awaited<ReturnType<typeof createConnection>> extends { socket: infer S } ? S : never;

export class WhatsAppConnection extends EventEmitter {
  public socket: any = null;
  private reconnectAttempts = 0;
  // Railway and other hosted environments can transiently time out while
  // WhatsApp is issuing QR references. Do not permanently stop after a fixed
  // number of retries; only authentication/logout errors are terminal.
  private reconnectDelay = 3000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isConnecting = false;
  private shouldReconnect = true;
  public qrCode: string | null = null;
  public pairingCode: string | null = null;
  public isReady = false;

  async connect(): Promise<void> {
    if (this.isConnecting) return;
    if (!this.shouldReconnect) this.shouldReconnect = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.isConnecting = true;

    try {
      const baileys = await loadBaileys();
      const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = baileys as any;

      const sessionDir = path.resolve(config.sessionDir);
      const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

      const { version, isLatest } = await fetchLatestBaileysVersion();
      logger.info({ version, isLatest }, "Baileys version");

      this.socket = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false, // QR is served via the web UI at /api/
        logger: logger.child({ module: "baileys" }),
        browser: ["FireboxTechs Assistant", "Chrome", "125.0.0"],
        generateHighQualityLinkPreview: true,
        syncFullHistory: false,
        markOnlineOnConnect: true,
        defaultQueryTimeoutMs: 60000,
        getMessage: async (key: any) => {
          return { conversation: "Message not found" };
        },
      });

      // Handle pairing code if needed
      if (config.pairingCode && config.botNumber && !state.creds.registered) {
        setTimeout(async () => {
          try {
            const code = await this.socket.requestPairingCode(config.botNumber);
            this.pairingCode = code;
            logger.info({ pairingCode: code }, "📲 Pairing code generated — enter this in WhatsApp > Settings > Linked Devices > Link with phone number");
            this.emit("pairing_code", code);
          } catch (err) {
            logger.error({ err }, "Failed to get pairing code");
          }
        }, 3000);
      }

      // Connection events
      this.socket.ev.on("connection.update", async (update: any) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.qrCode = qr;
          this.emit("qr", qr);
          logger.info("📱 QR code generated — scan with WhatsApp");

          // QR is served on the web UI at /api/ — no terminal output needed
        }

        if (connection === "close") {
          this.isReady = false;
          this.qrCode = null;
          this.emit("disconnected");

          const disconnectError = lastDisconnect?.error as any;
          // Baileys versions expose the status code in slightly different
          // locations. Reading all supported locations prevents a transient
          // 408 from being mistaken for a terminal logout.
          const statusCode =
            disconnectError?.output?.statusCode ??
            disconnectError?.statusCode ??
            disconnectError?.data?.statusCode;
          const reason = disconnectError?.output?.payload?.error ?? disconnectError?.message;

          logger.warn({ statusCode, reason }, "WhatsApp connection closed");

          const terminalDisconnect = statusCode === 401 || statusCode === 403;
          if (this.shouldReconnect && !terminalDisconnect) {
            this.reconnectAttempts++;
            const delay = Math.min(
              this.reconnectDelay * Math.max(1, this.reconnectAttempts),
              30000,
            );
            logger.info(
              { attempt: this.reconnectAttempts, delay },
              "Reconnecting to WhatsApp...",
            );
            this.reconnectTimer = setTimeout(() => {
              this.reconnectTimer = null;
              this.isConnecting = false;
              this.connect().catch((err) =>
                logger.error({ err }, "Reconnect failed"),
              );
            }, delay);
          } else {
            logger.error("WhatsApp permanently disconnected — manual intervention required");
            this.emit("permanent_disconnect", { statusCode, reason });
          }
        }

        if (connection === "open") {
          this.isReady = true;
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.qrCode = null;
          logger.info("✅ WhatsApp connected successfully");
          this.emit("ready", this.socket);
        }
      });

      // Save credentials on update
      this.socket.ev.on("creds.update", saveCreds);

      // Forward all events
      this.socket.ev.on("messages.upsert", (data: any) => this.emit("messages", data));
      this.socket.ev.on("messages.update", (data: any) => this.emit("message_update", data));
      this.socket.ev.on("call", (data: any) => this.emit("call", data));
      this.socket.ev.on("group-participants.update", (data: any) => this.emit("group_update", data));

    } catch (err) {
      this.isConnecting = false;
      logger.error({ err }, "Failed to initialize WhatsApp connection");
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      try {
        await this.socket.logout();
      } catch {
        this.socket.ws?.close();
      }
      this.socket = null;
    }
    this.isReady = false;
    logger.info("WhatsApp disconnected");
  }

  async restart(): Promise<void> {
    this.shouldReconnect = true;
    this.reconnectAttempts = 0;
    await this.disconnect();
    this.shouldReconnect = true;
    await this.connect();
  }
}

export const whatsappConnection = new WhatsAppConnection();

async function createConnection() {
  return whatsappConnection;
}
