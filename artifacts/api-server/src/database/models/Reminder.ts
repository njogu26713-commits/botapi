import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IReminder extends Document {
  phoneNumber: string;
  message: string;
  scheduledAt: Date;
  cronExpression: string | null;
  isRecurring: boolean;
  executed: boolean;
  executedAt: Date | null;
  createdAt: Date;
}

const ReminderSchema = new Schema<IReminder>(
  {
    phoneNumber: { type: String, required: true, index: true },
    message: { type: String, required: true },
    scheduledAt: { type: Date, required: true },
    cronExpression: { type: String, default: null },
    isRecurring: { type: Boolean, default: false },
    executed: { type: Boolean, default: false },
    executedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

ReminderSchema.index({ scheduledAt: 1, executed: 1 });

export const Reminder: Model<IReminder> = mongoose.model<IReminder>(
  "Reminder",
  ReminderSchema,
);
