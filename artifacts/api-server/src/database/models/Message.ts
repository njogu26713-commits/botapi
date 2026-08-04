import mongoose, { Schema, type Document, type Model } from "mongoose";

export type MessageType =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "voice"
  | "document"
  | "sticker"
  | "location"
  | "contact"
  | "interactive"
  | "unknown";

export interface IMessage extends Document {
  from: string;
  to: string;
  messageId: string;
  type: MessageType;
  content: string;
  caption?: string;
  mimeType?: string;
  filePath?: string;
  metadata: Record<string, unknown>;
  isFromMe: boolean;
  isGroup: boolean;
  groupId?: string;
  quotedMessageId?: string;
  status: "received" | "processed" | "failed";
  processingTime?: number;
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    from: { type: String, required: true, index: true },
    to: { type: String, required: true },
    messageId: { type: String, required: true, unique: true },
    type: {
      type: String,
      enum: ["text", "image", "video", "audio", "voice", "document", "sticker", "location", "contact", "interactive", "unknown"],
      default: "text",
    },
    content: { type: String, default: "" },
    caption: { type: String },
    mimeType: { type: String },
    filePath: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
    isFromMe: { type: Boolean, default: false },
    isGroup: { type: Boolean, default: false },
    groupId: { type: String },
    quotedMessageId: { type: String },
    status: {
      type: String,
      enum: ["received", "processed", "failed"],
      default: "received",
    },
    processingTime: { type: Number },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

MessageSchema.index({ from: 1, createdAt: -1 });
MessageSchema.index({ createdAt: -1 });

export const Message: Model<IMessage> = mongoose.model<IMessage>("Message", MessageSchema);
