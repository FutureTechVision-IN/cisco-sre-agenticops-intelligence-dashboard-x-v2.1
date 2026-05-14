import bcryptjs from "bcryptjs";
import { type User } from "@shared/schema";

export interface SessionData {
  userId: string;
  username: string;
  role: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}

export function requireRole(...allowedRoles: string[]) {
  return (req: any, res: any, next: any) => {
    const session = (req as any).session?.user;
    if (!session || !allowedRoles.includes(session.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    next();
  };
}

export function requireAuth(req: any, res: any, next: any) {
  const session = (req as any).session?.user;
  if (!session) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}
