import mongoose, { Schema, type Document, type Model } from "mongoose";
import bcrypt from "bcryptjs";

export interface IAdminUser extends Document {
  username: string;
  passwordHash: string;
  role: "super_admin" | "admin" | "moderator";
  isActive: boolean;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
}

const AdminUserSchema = new Schema<IAdminUser>(
  {
    username: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["super_admin", "admin", "moderator"],
      default: "admin",
    },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date, default: null },
  },
  { timestamps: true },
);

AdminUserSchema.methods["comparePassword"] = async function (
  password: string,
): Promise<boolean> {
  return bcrypt.compare(password, this.passwordHash as string);
};

export const AdminUser: Model<IAdminUser> = mongoose.model<IAdminUser>(
  "AdminUser",
  AdminUserSchema,
);

/** Bootstrap: ensure the default admin exists on first run */
export async function ensureDefaultAdmin(
  username: string,
  password: string,
): Promise<void> {
  const exists = await AdminUser.findOne({ username });
  if (!exists) {
    const passwordHash = await bcrypt.hash(password, 12);
    await AdminUser.create({ username, passwordHash, role: "super_admin" });
  }
}
