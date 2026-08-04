/**
 * Command registry — loads all built-in plugins into the plugin system.
 */
import { pluginRegistry } from "../plugins/loader.js";
import { generalPlugin } from "./general.js";
import { programmingPlugin } from "./programming.js";
import { securityPlugin } from "./security.js";
import { mediaPlugin } from "./media.js";
import { fireboxPlugin } from "./firebox.js";
import { utilitiesPlugin } from "./utilities.js";
import { menusPlugin } from "./menus.js";

export const COMMAND_PREFIX = "!";

export async function registerAllPlugins(socket?: any): Promise<void> {
  const plugins = [
    generalPlugin,
    programmingPlugin,
    securityPlugin,
    mediaPlugin,
    fireboxPlugin,
    utilitiesPlugin,
    menusPlugin,
  ];

  for (const plugin of plugins) {
    await pluginRegistry.register(plugin, socket);
  }
}
