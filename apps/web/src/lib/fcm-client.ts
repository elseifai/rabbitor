import { initializeApp, getApps } from 'firebase/app'
import { getMessaging, getToken, isSupported } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

function getFirebaseApp() {
  if (getApps().length > 0) return getApps()[0]
  return initializeApp(firebaseConfig)
}

export async function requestNotificationPermission(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) return null

  const supported = await isSupported().catch(() => false)
  if (!supported) return null

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return null

  const registration = await navigator.serviceWorker.register(
    `/firebase-messaging-sw.js?apiKey=${encodeURIComponent(firebaseConfig.apiKey ?? '')}&projectId=${encodeURIComponent(firebaseConfig.projectId ?? '')}&messagingSenderId=${encodeURIComponent(firebaseConfig.messagingSenderId ?? '')}&appId=${encodeURIComponent(firebaseConfig.appId ?? '')}`,
  )
  const messaging = getMessaging(getFirebaseApp())
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
  if (!vapidKey) return null

  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  })

  if (!token) return null

  await fetch('/api/auth/fcm-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })

  return token
}
