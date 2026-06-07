import admin from "firebase-admin";
import { config } from "../config";

let initialized = false;

function ensureFirebase(): boolean {
  if (initialized) return true;
  if (!config.firebaseServiceAccount) return false;

  try {
    const serviceAccount = JSON.parse(config.firebaseServiceAccount);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    initialized = true;
    return true;
  } catch (err) {
    console.warn("[FCM] Failed to initialize Firebase Admin:", (err as Error).message);
    return false;
  }
}

export async function sendPushNotification(
  token: string,
  title: string,
  body: string
): Promise<void> {
  if (!ensureFirebase()) return;

  try {
    await admin.messaging().send({
      token,
      notification: { title, body },
    });
  } catch (err) {
    console.warn("[FCM] Push delivery failed:", (err as Error).message);
  }
}
