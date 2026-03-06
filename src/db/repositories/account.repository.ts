import { db } from "@/db";
import { accounts } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const accountRepository = {
  findByFirebaseUid(firebaseUid: string) {
    return db
      .select()
      .from(accounts)
      .where(
        and(
          eq(accounts.provider, "firebase"),
          eq(accounts.providerAccountId, firebaseUid)
        )
      )
      .limit(1);
  },

  findByUserIdAndProvider(userId: string, provider: string) {
    return db
      .select()
      .from(accounts)
      .where(
        and(eq(accounts.userId, userId), eq(accounts.provider, provider))
      )
      .limit(1);
  },

  findByUserIdProviderAndType(userId: string, provider: string, type: string) {
    return db
      .select()
      .from(accounts)
      .where(
        and(
          eq(accounts.userId, userId),
          eq(accounts.provider, provider),
          eq(accounts.type, type)
        )
      )
      .limit(1);
  },

  create(data: {
    userId: string;
    type: string;
    provider: string;
    providerAccountId: string;
  }) {
    return db.insert(accounts).values(data);
  },
};
