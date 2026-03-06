import { db } from "@/db";
import { passwordResetTokens } from "@/db/schema";
import { eq } from "drizzle-orm";

export const passwordResetTokenRepository = {
  findByToken(token: string) {
    return db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token))
      .limit(1);
  },

  create(userId: string, token: string, expiresAt: Date) {
    return db.insert(passwordResetTokens).values({
      userId,
      token,
      expiresAt,
    });
  },

  deleteById(id: string) {
    return db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.id, id));
  },
};
