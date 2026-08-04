import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface ISetting extends Document {
  key: string;
  value: unknown;
  description: string;
  category: string;
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISetting>(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: Schema.Types.Mixed, required: true },
    description: { type: String, default: "" },
    category: { type: String, default: "general" },
  },
  { timestamps: true },
);

export const Settings: Model<ISetting> = mongoose.model<ISetting>(
  "Settings",
  SettingsSchema,
);

/** Upsert a setting by key */
export async function setSetting(
  key: string,
  value: unknown,
  description = "",
  category = "general",
): Promise<void> {
  await Settings.findOneAndUpdate(
    { key },
    { value, description, category },
    { upsert: true, new: true },
  );
}

/** Get a setting value with optional default */
export async function getSetting<T = unknown>(
  key: string,
  defaultValue?: T,
): Promise<T | undefined> {
  const doc = await Settings.findOne({ key }).lean();
  return doc ? (doc.value as T) : defaultValue;
}
