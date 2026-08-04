/**
 * Plugin system type definitions.
 * A plugin is a module that registers commands, event hooks, or scheduled tasks.
 */

export interface CommandContext {
  socket: any;
  from: string;       // sender JID
  message: any;       // raw Baileys message object
  text: string;       // full message text
  command: string;    // parsed command name (without prefix)
  args: string[];     // tokenized arguments
  rawArgs: string;    // everything after the command name
  isGroup: boolean;
  groupId?: string;
  pushName: string;
  phoneNumber: string; // plain E.164 number
  reply: (content: any) => Promise<void>;
  replyText: (text: string) => Promise<void>;
  sendTyping: () => Promise<void>;
}

export interface EventContext {
  socket: any;
  event: string;
  data: any;
}

export interface CommandDefinition {
  /** Command name(s) — lowercase, no prefix */
  name: string | string[];
  /** Short description shown in help */
  description: string;
  /** Detailed usage info */
  usage?: string;
  /** Category for grouping in help */
  category: CommandCategory;
  /** Minimum permission level */
  permission?: "all" | "premium" | "admin";
  /** Whether command is enabled by default */
  enabled?: boolean;
  /** Rate limit: max calls per minute (0 = unlimited) */
  rateLimit?: number;
  /** Handler function */
  handler: (ctx: CommandContext) => Promise<void>;
}

export type CommandCategory =
  | "general"
  | "ai"
  | "programming"
  | "security"
  | "media"
  | "utilities"
  | "firebox"
  | "admin";

export interface PluginManifest {
  /** Unique plugin identifier */
  name: string;
  version: string;
  description: string;
  author: string;
  /** Commands registered by this plugin */
  commands: CommandDefinition[];
  /** Called once when the plugin is loaded */
  onLoad?: (socket: any) => Promise<void>;
  /** Called once when the plugin is unloaded */
  onUnload?: () => Promise<void>;
}
