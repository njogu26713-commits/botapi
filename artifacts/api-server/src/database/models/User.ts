import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IUserStats {
  totalMessages: number;
  totalCommands: number;
  totalAiRequests: number;
  lastSeen: Date;
}

export interface IUserPreferences {
  language: string;
  aiModel: string;
  notifications: boolean;
  richMessages: boolean;
}

export interface IUser extends Document {
  phoneNumber: string;
  name: string;
  pushName: string;
  isAdmin: boolean;
  isBlocked: boolean;
  isPremium: boolean;
  isVerified: boolean;
  stats: IUserStats;
  preferences: IUserPreferences;
  conversationId: mongoose.Types.ObjectId | null;
  warningCount: number;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserStatsSchema = new Schema<IUserStats>(
  {
    totalMessages: { type: Number, default: 0 },
    totalCommands: { type: Number, default: 0 },
    totalAiRequests: { type: Number, default: 0 },
    lastSeen: { type: Date, default: Date.now },
  },
  { _id: false },
);

const UserPreferencesSchema = new Schema<IUserPreferences>(
  {
    language: { type: String, default: "en" },
    aiModel: { type: String, default: "gpt-4o" },
    notifications: { type: Boolean, default: true },
    richMessages: { type: Boolean, default: true },
  },
  { _id: false },
);

const UserSchema = new Schema<IUser>(
  {
    phoneNumber: { type: String, required: true, unique: true, index: true },
    name: { type: String, default: "" },
    pushName: { type: String, default: "" },
    isAdmin: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
    isPremium: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    stats: { type: UserStatsSchema, default: () => ({}) },
    preferences: { type: UserPreferencesSchema, default: () => ({}) },
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      default: null,
    },
    warningCount: { type: Number, default: 0 },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

export const User: Model<IUser> = mongoose.model<IUser>("User", UserSchema);
