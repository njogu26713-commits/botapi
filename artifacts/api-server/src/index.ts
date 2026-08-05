import app from "./app.js";
import { logger } from "./lib/logger.js";
import { whatsappConnection } from "./bot/connection.js";
import { ensureSessionDir } from "./bot/auth.js";
import { registerAllPlugins } from "./commands/registry.js";
import { handleMessage } from "./bot/handler.js";
import { connectDatabase } from "./database/index.js";
import { loadSettings } from "./lib/settings-store.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, async (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Load bot settings from disk
  loadSettings();

  // Connect to MongoDB
  try {
    await connectDatabase();
  } catch (err) {
    logger.error({ err }, "Failed to connect to MongoDB — bot features requiring DB will be degraded");
  }

  // Ensure session directory exists
  try {
    await ensureSessionDir();
  } catch (err) {
    logger.error({ err }, "Failed to create session directory");
  }

  // Register all command plugins
  try {
    await registerAllPlugins();
    logger.info("All plugins registered");
  } catch (err) {
    logger.error({ err }, "Failed to register plugins");
  }

  // Wire message handler
  whatsappConnection.on("messages", ({ messages }: { messages: any[] }) => {
    for (const msg of messages) {
      handleMessage(whatsappConnection.socket, msg).catch((err) =>
        logger.error({ err }, "Unhandled message error"),
      );
    }
  });

  whatsappConnection.on("ready", async (socket: any) => {
    logger.info("🤖 Bot is online and ready");
    // Re-register plugins with the live socket so onLoad hooks fire
    await registerAllPlugins(socket).catch((err) =>
      logger.error({ err }, "Plugin re-registration error"),
    );
  });

  whatsappConnection.on("disconnected", () => {
    logger.warn("WhatsApp disconnected — waiting to reconnect...");
  });

  whatsappConnection.on("permanent_disconnect", ({ statusCode, reason }: any) => {
    logger.error({ statusCode, reason }, "WhatsApp permanently disconnected");
  });

  // Start the WhatsApp connection
  try {
    await whatsappConnection.connect();
  } catch (err) {
    logger.error({ err }, "Failed to start WhatsApp connection");
  }
});
