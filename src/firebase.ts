import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth'

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY

// Wenn keine Env-Vars vorhanden (z.B. GitHub Pages ohne Secrets), Firebase nicht initialisieren
export const firebaseReady = !!apiKey

let firestore: ReturnType<typeof getFirestore> | null = null
let auth: ReturnType<typeof getAuth> | null = null

if (firebaseReady) {
  const app = initializeApp({
    apiKey,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  })
  firestore = getFirestore(app)
  auth = getAuth(app)
}

export { firestore, auth }

export function ensureSignedIn(): Promise<string> {
  if (!auth) return Promise.resolve('offline')
  return new Promise((resolve) => {
    onAuthStateChanged(auth!, async (user) => {
      if (user) {
        resolve(user.uid)
      } else {
        const cred = await signInAnonymously(auth!)
        resolve(cred.user.uid)
      }
    })
  })
}
