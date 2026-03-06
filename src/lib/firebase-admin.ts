import admin from "firebase-admin";

let adminApp: admin.app.App | null = null;

export function getFirebaseAdmin(): admin.app.App | null {
  if (typeof window !== "undefined") return null;

  if (adminApp) return adminApp;

  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!clientEmail || !projectId || !privateKey) {
    console.warn("Firebase Admin not configured. Set FIREBASE_ADMIN_* env vars.");
    return null;
  }

  const existing = admin.apps[0];
  if (existing) {
    adminApp = existing as admin.app.App;
    return adminApp;
  }

  adminApp = admin.initializeApp({
    credential: admin.credential.cert({
      clientEmail,
      projectId,
      privateKey,
    }),
  });

  return adminApp;
}
