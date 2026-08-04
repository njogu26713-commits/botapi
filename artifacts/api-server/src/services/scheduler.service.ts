/**
 * Scheduler service for reminders and recurring tasks using node-cron.
 */
import cron from "node-cron";
import { logger } from "../lib/logger.js";
import { Reminder } from "../database/models/Reminder.js";

type SendFn = (phoneNumber: string, text: string) => Promise<void>;

let sendMessage: SendFn | null = null;
const activeTasks = new Map<string, cron.ScheduledTask>();

/** Initialize scheduler with the WhatsApp send function */
export function initScheduler(sendFn: SendFn): void {
  sendMessage = sendFn;

  // Check pending reminders every minute
  cron.schedule("* * * * *", async () => {
    await processPendingReminders();
  });

  // Daily cleanup of old executed reminders (2am UTC)
  cron.schedule("0 2 * * *", async () => {
    try {
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      await Reminder.deleteMany({ executed: true, executedAt: { $lt: cutoff } });
    } catch (err) {
      logger.error({ err }, "Scheduler cleanup error");
    }
  });

  logger.info("Scheduler initialized");
}

/** Process all pending reminders that are due */
async function processPendingReminders(): Promise<void> {
  if (!sendMessage) return;

  try {
    const now = new Date();
    const pending = await Reminder.find({
      executed: false,
      scheduledAt: { $lte: now },
      cronExpression: null,
    });

    for (const reminder of pending) {
      try {
        await sendMessage(
          reminder.phoneNumber,
          `⏰ *Reminder!*\n\n${reminder.message}`,
        );
        reminder.executed = true;
        reminder.executedAt = new Date();
        await reminder.save();
      } catch (err) {
        logger.error({ err, reminderId: reminder.id }, "Failed to send reminder");
      }
    }
  } catch (err) {
    logger.error({ err }, "processPendingReminders error");
  }
}

/** Schedule a one-time reminder */
export async function scheduleReminder(
  phoneNumber: string,
  message: string,
  scheduledAt: Date,
): Promise<string> {
  const reminder = await Reminder.create({
    phoneNumber,
    message,
    scheduledAt,
    isRecurring: false,
  });
  return (reminder._id as unknown as string).toString();
}

/** Schedule a recurring cron-based reminder */
export function scheduleRecurring(
  id: string,
  phoneNumber: string,
  message: string,
  cronExpression: string,
): void {
  if (!cron.validate(cronExpression)) {
    throw new Error(`Invalid cron expression: ${cronExpression}`);
  }

  const task = cron.schedule(cronExpression, async () => {
    if (!sendMessage) return;
    try {
      await sendMessage(phoneNumber, `🔔 *Recurring reminder:*\n\n${message}`);
    } catch (err) {
      logger.error({ err }, "Recurring reminder send failed");
    }
  });

  activeTasks.set(id, task);
  logger.info({ id, phoneNumber, cronExpression }, "Recurring task scheduled");
}

/** Cancel a scheduled task */
export async function cancelReminder(reminderId: string): Promise<boolean> {
  const task = activeTasks.get(reminderId);
  if (task) {
    task.stop();
    activeTasks.delete(reminderId);
  }
  const result = await Reminder.findByIdAndUpdate(reminderId, { executed: true });
  return !!result;
}

/** List upcoming reminders for a user */
export async function getUserReminders(phoneNumber: string) {
  return Reminder.find({
    phoneNumber,
    executed: false,
    scheduledAt: { $gt: new Date() },
  }).sort({ scheduledAt: 1 }).limit(10);
}

/** Validate and parse natural language time (simple patterns) */
export function parseReminderTime(input: string): Date | null {
  const now = new Date();
  const lower = input.toLowerCase();

  // "in X minutes/hours/days"
  const inMatch = lower.match(/in\s+(\d+)\s+(minute|hour|day|week)s?/);
  if (inMatch) {
    const amount = parseInt(inMatch[1]!, 10);
    const unit = inMatch[2]!;
    const ms = { minute: 60000, hour: 3600000, day: 86400000, week: 604800000 }[unit] ?? 0;
    return new Date(now.getTime() + amount * ms);
  }

  // "tomorrow at HH:mm"
  if (lower.includes("tomorrow")) {
    const timeMatch = lower.match(/(\d{1,2}):(\d{2})/);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (timeMatch) {
      tomorrow.setHours(parseInt(timeMatch[1]!, 10), parseInt(timeMatch[2]!, 10), 0, 0);
    } else {
      tomorrow.setHours(9, 0, 0, 0);
    }
    return tomorrow;
  }

  // ISO date string fallback
  const parsed = new Date(input);
  if (!isNaN(parsed.getTime()) && parsed > now) return parsed;

  return null;
}
