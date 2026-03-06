import { db } from "@/db";
import { verificationTokens } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const verificationTokenRepository = {
  findByToken(token: string) {
    return db
      .select()
      .from(verificationTokens)
      .where(eq(verificationTokens.token, token))
      .limit(1);
  },

  create(identifier: string, token: string, expires: Date) {
    return db.insert(verificationTokens).values({
      identifier,
      token,
      expires,
    });
  },

  deleteByIdentifier(identifier: string) {
    return db
      .delete(verificationTokens)
      .where(eq(verificationTokens.identifier, identifier));
  },

  deleteByIdentifierAndToken(identifier: string, token: string) {
    return db
      .delete(verificationTokens)
      .where(
        and(
          eq(verificationTokens.identifier, identifier),
          eq(verificationTokens.token, token)
        )
      );
  },
};
