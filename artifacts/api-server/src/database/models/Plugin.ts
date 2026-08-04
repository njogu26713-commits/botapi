import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IPlugin extends Document {
  name: string;
  version: string;
  description: string;
  author: string;
  enabled: boolean;
  config: Record<string, unknown>;
  stats: {
    totalCalls: number;
    lastUsed: Date | null;
    errors: number;
  };
  installedAt: Date;
  updatedAt: Date;
}

const PluginSchema = new Schema<IPlugin>(
  {
    name: { type: String, required: true, unique: true },
    version: { type: String, default: "1.0.0" },
    description: { type: String, default: "" },
    author: { type: String, default: "FireboxTechs" },
    enabled: { type: Boolean, default: true },
    config: { type: Schema.Types.Mixed, default: {} },
    stats: {
      totalCalls: { type: Number, default: 0 },
      lastUsed: { type: Date, default: null },
      errors: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

export const Plugin: Model<IPlugin> = mongoose.model<IPlugin>("Plugin", PluginSchema);
