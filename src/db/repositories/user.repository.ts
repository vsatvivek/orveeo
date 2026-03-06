import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { NewUser } from "@/db/schema";

export const userRepository = {
  findByEmail(email: string) {
    return db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });
  },

  findById(id: string) {
    return db.query.users.findFirst({
      where: eq(users.id, id),
    });
  },

  create(data: NewUser) {
    return db.insert(users).values(data).returning();
  },

  markEmailVerified(email: string) {
    return db
      .update(users)
      .set({ emailVerified: new Date(), updatedAt: new Date() })
      .where(eq(users.email, email));
  },

  deleteById(id: string) {
    return db.delete(users).where(eq(users.id, id));
  },
};
