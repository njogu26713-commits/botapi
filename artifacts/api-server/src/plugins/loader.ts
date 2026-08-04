/**
 * Plugin loader — discovers, loads, validates and manages plugin lifecycle.
 */
import { logger } from "../lib/logger.js";
import type { PluginManifest, CommandDefinition } from "./types.js";
import { Plugin } from "../database/models/Plugin.js";

class PluginRegistry {
  private plugins = new Map<string, PluginManifest>();
  private commands = new Map<string, CommandDefinition>();

  /**
   * Register a plugin manifest.
   */
  async register(manifest: PluginManifest, socket?: any): Promise<void> {
    if (this.plugins.has(manifest.name)) {
      logger.warn({ plugin: manifest.name }, "Plugin already registered — skipping");
      return;
    }

    // Validate
    if (!manifest.name || !manifest.commands) {
      throw new Error(`Invalid plugin manifest: ${manifest.name}`);
    }

    // Check if disabled in DB
    const dbRecord = await Plugin.findOne({ name: manifest.name });
    if (dbRecord && !dbRecord.enabled) {
      logger.info({ plugin: manifest.name }, "Plugin is disabled in DB — skipping");
      return;
    }

    // Upsert DB record
    await Plugin.findOneAndUpdate(
      { name: manifest.name },
      { version: manifest.version, description: manifest.description, author: manifest.author },
      { upsert: true },
    );

    // Register commands
    for (const cmd of manifest.commands) {
      const names = Array.isArray(cmd.name) ? cmd.name : [cmd.name];
      for (const name of names) {
        if (this.commands.has(name)) {
          logger.warn({ plugin: manifest.name, command: name }, "Command name conflict — overwriting");
        }
        this.commands.set(name.toLowerCase(), cmd);
      }
    }

    // Call onLoad hook
    if (manifest.onLoad && socket) {
      try {
        await manifest.onLoad(socket);
      } catch (err) {
        logger.error({ err, plugin: manifest.name }, "Plugin onLoad error");
      }
    }

    this.plugins.set(manifest.name, manifest);
    logger.info({ plugin: manifest.name, commands: manifest.commands.length }, "Plugin loaded");
  }

  /**
   * Unload a plugin by name.
   */
  async unload(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (!plugin) return;

    // Remove commands
    for (const cmd of plugin.commands) {
      const names = Array.isArray(cmd.name) ? cmd.name : [cmd.name];
      for (const n of names) this.commands.delete(n);
    }

    // Call onUnload
    if (plugin.onUnload) {
      try { await plugin.onUnload(); } catch { /* ignore */ }
    }

    this.plugins.delete(name);
    logger.info({ plugin: name }, "Plugin unloaded");
  }

  /** Find command by name */
  getCommand(name: string): CommandDefinition | undefined {
    return this.commands.get(name.toLowerCase());
  }

  /** All loaded plugins */
  getPlugins(): PluginManifest[] {
    return Array.from(this.plugins.values());
  }

  /** All registered commands */
  getCommands(): CommandDefinition[] {
    return Array.from(this.commands.values());
  }

  /** Get commands grouped by category */
  getCommandsByCategory(): Record<string, CommandDefinition[]> {
    const grouped: Record<string, CommandDefinition[]> = {};
    for (const cmd of this.commands.values()) {
      const cat = cmd.category;
      if (!grouped[cat]) grouped[cat] = [];
      // Avoid duplicates (aliased commands)
      const firstName = Array.isArray(cmd.name) ? cmd.name[0] : cmd.name;
      if (!grouped[cat]!.some((c) => (Array.isArray(c.name) ? c.name[0] : c.name) === firstName)) {
        grouped[cat]!.push(cmd);
      }
    }
    return grouped;
  }

  /** Update plugin stats in DB */
  async recordCommandUse(pluginName: string, success: boolean): Promise<void> {
    const update = success
      ? { $inc: { "stats.totalCalls": 1 }, "stats.lastUsed": new Date() }
      : { $inc: { "stats.errors": 1 } };
    await Plugin.findOneAndUpdate({ name: pluginName }, update);
  }
}

export const pluginRegistry = new PluginRegistry();
