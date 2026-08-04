import mongoose from "mongoose";
import { logger } from "../lib/logger.js";
import { config } from "../lib/config.js";

let isConnected = false;
export function isDatabaseConnected(): boolean { return isConnected; }

export async function connectDatabase(): Promise<void> {
  if (isConnected) return;

  mongoose.connection.on("connected", () => {
    logger.info("MongoDB connected");
    isConnected = true;
  });

  mongoose.connection.on("error", (err) => {
    logger.error({ err }, "MongoDB connection error");
  });

  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB disconnected");
    isConnected = false;
  });

  try {
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
  } catch (err) {
    logger.error({ err }, "Failed to connect to MongoDB");
    throw err;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  logger.info("MongoDB disconnected gracefully");
}

export { mongoose };
