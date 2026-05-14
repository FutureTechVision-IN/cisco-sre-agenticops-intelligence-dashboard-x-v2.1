import bcrypt from "bcryptjs";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

const SEED_USERS = [
  { username: "sre-admin", role: "admin", email: "admin@cisco.com" },
  { username: "sre-user", role: "user", email: "user@cisco.com" },
  { username: "sre-manager", role: "user", email: "manager@cisco.com" },
  { username: "sre-director", role: "user", email: "director@cisco.com" },
  { username: "sre-vp", role: "user", email: "vp@cisco.com" },
];

export async function seedUsers(): Promise<void> {
  try {
    const hashedPassword = await bcrypt.hash("password$$", 10);

    for (const seedUser of SEED_USERS) {
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.username, seedUser.username));

      if (!existingUser.length) {
        await db.insert(users).values({
          username: seedUser.username,
          password: hashedPassword,
          role: seedUser.role,
          email: seedUser.email,
          mustChangePassword: 1,
        });

        console.log(`✓ Created user: ${seedUser.username} (${seedUser.role})`);
      }
    }
  } catch (error) {
    console.error("Error seeding users:", error);
  }
}
